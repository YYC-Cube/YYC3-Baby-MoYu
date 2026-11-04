---
file: 05-部署可行性方案-NAS+ECS.md
description: 基于实测环境（阿里云 2C2G ECS + 自有 NAS 31Gi）的 YYC3-Baby-MoYu 部署可行性方案
author: AI Tutor <TraeCode / Intelligent Application Implementation Expert>
version: v1.0.0
created: 2026-11-02
updated: 2026-11-02
status: active
tags: [deployment, feasibility, nas, ecs, topology]
category: plan
---

# 🚀 部署可行性方案（NAS + 阿里云 ECS）

> 依据：本次实测环境 + 项目实测指标。**不猜测未提供的参数**，缺失项列入 §9 确认清单。

## 1. 环境事实（实测/截图）

| 项 | 值 | 来源 |
| ---- | ---- | ---- |
| 域名 | `baby.yanyucloud.net` → **8.136.140.82** | `dig` 实测 |
| 文档站 | `baby.yyc3.vip` → GitHub Pages（185.199.x） | `dig` 实测，**与应用域名不冲突** |
| ECS 规格 | **2 vCPU / 2 GiB** / 40 GiB ESSD Entry / **3 Mbps 固定带宽** / Ubuntu 22.04 UEFI | 控制台截图 |
| ECS 公网/私网 | 8.136.140.82 / 172.20.247.50；到期 2027-05-04 | 截图 |
| ECS 端口 | 从公网访问 **22 / 80 / 443 全部 timeout** | 本机 `curl`/`nc` 实测 → 安全组未放行或未建服务 |
| NAS | **31 GiB 内存**（已用 5.0，available 25）、swap 1.9 GiB（已用 1.1）、load 1.51–2.72 | 现场输出 |
| NAS 磁盘 | 根 `/dev/md9` **7.5G 用 76%（余 1.8G）**；Volume1 14T（余 5.8T）、Volume2 1.5T（余 1.2T）、Volume3 1.9T（余 919G） | 现场输出 |
| NAS 运行时 | Node **22.23.4**、pnpm 12.14、**Docker Engine 已装**、PostgreSQL **13** 在 PATH | 现场输出 |
| 应用实测 | 容器空闲 **42.7 MiB**；镜像 **604 MB**；PG 库 **8 MB**；`public/` **18 MB**（图片 17.9 MB） | 本机实测 |

**两个硬约束**：
1. ECS **只有 2 GiB 内存**：可以跑应用，但**不能同时在服务器上构建**（`next build` 峰值需 1–1.5G），且 PG 必须调小。
2. NAS **根盘仅余 1.8G**：Docker 数据目录/卷**必须放到 Volume1**（或 Volume3），否则很快写满根盘导致系统异常。

## 2. 三种方案对比

| 方案 | 应用 | 数据库 | 公网入口 | 可行性 | 结论 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| **A 全 ECS 单机** | ECS 2C2G | ECS 内 PG（调小） | ECS 直接 | 可行但紧：内存峰值贴顶、无法本机构建、3Mbps 首访慢 | ⚠️ 仅建议**临时演示** |
| **B NAS 运行 + ECS 入口**（推荐） | NAS（31G/大容量） | NAS 内 PG15 容器（或 PG13） | ECS 反代 + 隧道 | 内存/磁盘充裕，入口稳定 | ✅ **推荐** |
| C 托管 PaaS | 平台 | 托管 PG | 平台域名 | 与常驻进程/`node:sqlite`/SSE 有冲突 | ❌ 不推荐 |

## 3. 推荐拓扑（方案 B）

```mermaid
flowchart LR
    U["用户浏览器<br/>PWA"] -->|"443 HTTPS"| CFG["ECS 8.136.140.82<br/>Caddy / Nginx + 证书"]
    CFG -->|"WireGuard 10.8.0.2:1228<br/>（私网隧道）"| APP["NAS Docker<br/>yyc3-baby-moyu (mem 1G)"]
    APP -->|"postgres:5432"| PG[("PG15 容器<br/>shared_buffers 256MB")]
    APP -->|"外网"| AI["BigModel / OpenAI / fal.ai"]
    APP --> LOG["/volume1/docker/yyc3/logs"]
    PG --> BK["pg_dump → /volume1/docker/yyc3/backups<br/>+ Snapshot 每日"]
```

**为什么这样分**：
- NAS 有 31 GiB 内存与 TB 级磁盘 → 跑 Node + PG 从容，且便于本地快照备份；
- ECS 2 GiB 只承担 TLS 终止与反代（Caddy 约 20–40 MB），**不做构建、不跑 PG**；
- 家庭宽带的 80/443 通常被运营商封锁，用 **WireGuard 隧道**把 NAS 的 1228 加密暴露给 ECS，公网只需 ECS 的 443。

## 4. 资源分配（按实测）

### 4.1 NAS 侧

