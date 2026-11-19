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

### 容器 + PostgreSQL（可选，引入 PG 时）

```bash
# .env 增加：DB_DRIVER=postgres
#           DATABASE_URL=postgres://app:***@postgres:5432/yyc3
#           PG_PASSWORD=***（必填）
docker compose --profile pg up -d --build
```

PG 服务不对外暴露端口（仅容器网络内可达）；数据落 `./pgdata`。迁移与回退见 [03 · 数据模型](./03-data-model.md#迁移sqlite--pg)。
备份：`docker compose exec postgres pg_dump -U app -d yyc3 --format=custom > backup.dump`。

> 目标环境选型（本机 / 单机服务器 / 托管平台）与完整配置清单见 **[12 · 部署承载分析](./12-hosting-profile.md)**。


**部署拓扑约束**：当前实现仍为**单进程语义**，多实例/Serverless 水平扩缩前需逐项确认——
1. **限流**（`lib/rate-limit.ts`）：默认进程内固定窗口；配置 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` 后自动切换到 Upstash（多副本共享配额，存储异常时回退进程内并告警）。**多实例前必须成对配置**。
2. **SQLite 单写者**：多副本需共享挂载 `data/` 或改用 PostgreSQL（接口已抽象，切换演练见 §迁移）。
3. **AgenticCore 服务端单例**（`lib/agentic/server.ts`）：状态仅进程内，多副本各自独立（无正确性问题，仅状态不共享）。

**运行环境**：`next start` 为 production 模式——必须配置 `JWT_SECRET`（缺失即拒绝签发令牌），且**不会**种入演示账号（开发专属）。

## 环境变量清单

| 变量 | 必填 | 默认 | 说明 |
| ---- | ---- | ---- | ---- |
| `JWT_SECRET` | ✅（生产） | —（开发用 `data/.jwt-dev-secret` 随机密钥） | 缺失时生产进程拒绝签发令牌 |
| `METRICS_TOKEN` | ✅（生产） | — | 指标端点应用层令牌；未配置时 `/api/metrics` 直接 503，配置后匿名 401、`Authorization: Bearer <token>` 或 `x-metrics-token` 通过 |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | 多实例必备 | — | 限流存储切换 Upstash（**必须成对**；只填 URL 会回退进程内）；异常时回退内存并打印告警 |
| `BIGMODEL_API_KEY` | 视功能 | — | 作业批改 / 语音转写 / **语音合成（TTS）**；缺失或为占位符时 TTS 返回 503 |
| `OPENAI_API_KEY` | 视功能 | — | 对话 / 编排 / 评估报告 / 故事续写（缺失则对话降级为示例） |
| `OPENAI_BASE_URL` | | — | 可选，OpenAI 兼容网关地址 |
| `OPENAI_MODEL` | | gpt-4o-mini | 可选，直连通道模型型号 |
| `AI_API_KEY` + `AI_BASE_URL` | | — | 可选，第二优先级通用网关通道（**必须成对**；单独配密钥不生效） |
| `AI_MODEL` | | gpt-4o-mini | 可选，网关通道模型型号 |
| `FAL_KEY` | | — | 生图（缺失则返回占位图） |
| `PORT` | | 1228（脚本内置） | 监听端口 |
| `DATABASE_URL` | | `<cwd>/data/yyc3.db` | **SQLite 文件路径**（非 PG 连接串） |
| `NEXT_PUBLIC_APP_URL` | | http://localhost:1228 | 站点地址 |
| `NEXT_PUBLIC_API_URL` | | 空（同源） | 仅拆分独立后端时设置 |
| `CSRF_TRUSTED_ORIGINS` / `CSRF_REQUIRE_ORIGIN` | | 空 / false | 反向代理或多端 WebView 场景 |

> 完整样板以仓库根 `.env.example` 为准（每个读取点都必须在此登记）。

## 脚本（scripts/）

**现行可用**：`osv-audit.mjs`（依赖审计）、`generate-metrics-token.mjs`（指标令牌生成）、`generate-docs.py`（文档生成）、`ts-node-hooks.mjs`（node 直测钩子）。

| 脚本 | 状态 | 说明 |
| ---- | ---- | ---- |
| `deploy-docker.sh`、`deploy-to-production.sh`、`deploy-to-yyc3-33.sh`、`deploy-microservices.sh`、`deploy-local-ai.sh`、`deploy-knowledge-graph.sh`、`deploy-data-analytics.sh` | ⚠️ **历史遗留（不可直接执行）** | 依赖 `docker-compose.yml`、`services/xiaoyu-api/`、`microservices/` 等**仓库中不存在**的资产；当前架构为单进程 `next start`。保留仅为历史追溯，见 `scripts/README.md` |
| `database-schema.sql` | 参考 | 表结构 SQL 独立副本（以 `lib/db/sqlite-client.ts` 为准） |
| `auto-fix-errors.ts`、`fix-integration-conflicts.ts` | 历史维护工具 | 一次性脚本，不建议复用 |

> 上述 `deploy-*.sh` 均为历史遗留（依赖仓库中不存在的 `services/xiaoyu-api/`、`microservices/` 等资产），
> 现行部署路径只有两条：本机 `bun run build && bun run start`，或容器 `docker compose up -d --build`。

## 指标令牌生成（`METRICS_TOKEN`，按环境独立）

不要手写、不要跨环境复用，用 `scripts/generate-metrics-token.mjs` 生成（48 位十六进制、文件 0600、幂等）：

```bash
bun run gen:metrics-token                          # 默认 production → .env.production
bun run gen:metrics-token -- staging production    # 预发与生产各生成一份
bun run gen:metrics-token -- production --file .env # docker compose 读取的 .env
bun run gen:metrics-token -- production --force     # 轮换（抓取端需同步更新）
bun run gen:metrics-token -- production --print     # 额外输出明文与 Authorization 片段
```

| 行为 | 说明 |
| ---- | ---- |
| 已存在令牌 | 默认跳过并打印掩码 + `sha256` 指纹，避免误轮换导致抓取中断 |
| 轮换 | 仅 `--force`；输出提示需同步更新 Prometheus `authorization.credentials` |
| 文件写入 | 新文件 `0600`，已有文件写回后同样收紧为 `0600`；保留同文件内其他变量 |
| 明文暴露 | 默认不打印明文；`--print` 才输出（用于一次性配置抓取端） |

## 备份与恢复

```bash
# 在线安全备份（VACUUM INTO，不锁写）
# 代码内：getDatabase().backup("./backups/snapshot-$(date +%F).db")

# 恢复：停服后用备份文件替换 data/yyc3.db
```

## 监控接入（Prometheus + 告警）

仓库内已提供可直接使用的配置：[`deploy/monitoring/prometheus.yml`](../../deploy/monitoring/prometheus.yml)（抓取）与 [`deploy/monitoring/alerts.yml`](../../deploy/monitoring/alerts.yml)（三条告警）。

```bash
# 1) 生成令牌（默认输出掩码，--print 才显示明文）
bun run gen:metrics-token -- production --print

# 2) 令牌文件只给 Prometheus 读（0600）
printf '%s' '<METRICS_TOKEN>' > deploy/monitoring/metrics_token
chmod 600 deploy/monitoring/metrics_token

# 3) 启动（配置目录只读挂载）
docker run -d --name yyc3-prometheus -p 9090:9090 \
  -v "$PWD/deploy/monitoring:/etc/prometheus:ro" prom/prometheus
```

| 告警 | 表达式 | 阈值 | 处置 |
| ---- | ------ | ---- | ---- |
| `Yyc3AiErrorRatioHigh` | AI 路由 5m 错误率 | > 2%，持续 5m | 先看 `/api/metrics` 的 `outcome` 分布：`error`=上游故障，`no-provider`=密钥缺失 |
| `Yyc3TtsServiceUnavailable` | TTS 503 计数（10m 增量） | > 0，持续 1m | 503 表示未配置或 `BIGMODEL_API_KEY` 失效（占位符/过期）；502 才排查上游 |
| `Yyc3EventLoopLagHigh` | `nodejs_eventloop_lag_p99_seconds` | > 100ms，持续 10m | 排查慢查询、同步 IO 或长任务阻塞 |

> **接线验证（2026-11-20 实测）**：本机无 promtool/docker 时按降级方案验证——
> ① 两份 YAML 结构校验（规则/抓取/挂载字段）通过；② 以生产模式启动应用并真实触发
> TTS 503 与 AI `no-provider` 请求后，三条告警引用的全部指标序列
> （`yyc3_ai_route_requests_total{outcome=…}`、`yyc3_business_requests_total{status="503"}`、
> `nodejs_eventloop_lag_p99_seconds`）在 `/api/metrics` 输出中可见，13 项断言全过。
> 接入真实 Prometheus 实例后仅需替换目标地址与令牌文件。

> 抓取目标地址按部署环境调整：容器内访问宿主机用 `host.docker.internal:1228`，同机裸装改 `127.0.0.1:1228`。

## 健康检查清单（上线前）

- [ ] `bun run build && bun run start` 本地通过
- [ ] `curl -o /dev/null -w "%{http_code}" localhost:1228/` 返回 200（匿名可访问）
- [ ] `curl -fsS localhost:1228/api/health` 返回 `status: ok` 且 HTTP 200
- [ ] `curl -o /dev/null -w "%{http_code}" localhost:1228/api/metrics` 匿名返回 **401**（应用层令牌门禁），
      `curl -H "Authorization: Bearer $METRICS_TOKEN" localhost:1228/api/metrics` 返回 200 且含 `process_cpu_user_seconds_total`
- [ ] `curl localhost:1228/api/children` 返回 **401**（数据端点必须登录，200 即为越权缺陷）
- [ ] `curl -X POST localhost:1228/api/ai/prediction -d '{}'` 返回 **401**（AI 端点鉴权门禁）
- [ ] `curl -X POST localhost:1228/api/ai/text-to-speech -d '{"text":"hi"}'` 返回 **401**；
      带 Cookie 且未配 BigModel 密钥时返回 **503**（而非 502——503=未配置，502=上游故障）
- [ ] `/en` 与根路由均 200（混合路由回归点）
- [ ] 响应头含 `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy`；
      生产模式另含 CSP（`frame-ancestors` 生效）
- [ ] `.env.local` 密钥为服务端变量且已轮换过（占位符 `your_...` 会被识别为未配置）
- [ ] `data/`、`.env*` 均在 .gitignore
- [ ] `bun run audit:osv` 0 Critical（High/Medium 有书面处置）
- [ ] **`METRICS_TOKEN` 已配置**：`/api/metrics` 自带应用层令牌校验（未配置时生产直接 503），
      反向代理层的来源限制（如 Nginx `allow 10.0.0.0/8; deny all;`）作为第二道防线

> CI 已内置「生产冒烟（八项路由）」job：路由可达性、健康探针、指标令牌门禁（匿名 401 / 带令牌 200）、
> AI 鉴权门禁在每次 push 后被自动验证。

## 运行时约束

- 服务进程必须 **Node ≥ 22.13**（node:sqlite）；Bun 只跑 install/test
- Node 22 的 node:sqlite 打实验警告属预期，可 `NODE_OPTIONS=--no-warnings` 消音
- PWA 资产（manifest.json / sw.js / yyc3-pwa-icon.png）已在 `public/`，manifest 已挂接根 layout
