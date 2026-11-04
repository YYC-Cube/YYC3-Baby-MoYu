# scripts · 脚本状态说明

> 本目录混有**多轮架构演进**遗留的脚本。当前运行形态是「单进程 `next start` + SQLite」，
> 凡依赖 `docker-compose.yml`、`services/xiaoyu-api/`、`microservices/`、Postgres 的脚本
> **在本仓库无法执行**（那些资产不在仓库内）。执行前请先读本表。

## 现行可用

| 脚本 | 用途 | 依赖 |
| ---- | ---- | ---- |
| `osv-audit.mjs` | OSV.dev 依赖审计（Critical 阻断，产出 `osv-results.json`） | 网络；`bun run audit:osv` |
| `generate-docs.py` | 文档生成 | Python 3 |
| `check-i18n-coverage.mjs` | i18n 边界巡检（页面覆盖率 + zh/en 词条键一致性） | `bun run check:i18n` |
| `migrate-sqlite-to-pg.mjs` | SQLite → PostgreSQL 迁移（自动建表、幂等插入、行数比对） | `bun run db:migrate:pg` |
| `ts-node-hooks.mjs` | `node --experimental-strip-types` 直测钩子 | Node ≥ 22.13 |

## 历史遗留（不可直接执行）

| 脚本 | 失效原因 |
| ---- | ---- |
| `deploy-docker.sh` | 仍为历史遗留：假设 Postgres schema、`.env.docker` 与 compose `profiles`，与当前「SQLite + standalone 单实例」不符。**现行容器化请直接用仓库根 `docker compose up -d --build`**（见 08-deployment.md） |
| `deploy-to-production.sh` | 目标路径 `/opt/xiaoyu-guardian/services/xiaoyu-api/*`、Postgres 容器均不存在 |
| `deploy-to-yyc3-33.sh` | 指向外部部署主机，非本仓库产物 |
| `deploy-microservices.sh` | 依赖 `microservices/{kong,consul,postgres}`，本仓库为单体应用 |
| `deploy-local-ai.sh` | 依赖本地 AI 服务栈（未接入） |
| `deploy-knowledge-graph.sh` | 依赖知识图谱服务（未接入） |
| `deploy-data-analytics.sh` | 依赖分析服务（未接入） |
| `database-schema.sql` | 与 `lib/db/sqlite-client.ts` 内的建表 SQL 双份维护，以后者为准 |
| `auto-fix-errors.ts`、`fix-integration-conflicts.ts` | 一次性历史修复工具，不建议再执行 |

## 处置建议（待维护者决策）

1. **删除**：7 个 `deploy-*.sh`（不可执行，误用会浪费时间）；
2. **归档**：移入 `docs/archive/scripts/` 保留追溯；
3. **补实**：若确需容器化，补 `Dockerfile`（`node:22-alpine` 需自行安装 `node:sqlite` 运行环境）
   与 `docker-compose.yml`，并按 `docs/developer/08-deployment.md` 的单实例约束评审。

> 本条为「先标注、后清理」的过渡措施，避免在未获授权时删除历史资产。
