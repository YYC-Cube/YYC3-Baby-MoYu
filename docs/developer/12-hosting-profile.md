# 12 · 部署承载分析（Q2）与上线配置要求

> 定位：回答「容器在哪跑、需要哪些配置、怎么验收」。**本文只给方案与清单，不代替运维决策**。
> 现状基线：单进程 Next.js（`:1228`）+ SQLite **或** PG15（`DB_DRIVER` 切换）+ 进程内限流 + `node:sqlite` 原生依赖。

## 1. 应用对环境的硬性要求（先看约束，再选平台）

| 约束 | 具体要求 | 不满足的后果 |
| ---- | ---- | ---- |
| 运行时 | **Node ≥ 22.13**（`node:sqlite`）或纯 PG 模式可放宽到 Node 20+ | 启动即崩 |
| 进程模型 | **常驻单进程**（限流为进程内 Map、AgenticCore 为进程单例） | Serverless 多实例下限流失效、状态不共享 |
| 文件系统 | SQLite 模式需**可写持久卷**（`data/`） | 数据每次部署丢失 |
| 数据库 | 推荐 PG15（外部实例或同机容器） | 多副本/备份能力受限 |
| 环境变量 | `JWT_SECRET`（生产必填）、AI 密钥（可空但功能降级） | 生产启动后鉴权拒绝签发 |
| 出网 | 需访问 `open.bigmodel.cn`、OpenAI 兼容端点、`fal.run` | AI 功能 5xx/降级 |
| 入站 | 仅需 443（外网），内部 1228 不暴露 | 安全隐患 |
| 上传体积 | 作业图 10 MB、音频 25 MB → 反代 `client_max_body_size ≥ 30m` | 413 |
| 长连接 | SSE（`/api/ai/chat`）→ 反代关闭 buffering、放宽超时 | 流式输出中断 |
| 构建 | `bun install --frozen-lockfile` + `next build`（Node 执行） | 构建失败 |
| 时区 | 容器 `TZ=Asia/Shanghai`（展示类日期依赖） | 日期偏移 |

## 2. 三方案对比

| 维度 | A 本机 Docker（当前） | B 单机云服务器 + Caddy/Nginx（**推荐首发**） | C 容器型 PaaS（Railway/Render/Fly/ACK） |
| ---- | ---- | ---- | ---- |
| 适用 | 演示、内网验收 | 真实上线、可控成本、可备份 | 快速上线、弹性、免运维 |
| 可用性 | 关机即停 | 单点（可加 systemd 自动拉起 + 健康检查重启） | 平台托管重启与滚动发布 |
| PG 承载 | 本机 5433 | 同机容器或独立实例 | 平台托管 PG 插件 |
| 数据持久化 | `./data`（SQLite） | 宿主卷或 PG + `pg_dump` 定时备份 | 托管卷/托管库 |
| 反代/HTTPS | 无 | Caddy 自动证书（推荐）或 Nginx + certbot | 平台自带域名/证书 |
| 多副本 | ❌（限流/单例语义） | 需先改 Redis 限流 | 同左，禁止直接 `--scale` |
| 成本 | 0 | 低（2C4G ≈ 数十元/月） | 中（按实例计费） |
| 运维成本 | 低 | 中（系统/证书/备份） | 低 |
| 主要风险 | 无公网、无备份 | 单点故障、磁盘写满 | 冷启动/长连接限制、出网策略 |

**结论**：首发选 **B**（单机 Docker Compose：`app` + `postgres` + `caddy`），
SQLite 保留为「演示/回滚」形态；**不建议 Vercel/Netlify 类纯 Serverless**（与常驻进程、`node:sqlite`、SSE 长连接三者冲突）。

## 3. 方案 B 落地配置（可直接照做）

### 3.1 资源与系统

| 项 | 建议值 | 说明 |
| ---- | ---- | ---- |
| CPU/内存 | 2C / 4G（PG 与应用同机时 4C/8G） | Next 构建峰值较高，构建建议在 CI 完成 |
| 磁盘 | 40G SSD | PG 数据 + 镜像 + 备份保留 7 天 |
| 系统 | Ubuntu 22.04/24.04 LTS | Docker 官方源安装 |
| 时区 | `Asia/Shanghai` | `timedatectl set-timezone` |

### 3.2 环境变量（生产最小集）

