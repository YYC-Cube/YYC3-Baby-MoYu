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

## 监控接入：Prometheus 实例部署（Runbook）

仓库内已提供可直接使用的配置：[`deploy/monitoring/prometheus.yml`](../../deploy/monitoring/prometheus.yml)（抓取）与 [`deploy/monitoring/alerts.yml`](../../deploy/monitoring/alerts.yml)（三条告警）。
以下步骤按「前置 → 令牌 → 部署 → 校验 → 验证 → 排障」执行，命令可直接复制。

### 步骤 0 · 前置检查

```bash
# ① 应用已以生产模式运行，且配置了 METRICS_TOKEN
curl -s -o /dev/null -w 'anonymous=%{http_code}\n' http://localhost:1228/api/metrics        # 期望 401
curl -s -o /dev/null -w 'authorized=%{http_code}\n' \
  -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:1228/api/metrics               # 期望 200
# ② 若抓取端是容器，确认能解析宿主机
docker run --rm alpine getent hosts host.docker.internal || echo "需加 --add-host（见步骤 3-B 备注）"
```

> 期望 401 而非 503：503 表示应用侧根本没配 `METRICS_TOKEN`，先把应用配好再部署抓取端。

### 步骤 1 · 生成并落盘抓取令牌

```bash
cd /path/to/YYC3-Baby-MoYu
bun run gen:metrics-token -- production --print   # 打印明文（仅本次），同时写入 .env.production
# 落盘为 Prometheus 专用凭据文件（该路径已被 .gitignore，禁止提交）
umask 077
printf '%s' '<粘贴上一步的明文令牌>' > deploy/monitoring/metrics_token
chmod 600 deploy/monitoring/metrics_token
ls -l deploy/monitoring/metrics_token            # 期望 -rw------- 
```

### 步骤 2 · 校验配置（部署前必做）

```bash
# 用官方镜像自带的 promtool 校验，不依赖本机安装
docker run --rm -v "$PWD/deploy/monitoring:/etc/prometheus:ro" \
  --entrypoint promtool prom/prometheus:v3.1.0 \
  check config /etc/prometheus/prometheus.yml
docker run --rm -v "$PWD/deploy/monitoring:/etc/prometheus:ro" \
  --entrypoint promtool prom/prometheus:v3.1.0 \
  check rules /etc/prometheus/alerts.yml
```

两条命令都应输出 `SUCCESS`。规则文件语法错误、缩进错误会在此步被拦下，不必等到进程起不来。

### 步骤 3 · 部署（三选一）

**A. 单容器（推荐，配置目录整挂）**

```bash
# --user 让容器以宿主机用户身份读 0600 令牌（容器默认 uid 65534 读不到）
# -p 仅监听 127.0.0.1，避免把指标与告警页暴露到公网
docker run -d --name yyc3-prometheus \
  --restart unless-stopped \
  --user "$(id -u):$(id -g)" \
  -p 127.0.0.1:9090:9090 \
  -v "$PWD/deploy/monitoring:/etc/prometheus:ro" \
  -v yyc3-prometheus-data:/prometheus \
  prom/prometheus:v3.1.0 \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --storage.tsdb.retention.time=15d
```

**B. 并入 docker-compose.yml**

```yaml
  prometheus:
    image: prom/prometheus:v3.1.0
    restart: unless-stopped
    user: "1000:1000"              # 宿主机 `id -u`:`id -g`（macOS 常见 501:20）；读 0600 令牌所需
    ports:
      - "127.0.0.1:9090:9090"
    volumes:
      - ./deploy/monitoring:/etc/prometheus:ro
      - prometheus-data:/prometheus
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.path=/prometheus
      - --storage.tsdb.retention.time=15d

volumes:
  prometheus-data:
```

> **Linux 宿主机**：`host.docker.internal` 默认不存在，需为服务加
> `extra_hosts: ["host.docker.internal:host-gateway"]`，或把 `prometheus.yml` 的 target 改为
> `172.17.0.1:1228`（docker0 网关）。macOS / Windows 的 Docker Desktop 自带该解析。

**C. 裸机 systemd（无 Docker）**

