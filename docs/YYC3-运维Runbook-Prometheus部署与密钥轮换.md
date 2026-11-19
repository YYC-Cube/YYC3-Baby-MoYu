# YYC³ 运维 Runbook · Prometheus 实例部署与密钥轮换

> 生成日期：2026-11-20 ｜ 适用版本：`main`（Next.js 16.4.5 单进程部署）
> 关联：[08 · 部署](./developer/08-deployment.md)（部署形态与环境变量清单）、[07 · 测试与质量门禁](./developer/07-testing-quality.md)、[SECURITY.md](../SECURITY.md)
> 定位：可逐条复制执行的运维手册。工程侧配置见 [`deploy/monitoring/`](../deploy/monitoring/)；本文负责「怎么部署、怎么换、怎么验、怎么退」。

---

## 0. 适用范围与前置

| 项 | 要求 |
| ---- | ---- |
| 应用状态 | 已以生产模式运行（`bun run start` 或 `docker compose up -d`），`/api/health` 返回 200 |
| 指标端点 | 已配置 `METRICS_TOKEN`；匿名访问 `/api/metrics` 应返回 **401**（**503 表示应用侧未配置**，先修应用） |
| 抓取配置 | [`prometheus.yml`](../deploy/monitoring/prometheus.yml) + [`alerts.yml`](../deploy/monitoring/alerts.yml)（三条告警） |
| 密钥口径 | 唯一判定点 `lib/config/secret.ts` 的 `isRealSecret()`：**长度 ≥20 且不含 `your`**（忽略大小写） |
| 权限 | 令牌文件 `0600`；Prometheus 端口仅监听 `127.0.0.1` |

---

# 一、Prometheus 实例部署

按「前置 → 令牌 → 校验 → 部署 → 验证 → 排障」六步执行。

## 步骤 0 · 前置检查

```bash
# ① 应用已以生产模式运行，且配置了 METRICS_TOKEN
curl -s -o /dev/null -w 'anonymous=%{http_code}\n' http://localhost:1228/api/metrics        # 期望 401
curl -s -o /dev/null -w 'authorized=%{http_code}\n' \
  -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:1228/api/metrics               # 期望 200

# ② 若抓取端是容器，确认能解析宿主机
docker run --rm alpine getent hosts host.docker.internal || echo "需加 extra_hosts（见 3-B 备注）"
```

> 期望 401 而非 503：503 表示应用侧根本没配 `METRICS_TOKEN`，先把应用配好再部署抓取端。

## 步骤 1 · 生成并落盘抓取令牌

```bash
cd /path/to/YYC3-Baby-MoYu
bun run gen:metrics-token -- production --print   # 打印明文（仅本次），同时写入 .env.production

# 落盘为 Prometheus 专用凭据文件（该路径已被 .gitignore，禁止提交）
umask 077
printf '%s' '<粘贴上一步的明文令牌>' > deploy/monitoring/metrics_token
chmod 600 deploy/monitoring/metrics_token
ls -l deploy/monitoring/metrics_token             # 期望 -rw-------
```

生成脚本是幂等的：重复执行会「跳过」并只打印掩码 + `sha256` 指纹；轮换必须显式加 `--force`。

## 步骤 2 · 校验配置（部署前必做）

```bash
# 用官方镜像自带的 promtool 校验，不依赖本机安装
docker run --rm -v "$PWD/deploy/monitoring:/etc/prometheus:ro" \
  --entrypoint promtool prom/prometheus:v3.1.0 \
  check config /etc/prometheus/prometheus.yml

docker run --rm -v "$PWD/deploy/monitoring:/etc/prometheus:ro" \
  --entrypoint promtool prom/prometheus:v3.1.0 \
  check rules /etc/prometheus/alerts.yml
```

两条命令都应输出 `SUCCESS`。规则语法/缩进错误会在此步被拦下，不必等到进程起不来。

## 步骤 3 · 部署（三选一）

### A. 单容器（推荐）

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

### B. 并入 docker-compose.yml

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

### C. 裸机 systemd（无 Docker）

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

## 步骤 4 · 校验抓取与规则装载

```bash
# 进程健康
curl -s http://127.0.0.1:9090/-/healthy                      # 期望 200

# 目标是否 UP（核心断言：health 应为 "up"）
curl -s 'http://127.0.0.1:9090/api/v1/targets?state=active' | grep -o '"health":"[a-z]*"' | head -2

# 更直接的 PromQL 断言（应返回 1）
curl -s 'http://127.0.0.1:9090/api/v1/query?query=up%7Bjob%3D%22yyc3-baby-moyu%22%7D'

# 规则是否装载（应看到 3 条告警名）
curl -s http://127.0.0.1:9090/api/v1/rules | grep -o 'Yyc3[A-Za-z]*' | sort -u
```

## 步骤 5 · 端到端验证（含负向）