| 组件 | 限制 | 说明 |
| ---- | ---- | ---- |
| `yyc3-baby-moyu` | `mem_limit: 1g`、`NODE_OPTIONS=--max-old-space-size=768` | 空闲 43 MB，1G 足够应对展示级并发 |
| `postgres:15-alpine` | `mem_limit: 1g`、`shared_buffers=256MB`、`max_connections=20`、`work_mem=4MB` | NAS 内存充裕，可放宽；勿用默认值占满 |
| 数据目录 | `/volume1/docker/yyc3/{data,pgdata,logs,backups}` | **禁止**放 `/`（根盘仅 1.8G） |
| 日志 | 应用 winston 轮转 + Docker `json-file` 限制 `max-size=10m,max-file=3` | 防止日志吃盘 |
| 休眠 | 关闭硬盘休眠（控制面板 → 硬件与电源） | 避免服务中断 |

> PG 版本：客户端仅使用 `ON CONFLICT / RETURNING / ANY($1::text[])` 等标准能力，**PG 13 与 15 均可**；
> 建议直接跑 `postgres:15-alpine` 容器与线上/本地版本一致；若用 NAS 自带 PG13，需另建库并避免与套件库混用。

### 4.2 ECS 侧

| 组件 | 限制/配置 | 说明 |
| ---- | ---- | ---- |
| Caddy（或 Nginx） | 内存 ~40 MB | 仅 TLS + 反代；`client_max_body_size 30m`、SSE 关闭缓冲 |
| 系统 | 关闭无用服务；审计日志轮转 | 40G 盘足够（不构建） |
| 带宽 | 3 Mbps ≈ 375 KB/s | 文本/JSON 足够；**图片必须优化或走 CDN/OSS** |

## 5. 带宽与静态资源（3 Mbps 的现实影响）

| 资产 | 现状 | 3 Mbps 首访耗时 | 处置建议 |
| ---- | ---- | ---- | ---- |
| JS/CSS（压缩后） | 约 300–600 KB | 1–2 s | 保持 gzip/br；已 `compress: true` |
| 图片 | **17.9 MB**（单张 400–600 KB） | **~50 s**（无缓存） | ①转 WebP/压缩至 ≤3 MB 总量；②或上传阿里云 OSS + CDN；③首屏懒加载 |
| 二次访问 | PWA 缓存 | 接近瞬时 | 保留 `sw.js` 的 network-first/静态缓存策略 |

结论：**不改图片，3 Mbps 下首次展示体验不可接受**；建议至少完成 ①（WebP）或 ②（OSS+CDN）之一再对外。

## 6. 网络打通：三条可选路径

| 路径 | 优点 | 代价/限制 | 推荐度 |
| ---- | ---- | ---- | ---- |
| **WireGuard**（ECS 作服务端） | 内核级、稳定、低开销；ECS 只开 443/22+UDP 51820 | 需在安全组放行 UDP；需维护密钥 | ⭐⭐⭐⭐ **首选** |
| frp（HTTP 隧道） | 配置简单，NAS 主动连 ECS | 需额外进程；HTTP 层多一跳 | ⭐⭐⭐ |
| Cloudflare Tunnel | 无需公网 IP/端口，自带证书 | 国内访问质量波动；域名需托管 CF | ⭐⭐（备选） |

**WireGuard 要点**：ECS `wg0=10.8.0.1/24`，NAS `10.8.0.2`；Caddy `reverse_proxy 10.8.0.2:1228`；
安全组放行 `UDP 51820` + `TCP 443`；NAS 侧 `PersistentKeepalive=25` 抗 NAT 超时。

## 7. 分步落地 Runbook

### 7.1 ECS（约 20 分钟）

```bash
# 1) 控制台安全组：TCP 22（限你的出口 IP）、TCP 80、TCP 443、UDP 51820
# 2) 基础加固
sudo apt update && sudo apt -y upgrade
sudo timedatectl set-timezone Asia/Shanghai
sudo ufw allow 22,80,443/tcp && sudo ufw allow 51820/udp && sudo ufw enable

# 3) 装 Caddy（自动 HTTPS）
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt -y install caddy

# 4) WireGuard
sudo apt -y install wireguard-tools
# wg genkey / wg pubkey 生成密钥，配置 /etc/wireguard/wg0.conf 后：
sudo systemctl enable --now wg-quick@wg0
```

`/etc/caddy/Caddyfile`（关键项，完整版见 12 文档）：

```caddyfile
baby.yanyucloud.net {
  encode zstd gzip
  request_body { max_size 30MB }
  reverse_proxy 10.8.0.2:1228 {
    flush_interval -1
    transport http { read_timeout 180s write_timeout 180s }
  }
  header { Strict-Transport-Security "max-age=31536000; includeSubDomains" }
}
```

### 7.2 NAS（约 30 分钟）