| 变量 | 必填 | 示例 | 备注 |
| ---- | ---- | ---- | ---- |
| `NODE_ENV` | ✅ | `production` | 生产模式跳过演示种子 |
| `JWT_SECRET` | ✅ | `openssl rand -hex 32` | 缺失则拒绝签发令牌 |
| `DB_DRIVER` | 建议 | `postgres` | 缺省 sqlite |
| `DATABASE_URL` | ✅（PG） | `postgres://app:***@postgres:5432/yyc3` | 不落盘、不进镜像 |
| `BIGMODEL_API_KEY` / `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `FAL_KEY` | 按功能 | — | 缺失即降级（见 06） |
| `CSRF_TRUSTED_ORIGINS` | 可选 | `https://baby.example.com` | 反代/多端场景 |
| `CSRF_REQUIRE_ORIGIN` | 可选 | `true`（强校验） | 仅浏览器客户端时建议开 |
| `TZ` | 建议 | `Asia/Shanghai` | 日期展示 |
| `LOG_DIR` / `LOG_LEVEL` | 可选 | `/app/logs` / `info` | 轮转目录需持久卷 |

> 密钥只经环境变量或平台 Secret 注入；**禁止**写入镜像、compose 明文、仓库文件。

### 3.3 反向代理（Caddy 示例）

```caddyfile
baby.example.com {
  encode zstd gzip
  request_body {
    max_size 30MB          # 覆盖 10MB 图 / 25MB 音频
  }
  reverse_proxy app:1228 {
    flush_interval -1      # SSE 需要即时刷新
    transport http {
      read_timeout 180s
      write_timeout 180s
    }
  }
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
  }
}
```

Nginx 等价要点：`client_max_body_size 30m`、`proxy_buffering off`（SSE）、`proxy_read_timeout 180s`、
`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`（**限流键依赖它**）。

### 3.4 数据与备份

| 模式 | 备份方式 | 频率 | 恢复 |
| ---- | ---- | ---- | ---- |
| PG（推荐） | `pg_dump --format=custom` + 加密上传对象存储 | 每日 + 发布前 | `pg_restore --clean` |
| SQLite | `VACUUM INTO`（应用内置 `backup()`）或直接复制 `data/`（需停写） | 每日 | 替换文件后重启 |

保留策略建议：日备 7 份 + 周备 4 份；每季度做一次**恢复演练**（否则备份等于没有）。

### 3.5 发布流水线（最小闭环）

```
PR → CI 四绿（tsc/lint/test/build/e2e）→ 合并 main
   → 构建镜像（linux/amd64 或 arm64，按服务器架构）→ 推送 registry（tag: git sha）
   → 服务器 docker compose pull && up -d → 等待 /api/health 200
   → 失败自动回滚上一 tag（保留最近 3 个镜像）
```

## 4. 上线验收清单（逐项勾选才可对外）

- [ ] `https://<域名>/api/health` 返回 200 且 `status: ok`
- [ ] `/`、`/en` 200；未知路径 404；`/growth` 未登录 307
- [ ] 匿名 `/api/children` 401（越权为 0）
- [ ] 注册 → 登录 → 建娃 → 写记录 → 评估保存 → 换设备可见（PG 模式）
- [ ] 容器重启后数据仍在（PG 或持久卷）
- [ ] SSE 对话可逐字返回且 30s 内不中断
- [ ] 10 MB 图片批改、25 MB 音频转写不被反代 413 拦截
- [ ] `pg_dump` 备份成功且完成一次恢复演练
- [ ] 日志落盘并轮转；磁盘水位告警 < 80%
- [ ] `JWT_SECRET` 为随机 32+ 字节；仓库无密钥残留（`git grep` 自查）
- [ ] Caddy/Nginx 仅暴露 443；PG 端口不对公网开放

## 5. 何时必须升级架构（触发条件）

| 触发条件 | 需要的改造 |
| ---- | ---- |
| 需要多副本/零停机发布 | 限流换 Redis（`lib/rate-limit.ts` 接口不变）+ 会话/状态外置 |
| 单日活跃 > 数百或写入冲突频发 | PG 连接池配额、读写分离、索引评审 |
| AI 用量上量 | 网关化（统一超时/重试/配额/成本计量），见 06 的后续规划 |
| 需要审计/合规 | 操作审计表 + 数据导出/删除接口 + 留存策略 |