```bash
# 正向：业务指标已可见
curl -s 'http://127.0.0.1:9090/api/v1/query?query=yyc3_ai_route_requests_total' | head -c 200

# 负向：临时改错令牌 → 抓取应失败、up 变 0（验证门禁真实生效，而不是"看起来绿"）
printf 'wrong-token' > deploy/monitoring/metrics_token
sleep 30
curl -s 'http://127.0.0.1:9090/api/v1/query?query=up%7Bjob%3D%22yyc3-baby-moyu%22%7D'

# 恢复正确令牌
printf '%s' "$METRICS_TOKEN" > deploy/monitoring/metrics_token && chmod 600 deploy/monitoring/metrics_token
```

## 步骤 6 · 故障排查

| 现象 | 根因 | 处理 |
| ---- | ---- | ---- |
| targets 里 `up=0`，错误含 **401** | 令牌不一致（应用与令牌文件不是同一个） | 重做步骤 1，确保写入的是当前应用的 `METRICS_TOKEN` |
| `up=0`，错误含 **503** | 应用侧未配置 `METRICS_TOKEN` | 配置后重启应用（见步骤 0） |
| 日志 `permission denied ... metrics_token` | 容器 uid 与文件属主不匹配（0600） | 加 `--user "$(id -u):$(id -g)"`，或将该文件 0644（宿主机目录保持 700） |
| `no such host host.docker.internal` | Linux 宿主机无该解析 | 加 `extra_hosts: host.docker.internal:host-gateway`，或改用 docker0 网关地址 |
| 规则页为空 | `rule_files` 路径错 / 未挂载 `alerts.yml` | `promtool check config` 会直接报出路径问题 |
| 告警长时间不触发 | 需满足 `for` 持续时间 + `evaluation_interval` 30s | 属正常；压测时把 `for` 临时调小验证链路 |
| 9090 端口被扫描 | 直接 `-p 9090:9090` 暴露到公网 | 改 `127.0.0.1:9090:9090`，或反代加 Basic Auth |

## 资源与保留

- 抓取间隔 15s、单目标、指标基数小：磁盘占用约每天数 MB；`--storage.tsdb.retention.time=15d` 足够回溯。
- 单实例即可；Prometheus 自身不做高可用，长期可换托管（Grafana Cloud / 云厂商托管 Prometheus）。

## 三条告警（数据源与处置）

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
> 接入真实 Prometheus 实例后按步骤 0–5 复核即可。

---

# 二、密钥轮换

## 影响面总览

| 密钥 | 影响的业务功能 | 轮换的直接后果 | 需重启应用 | 需同步改抓取端 |
| ---- | -------------- | -------------- | ---------- | -------------- |
| `BIGMODEL_API_KEY` | 作业批改、TTS、语音转写 | 失效期间这些能力返回 503 | ✅ | — |
| `OPENAI_API_KEY` / `AI_API_KEY`+`AI_BASE_URL` | 对话、编排、评估报告、故事续写 | 对话降级为 `demo:true`，编排类 500 | ✅ | — |
| `JWT_SECRET` | 全部登录态 | **所有在线会话立即失效**，用户须重新登录 | ✅ | — |
| `METRICS_TOKEN` | `/api/metrics` 抓取 | 抓取端 401 → `up=0` → 三条告警数据源中断 | ✅ | ✅ 令牌文件 |
| `UPSTASH_REDIS_REST_TOKEN` | 限流（多实例时） | 写入失败 → 自动回退进程内计数并告警 | ✅ | — |
| 数据库口令（`DATABASE_URL`） | 全部读写 | 连不上即 5xx，`/api/health` 返回 503 | ✅ | — |

> 新密钥若带 `your` 字样或长度 <20，会被 `isRealSecret()` 判为「未配置」，表现为 **503 而非 502**——
> 别把它误判成上游故障。

## 通用流程（四步）

```mermaid
flowchart LR
    A["① 预检：新密钥可用性"] --> B["② 写入环境变量（不落 git）"]
    B --> C["③ 重启并验证业务链路"]
    C --> D["④ 观测 30 分钟 → 记录 → 旧密钥作废"]
    C -.失败.-> E["回滚：恢复旧值重启"]
```

1. **预检**：先在服务商控制台确认新密钥可用（如 BigModel 用一次 `curl` 试调），避免「换完才发现新 key 未开通」。
2. **写入**：本地改 `.env.local`，服务器改进程环境/`.env.production`；两者都在 `.gitignore` 内。**禁止**写入仓库、镜像、CI 明文日志。
3. **重启并验证**：按下方各自章节的命令验证到 **200**；不要只看进程起来了。
4. **观测**：`/api/metrics` 对应计数恢复正常，告警在 `for` 窗口后恢复 `inactive`；随后在服务商侧删除旧密钥。

## A. `BIGMODEL_API_KEY`（当前最高优先级：本地密钥已实测失效）