```bash
# 1) 安装
curl -fL -o /tmp/prom.tgz https://github.com/prometheus/prometheus/releases/download/v3.1.0/prometheus-3.1.0.linux-amd64.tar.gz
tar -xzf /tmp/prom.tgz -C /tmp && sudo mv /tmp/prometheus-3.1.0.linux-amd64 /opt/prometheus
sudo useradd --no-create-home --shell /usr/sbin/nologin prometheus

# 2) 配置（target 改为本机地址）
sudo mkdir -p /etc/prometheus /var/lib/prometheus
sudo cp deploy/monitoring/prometheus.yml deploy/monitoring/alerts.yml /etc/prometheus/
sudo sed -i 's#host.docker.internal:1228#127.0.0.1:1228#' /etc/prometheus/prometheus.yml
sudo install -m 600 -o prometheus -g prometheus \
  deploy/monitoring/metrics_token /etc/prometheus/metrics_token

# 3) systemd
sudo tee /etc/systemd/system/prometheus.service >/dev/null <<'UNIT'
[Unit]
Description=Prometheus (YYC3 Baby-MoYu)
After=network-online.target

[Service]
User=prometheus
Group=prometheus
ExecStart=/opt/prometheus/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus \
  --storage.tsdb.retention.time=15d \
  --web.listen-address=127.0.0.1:9090
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload && sudo systemctl enable --now prometheus
```

### 步骤 4 · 校验抓取与规则装载

```bash
# 进程健康
curl -s http://127.0.0.1:9090/-/healthy                      # 期望 200
# 目标是否 UP（核心断言：health 应为 "up"）
curl -s 'http://127.0.0.1:9090/api/v1/targets?state=active' | grep -o '"health":"[a-z]*"' | head -2
# 更直接的 PromQL 断言（应返回 1）
curl -s 'http://127.0.0.1:9090/api/v1/query?query=up%7Bjob%3D%22yyc3-baby-moyu%22%7D'
# 规则是否装载（应能看到 3 条告警名）
curl -s http://127.0.0.1:9090/api/v1/rules | grep -o 'Yyc3[A-Za-z]*' | sort -u
```

### 步骤 5 · 端到端验证（含负向）

```bash
# 正向：业务指标已可见
curl -s 'http://127.0.0.1:9090/api/v1/query?query=yyc3_ai_route_requests_total' | head -c 200
# 负向：临时改错令牌 → 抓取应失败，且 up 变 0（验证门禁真实生效，而不是"看起来绿"）
printf 'wrong-token' > deploy/monitoring/metrics_token
sleep 30; curl -s 'http://127.0.0.1:9090/api/v1/query?query=up%7Bjob%3D%22yyc3-baby-moyu%22%7D'
# 恢复正确令牌
printf '%s' "$METRICS_TOKEN" > deploy/monitoring/metrics_token && chmod 600 deploy/monitoring/metrics_token
```

| 告警 | 表达式 | 阈值 | 处置 |
| ---- | ------ | ---- | ---- |
| `Yyc3AiErrorRatioHigh` | AI 路由 5m 错误率 | > 2%，持续 5m | 先看 `/api/metrics` 的 `outcome` 分布：`error`=上游故障，`no-provider`=密钥缺失 |
| `Yyc3TtsServiceUnavailable` | TTS 503 计数（10m 增量） | > 0，持续 1m | 503 表示未配置或 `BIGMODEL_API_KEY` 失效（占位符/过期）；502 才排查上游 |
| `Yyc3EventLoopLagHigh` | `nodejs_eventloop_lag_p99_seconds` | > 100ms，持续 10m | 排查慢查询、同步 IO 或长任务阻塞 |

### 步骤 6 · 故障排查

| 现象 | 根因 | 处理 |
| ---- | ---- | ---- |
| targets 里 `up=0`，错误含 **401** | 令牌不一致（应用与令牌文件不是同一个） | 重新执行步骤 1，确保写入的是当前应用 `METRICS_TOKEN` |
| `up=0`，错误含 **503** | 应用侧未配置 `METRICS_TOKEN` | 配置后重启应用（见步骤 0） |
| 日志 `permission denied ... metrics_token` | 容器 uid 与文件属主不匹配（0600） | 加 `--user "$(id -u):$(id -g)"`，或将该文件 0644（宿主机目录保持 700） |
| `no such host host.docker.internal` | Linux 宿主机无该解析 | 加 `extra_hosts: host.docker.internal:host-gateway` 或改用 docker0 网关地址 |
| 规则页为空 | `rule_files` 路径错 / 未挂载 alerts.yml | `promtool check config` 会直接报出路径问题 |
| 告警长时间不触发 | 需满足 `for` 持续时间 + `evaluation_interval` 30s | 属正常；压测时把 `for` 临时调小验证链路 |
| 9090 端口被扫描 | 直接 `-p 9090:9090` 暴露到公网 | 改为 `127.0.0.1:9090:9090`，或用反代加 Basic Auth |