```bash
# 1) 目录（务必在 Volume1，不在根盘）
mkdir -p /volume1/docker/yyc3/{data,pgdata,logs,backups}
cd /volume1/docker/yyc3
# 2) 取 compose 与镜像（二选一：内网构建 / 从 registry 拉取）
#    推荐：在 CI 或开发机构建后 docker save + NAS docker load（NAS 2C 构建慢且占内存）
docker load -i yyc3-baby-moyu.tar
# 3) .env（示例）
cat > .env <<'EOF'
JWT_SECRET=<openssl rand -hex 32>
DB_DRIVER=postgres
DATABASE_URL=postgres://app:<PG_PASSWORD>@postgres:5432/yyc3
PG_PASSWORD=<强随机>
PG_USER=app
PG_DATABASE=yyc3
TZ=Asia/Shanghai
SEED_DEMO=false
EOF
docker compose --profile pg up -d
curl -fsS http://127.0.0.1:1228/api/health
```

> 若要从旧数据迁移：在 NAS 的仓库副本执行
> `bun run db:migrate:pg -- --sqlite data/yyc3.db --pg postgres://app:***@127.0.0.1:5432/yyc3`
> （需临时把 PG 端口映射到本机或走容器网络执行）。

### 7.3 首个验收（两条命令）

```bash
curl -fsS https://baby.yanyucloud.net/api/health   # → {"status":"ok"}
curl -s -o /dev/null -w '%{http_code}\n' https://baby.yanyucloud.net/api/children  # → 401
```

## 8. 风险矩阵

| 风险 | 概率 | 影响 | 缓解 |
| ---- | ---- | ---- | ---- |
| 域名未备案 → 大陆 ECS 80/443 被拦截 | 待确认（当前端口全 timeout） | **无法对外** | 先完成 ICP 备案；或改用境外节点 |
| 家宽上行不足/动态 IP | 中 | 首访慢、隧道断 | WireGuard + keepalive；测上行；必要时图片走 OSS |
| NAS 根盘写满（余 1.8G） | 高（若误放数据） | 系统异常/套件故障 | 全部绑定 Volume1；Docker 日志限额；监控磁盘 |
| NAS 断电/休眠 | 中 | 服务中断 | 关闭休眠、UPS、开机自启容器 `restart: unless-stopped` |
| 3 Mbps 带宽瓶颈 | 高 | 首次展示体验差 | 图片 WebP/OSS+CDN；静态资源缓存 |
| 单点（NAS） | 中 | 停服 | 每日 `pg_dump` + Snapshot；保留 ECS 侧上一镜像可快速切换 |
| PG 端口误暴露 | 低 | 数据风险 | compose 不映射 PG 端口（默认已做）；ufw 仅放 443/22 |

## 9. 决策记录（2026-11-04 用户确认）

| # | 问题 | 结论 |
| ---- | ---- | ---- |
| Q1 | ICP 备案 | ✅ **已完成**：`yanyucloud.net` 豫ICP备2025106952号-11（80/443 可放行） |
| Q2 | NAS 7×24 | ✅ **千兆专用线路，不休眠**（上行不再按家宽保守估计；图片仍建议压缩） |
| Q5 | 数据库 | ✅ **NAS 容器 PG15**（`postgres:15-alpine`，与开发/本地一致） |
| Q3 | 隧道选型 | ⏳ 待定（WireGuard 推荐 / frp / CF Tunnel） |
| Q4 | 图片 OSS+CDN | ⏳ 待定（千兆上行下可先 WebP 本地化，暂缓 OSS） |
| Q6 | `homepage` 域名 | ⏳ 待定（建议上线时改为 `https://baby.yanyucloud.net`） |
| — | **ECS 实例选型** | ⏳ **用户决策中**（已锁定阿里云 ECS；按 §10 选型指引） |

> 备案完成 + NAS 千兆后，§8 风险矩阵中「备案拦截」「家宽上行不足」两项降级为低风险。

## 10. ECS 选型指引（供决策，2026-11-04）

> 目标形态：**方案 B（NAS 跑应用+PG，ECS 仅做 TLS+反代+WireGuard）**。该角色下 ECS 负载极低（Caddy ~40MB、转发 3 Mbps），**不必为应用升配**。

| 角色 | 推荐规格 | 月成本量级 | 说明 |
| ---- | ---- | ---- | ---- |
| **B 方案入口（推荐）** | 现有 2C2G / 40G ESSD Entry / 3 Mbps **够用** | 现有 | Caddy+WG 常驻 <100MB；瓶颈仅公网带宽，展示场景可接受 |
| 若坚持 A 方案（全 ECS） | **2C4G** 起步 + 带宽按量/≥5 Mbps | ↑ | 2G 跑应用+PG+构建不可行；且需在 CI 构建 |
| 带宽优先升级项 | 3→5 Mbps 固定 或 按流量计费 | 低 | 首访体验主要受此影响，而非 CPU/内存 |

**决策建议**：保留现有实例承担入口角色（零额外成本）；预算若允许，仅升带宽到 5 Mbps。
升配操作（同规格族内）可在控制台「变更实例规格」热完成，不影响本方案任何配置。

## 11. 我的建议（一句话）

**按方案 B 落地**：NAS（千兆 7×24）跑应用与 PG15 容器，ECS 只做 TLS+反代（推荐 WireGuard 连接）；
备案已完成，选型确认后即可执行 §7 Runbook；上线门禁用 §7.3 两条命令。