```bash
# 1) 在 https://bigmodel.cn/usercenter/proj-mgmt/apikeys 新建密钥（旧 key 保留至验证通过再删）
# 2) 写入 .env.local 或服务器环境（≥20 字符，不含 your）
bun run start                      # 生产模式加载 .env.local；容器内改为 docker compose up -d

# 3) 验证：登录拿 Cookie 后试合成
curl -s -o /tmp/tts.wav -w 'tts=%{http_code}\n' -b /tmp/cookies.txt \
  -X POST -H 'content-type: application/json' -d '{"text":"你好"}' \
  http://localhost:1228/api/ai/text-to-speech      # 期望 200；503 = 仍未识别为有效密钥

# 4) 观测计数（应出现 status="200" 且不再增长 503）
curl -s -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:1228/api/metrics \
  | grep 'yyc3_business_requests_total{route="ai/text-to-speech"'
```

回滚：把旧值写回并重启。旧密钥验证通过前**不要**在服务商侧删除。

## B. `JWT_SECRET`

```bash
# 1) 生成强随机值（32 字节 → 64 hex）
openssl rand -hex 32

# 2) 写入环境变量并重启（本地开发用 data/.jwt-dev-secret，勿与生产混用）

# 3) 验证：新登录可用、旧 Cookie 被判 401
curl -s -o /dev/null -w 'login=%{http_code}\n' -X POST -H 'content-type: application/json' \
  -d '{"email":"你已注册的邮箱","password":"口令"}' -c /tmp/new.txt \
  http://localhost:1228/api/auth/login
curl -s -o /dev/null -w 'old-cookie=%{http_code}\n' -H 'Cookie: yyc3_at=<旧令牌>' \
  http://localhost:1228/api/children            # 期望 401
```

> 本项目**没有多密钥共存（kid）机制**，轮换即等于全员登出。请在低峰期执行并提前公告。
> 回滚能恢复旧密钥，但期间已重新登录用户的令牌同样会失效——回滚不是「无损」操作。

## C. `METRICS_TOKEN`

```bash
# 1) 轮换（--force 才会覆盖已有值；默认幂等跳过）
bun run gen:metrics-token -- production --force --print

# 2) 同步抓取端令牌文件（credentials_file 每次抓取读取，通常无需重启 Prometheus）
printf '%s' '<新令牌>' > deploy/monitoring/metrics_token
chmod 600 deploy/monitoring/metrics_token

# 3) 重启应用后验证
curl -s -o /dev/null -w 'app=%{http_code}\n' \
  -H "Authorization: Bearer <新令牌>" http://localhost:1228/api/metrics
curl -s 'http://127.0.0.1:9090/api/v1/query?query=up%7Bjob%3D%22yyc3-baby-moyu%22%7D'   # 期望 1
```

顺序很重要：**先应用生效，再更新抓取端**（反序会出现一段 `up=0` 的告警噪声）。

## D. `UPSTASH_REDIS_REST_TOKEN`（多实例场景）

```bash
# 1) Upstash 控制台重置 REST token（URL 不变）
# 2) 更新应用环境变量并重启；只改 TOKEN 不改 URL
# 3) 验证限流仍生效（连续请求触发 429）且不再出现回退告警
grep -c "回退进程内计数" /tmp/app.log 2>/dev/null || echo "无回退日志（正常）"
```

故障期行为是**可用性优先**：写入失败自动回退进程内计数并打印
`[rate-limit] upstash 存储异常，回退进程内计数`，但多副本时配额会临时失真——需尽快修复。

## 轮换检查清单

- [ ] 新密钥已在服务商侧验证可用（未开通/未授权的密钥换上来只会换来 503）
- [ ] 新密钥长度 ≥20 且不含 `your`（`isRealSecret` 判定）
- [ ] 只写入 `.env.local` / 进程环境，`git status` 中无密钥文件
- [ ] 已选择低峰期（`JWT_SECRET` 轮换 = 全员登出）
- [ ] 重启后按对应章节命令验证到 **200**，而不是只看进程存活
- [ ] 观测 `/api/metrics` 对应计数与告警状态，30 分钟内无异常
- [ ] 服务商侧删除旧密钥，并在团队轮换记录中登记（时间/操作人/范围/结果）

---

# 三、附录 · 快速命令卡

```bash
# 抓取端健康与目标状态
curl -s localhost:9090/-/healthy
curl -s 'localhost:9090/api/v1/query?query=up{job="yyc3-baby-moyu"}'

# 应用侧指标（带令牌）
curl -s -H "Authorization: Bearer $METRICS_TOKEN" localhost:1228/api/metrics | head -5

# 当前告警状态（inactive/pending/firing）
curl -s localhost:9090/api/v1/alerts | head -c 300

# 配置热加载（改完 prometheus.yml/alerts.yml 后）
curl -X POST localhost:9090/-/reload     # 需启动时带 --web.enable-lifecycle
```

---

## 变更历史

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-11-20 | 首版 | 从 08 部署篇章抽出独立 Runbook：Prometheus 部署六步 + 密钥轮换四类 + 排障表 + 快速命令卡；同步修复 `deploy/monitoring/metrics_token` 未 gitignore 的误提交风险 |
