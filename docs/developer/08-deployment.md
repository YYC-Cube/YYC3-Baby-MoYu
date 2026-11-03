# 08 · 部署

## 本地生产（默认形态）

```bash
bun run build          # Turbopack 构建 + 全类型检查
bun run start          # Node 进程监听 :1228
```

数据落盘 `data/yyc3.db`（进程外文件，重启不丢）。

## 容器化（2026-11-02 起提供）

仓库根新增 `Dockerfile`（多阶段）与 `docker-compose.yml`（单实例）。镜像内构建**必须用 Node 作为运行主体**：
Next 16 的编译产物在 Bun 运行时下会报 `Expected CommonJS module to have a function wrapper`，
因此构建阶段为 `node:22.13` + 复用 Bun 装依赖，运行时为 `node:22.13-bookworm-slim`（`node:sqlite` 所需）。

```bash
cp .env.example .env.local        # 填 JWT_SECRET（生产必填）与 AI 密钥（可留空）
docker compose up -d --build      # 首次构建约 3–5 分钟
docker compose ps                 # STATUS 应为 healthy
curl -fsS localhost:1228/api/health
```

| 约束 | 说明 |
| ---- | ---- |
| 数据持久化 | `./data:/app/data`、`./logs:/app/logs` 两个 volume；容器重建不丢数据 |
| 健康检查 | 容器 healthcheck 调用 `/api/health`（含数据库只读探针），失败即 unhealthy |
| 单实例 | 与「部署拓扑约束」一致：**不要**直接 `--scale` 扩副本（限流与 SQLite 均为单实例语义） |
| 密钥 | 仅经环境变量注入，`.env*` 已 gitignore；`.dockerignore` 亦排除 `.env*` |
| 镜像瘦身 | 已启用 `output: "standalone"`（`next.config.mjs`）：镜像 **604 MB**（未启用时 2.37 GB）；`next start` 与 e2e 流程不受影响 |
| 验证基线 | 本机实测：`docker build` 通过 → 容器 `healthy` → `/api/health` 200 → 注册/登录/建娃/评估落库 201 → **容器重启后数据仍在** |

**部署拓扑约束（单实例锁定）**：当前三种实现均为**单进程语义**，多实例/Serverless 水平扩缩前不可直接复制副本——
1. **限流**（`lib/rate-limit.ts`）：进程内内存桶，多副本时每副本独立计数，实际配额 = 副本数 × 配置值。多实例前接 Upstash Redis 替换存储后端（接口不变，仅换实现）。
2. **SQLite 单写者**：多副本需共享挂载 `data/` 或改用 PostgreSQL（接口已抽象）。
3. **AgenticCore 服务端单例**（`lib/agentic/server.ts`）：状态仅进程内，多副本各自独立（无正确性问题，仅状态不共享）。

**运行环境**：`next start` 为 production 模式——必须配置 `JWT_SECRET`（缺失即拒绝签发令牌），且**不会**种入演示账号（开发专属）。

## 环境变量清单

| 变量 | 必填 | 默认 | 说明 |
| ---- | ---- | ---- | ---- |
| `JWT_SECRET` | ✅（生产） | —（开发用 `data/.jwt-dev-secret` 随机密钥） | 缺失时生产进程拒绝签发令牌 |
| `BIGMODEL_API_KEY` | 视功能 | — | 作业批改 / 语音转写 |
| `OPENAI_API_KEY` | 视功能 | — | 对话 / 编排 / 评估报告 / 故事续写（缺失则对话降级为示例） |
| `OPENAI_BASE_URL` | | — | 可选，OpenAI 兼容网关地址 |
| `FAL_KEY` | | — | 生图（缺失则返回占位图） |
| `PORT` | | 1228（脚本内置） | 监听端口 |
| `DATABASE_URL` | | `<cwd>/data/yyc3.db` | **SQLite 文件路径**（非 PG 连接串） |
| `NEXT_PUBLIC_APP_URL` | | http://localhost:1228 | 站点地址 |
| `NEXT_PUBLIC_API_URL` | | 空（同源） | 仅拆分独立后端时设置 |
| `CSRF_TRUSTED_ORIGINS` / `CSRF_REQUIRE_ORIGIN` | | 空 / false | 反向代理或多端 WebView 场景 |

> 完整样板以仓库根 `.env.example` 为准（每个读取点都必须在此登记）。

## 脚本（scripts/）

**现行可用**：`osv-audit.mjs`（依赖审计）、`generate-docs.py`（文档生成）、`ts-node-hooks.mjs`（node 直测钩子）。

| 脚本 | 状态 | 说明 |
| ---- | ---- | ---- |
| `deploy-docker.sh`、`deploy-to-production.sh`、`deploy-to-yyc3-33.sh`、`deploy-microservices.sh`、`deploy-local-ai.sh`、`deploy-knowledge-graph.sh`、`deploy-data-analytics.sh` | ⚠️ **历史遗留（不可直接执行）** | 依赖 `docker-compose.yml`、`services/xiaoyu-api/`、`microservices/` 等**仓库中不存在**的资产；当前架构为单进程 `next start`。保留仅为历史追溯，见 `scripts/README.md` |
| `database-schema.sql` | 参考 | 表结构 SQL 独立副本（以 `lib/db/sqlite-client.ts` 为准） |
| `auto-fix-errors.ts`、`fix-integration-conflicts.ts` | 历史维护工具 | 一次性脚本，不建议复用 |

> 容器化尚未落地（仓库无 `Dockerfile` / `docker-compose.yml`）。若需容器化，基础镜像必须 Node ≥ 22.13，并按 `08` 的「单实例锁定」约束评估。

## 备份与恢复

```bash
# 在线安全备份（VACUUM INTO，不锁写）
# 代码内：getDatabase().backup("./backups/snapshot-$(date +%F).db")

# 恢复：停服后用备份文件替换 data/yyc3.db
```

## 健康检查清单（上线前）

- [ ] `bun run build && bun run start` 本地通过
- [ ] `curl -o /dev/null -w "%{http_code}" localhost:1228/` 返回 200（匿名可访问）
- [ ] `curl -fsS localhost:1228/api/health` 返回 `status: ok` 且 HTTP 200
- [ ] `curl localhost:1228/api/children` 返回 **401**（数据端点必须登录，200 即为越权缺陷）
- [ ] `/en` 与根路由均 200（混合路由回归点）
- [ ] `.env.local` 密钥为服务端变量且已轮换过
- [ ] `data/`、`.env*` 均在 .gitignore
- [ ] `bun run audit:osv` 0 Critical（High/Medium 有书面处置）

## 运行时约束

- 服务进程必须 **Node ≥ 22.13**（node:sqlite）；Bun 只跑 install/test
- Node 22 的 node:sqlite 打实验警告属预期，可 `NODE_OPTIONS=--no-warnings` 消音
- PWA 资产（manifest.json / sw.js / yyc3-pwa-icon.png）已在 `public/`，manifest 已挂接根 layout