### 资源与保留

- 抓取间隔 15s、单目标、指标基数小：磁盘占用约每天数 MB；`--storage.tsdb.retention.time=15d` 足够回溯。
- 单实例部署即可；Prometheus 自身不做高可用，长期可换托管（Grafana Cloud / 云厂商托管 Prometheus）。

> **接线验证（2026-11-20 实测）**：本机无 promtool/docker 时按降级方案验证——
> ① 两份 YAML 结构校验（规则/抓取/挂载字段）通过；② 以生产模式启动应用并真实触发
> TTS 503 与 AI `no-provider` 请求后，三条告警引用的全部指标序列
> （`yyc3_ai_route_requests_total{outcome=…}`、`yyc3_business_requests_total{status="503"}`、
> `nodejs_eventloop_lag_p99_seconds`）在 `/api/metrics` 输出中可见，13 项断言全过。
> 接入真实 Prometheus 实例后按上述步骤 0–5 复核即可。

## 密钥轮换 Runbook

### 影响面总览

| 密钥 | 影响的业务功能 | 轮换的直接后果 | 需重启应用 | 需同步改抓取端 |
| ---- | -------------- | -------------- | ---------- | -------------- |
| `BIGMODEL_API_KEY` | 作业批改、TTS、语音转写 | 失效期间这些能力返回 503 | ✅ | — |
| `OPENAI_API_KEY` / `AI_API_KEY`+`AI_BASE_URL` | 对话、编排、评估报告、故事续写 | 对话降级为 `demo:true`，编排类 500 | ✅ | — |
| `JWT_SECRET` | 全部登录态 | **所有在线会话立即失效**，用户须重新登录 | ✅ | — |
| `METRICS_TOKEN` | `/api/metrics` 抓取 | 抓取端 401 → `up=0` → 三条告警数据源中断 | ✅ | ✅ 令牌文件 |
| `UPSTASH_REDIS_REST_TOKEN` | 限流（多实例时） | 写入失败 → 自动回退进程内计数并告警 | ✅ | — |
| 数据库口令（`DATABASE_URL`） | 全部读写 | 连不上即 5xx，`/api/health` 返回 503 | ✅ | — |

> **密钥有效性的唯一判定**：`lib/config/secret.ts` 的 `isRealSecret()`——长度 ≥20 且不含 `your`（忽略大小写）。
> 新密钥若带 `your` 字样或过短，会被当成「未配置」，表现为 503 而非 502，容易被误判为上游故障。

### 通用流程（四步）

```mermaid
flowchart LR
    A["① 预检：新密钥可用性"] --> B["② 写入环境变量（不落 git）"]
    B --> C["③ 重启并验证业务链路"]
    C --> D["④ 观测 30 分钟 → 记录 → 旧密钥作废"]
    C -.失败.-> E["回滚：恢复旧值重启"]
```

1. **预检**：先在服务商控制台确认新密钥可用（如 BigModel 用一次 `curl` 试调），避免「换完才发现新 key 未开通」。
2. **写入**：本地改 `.env.local`，服务器改进程环境/`.env.production`；两者都在 `.gitignore` 内。**禁止**写入仓库、镜像、CI 明文日志。
3. **重启并验证**：见下方各自章节的验证命令；不要只看进程起来了。
4. **观测**：`/api/metrics` 中对应计数恢复正常，告警在 `for` 窗口后自动恢复 `inactive`；随后在服务商侧删除旧密钥。

### A. `BIGMODEL_API_KEY`（当前最高优先级：本地密钥已实测失效）

```bash
# 1) 在 https://bigmodel.cn/usercenter/proj-mgmt/apikeys 新建密钥（旧 key 保留至验证通过再删）
# 2) 写入本地/.env.local 或服务器环境（≥20 字符，不含 your）
#    本地验证：
bun run start                      # 生产模式加载 .env.local；容器内改为 docker compose up -d
# 3) 验证：登录拿 Cookie 后试合成
curl -s -o /tmp/tts.wav -w 'tts=%{http_code}\n' -b /tmp/cookies.txt \
  -X POST -H 'content-type: application/json' -d '{"text":"你好"}' \
  http://localhost:1228/api/ai/text-to-speech      # 期望 200；503 = 仍未识别为有效密钥
# 4) 观测指标计数（应出现 status="200" 且不再增长 503）
curl -s -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:1228/api/metrics \
  | grep 'yyc3_business_requests_total{route="ai/text-to-speech"'
```

回滚：把旧值写回并重启。旧密钥验证通过前**不要**在服务商侧删除。

### B. `JWT_SECRET`

```bash
# 1) 生成强随机值（32 字节 → 64 hex）
openssl rand -hex 32
# 2) 写入环境变量并重启（本地开发用 data/.jwt-dev-secret，勿与生产混用）
# 3) 验证：新登录可用、旧 Cookie 被判 401
curl -s -o /dev/null -w 'login=%{http_code}\n' -X POST -H 'content-type: application/json' \
  -d '{"email":"你已注册的邮箱","password":"口令"}' -c /tmp/new.txt http://localhost:1228/api/auth/login
curl -s -o /dev/null -w 'old-cookie=%{http_code}\n' -H 'Cookie: yyc3_at=<旧令牌>' \
  http://localhost:1228/api/children            # 期望 401
```

> 本项目**没有多密钥共存（kid）机制**，轮换即等于全员登出。请在低峰期执行，并提前公告。
> 回滚虽然能恢复旧密钥，但期间已重登用户的令牌同样会失效——回滚不是「无损」操作。

### C. `METRICS_TOKEN`

```bash
# 1) 轮换（--force 才会覆盖已有值；默认幂等跳过）
bun run gen:metrics-token -- production --force --print
# 2) 令牌文件与抓取端同步（Prometheus 的 credentials_file 在每次抓取时读取，通常无需重启）
printf '%s' '<新令牌>' > deploy/monitoring/metrics_token && chmod 600 deploy/monitoring/metrics_token
# 3) 重启应用后再验证
curl -s -o /dev/null -w 'app=%{http_code}\n' -H "Authorization: Bearer <新令牌>" http://localhost:1228/api/metrics
curl -s 'http://127.0.0.1:9090/api/v1/query?query=up%7Bjob%3D%22yyc3-baby-moyu%22%7D'   # 期望 1
```

顺序很重要：**先应用生效，再更新抓取端**（反序会出现一段 `up=0` 的告警噪声）。

### D. `UPSTASH_REDIS_REST_TOKEN`（多实例场景）

```bash
# 1) Upstash 控制台重置 REST token（URL 不变）
# 2) 更新应用环境变量并重启；只改 TOKEN 不改 URL
# 3) 验证限流仍生效（连续请求触发 429）且不再出现回退告警
grep -c "回退进程内计数" /tmp/app.log 2>/dev/null || echo "无回退日志（正常）"
```

故障期行为是**可用性优先**：写入失败自动回退进程内计数并打印 `[rate-limit] upstash 存储异常，回退进程内计数`，
但多副本时配额会临时失真——需尽快修复。

### 轮换检查清单

- [ ] 新密钥已在服务商侧验证可用（未开通/未授权的密钥直接换上来只会换来 503）
- [ ] 新密钥长度 ≥20 且不含 `your`（`isRealSecret` 判定）
- [ ] 只写入 `.env.local` / 进程环境，`git status` 中无密钥文件
- [ ] 已选择低峰期（`JWT_SECRET` 轮换 = 全员登出）
- [ ] 重启后按对应章节命令验证到 **200**，而不是只看进程存活
- [ ] 观测 `/api/metrics` 对应计数与告警状态，30 分钟内无异常
- [ ] 服务商侧删除旧密钥，并在团队轮换记录中登记（时间/操作人/范围/结果）

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
