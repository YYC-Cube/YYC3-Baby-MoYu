# YYC³ Baby-MoYu · 项目交接与接手说明

> 生成日期：2026-11-20 ｜ 最后更新：2026-11-21 ｜ 基线提交：`45738f3`（`main`，工作树干净）
> 用途：新会话 / 新维护者接手时的**唯一入口文档**。读完本文即可知道「现在是什么状态、为什么这样、下一步做什么」。
> 关联：[docs/README](./README.md)（文档中心）｜[全局测评](./YYC3-全局测评-Baby-MoYu-深度测评与演进规划.md)｜[运维 Runbook](./YYC3-运维Runbook-Prometheus部署与密钥轮换.md)｜[谱系收敛](./YYC3-谱系收敛-三仓归档执行总结.md)（§7 为二次复核结论）

---

## 1. 一句话现状

本仓是 YYC³ 成长守护体系**唯一现役主线（SSOT）**：Next.js 16.4.5 单进程应用，六道门禁全绿、529 用例全过、覆盖率 93%+、CI 五工作流在跑；三个同源仓库已冻结归档，且**二次复核确认代码层无可吸收内容**（唯一资产缺口——站点图标/PWA 图标——已补齐）。
**上线只差两项运维动作**：轮换失效的 `BIGMODEL_API_KEY`、为各环境注入 `METRICS_TOKEN`。

---

## 2. 五分钟接手

```bash
# 1) 环境（注意：bun 不在 PATH，需全路径）
export PATH="$HOME/.bun/bin:$PATH"          # 或直接用 ~/.bun/bin/bun
node -v    # ≥ 22.13（node:sqlite 必需）
bun -v     # 1.4.x

# 2) 安装（国内必须走镜像）
bun install --registry https://registry.npmmirror.com

# 3) 配置（本地开发可留空 AI 密钥，功能会诚实降级）
cp .env.example .env.local

# 4) 起服务
bun run dev          # 开发模式 :1228
# 或生产模式验证：
#   bun run build && JWT_SECRET=xxx METRICS_TOKEN=yyy bun run start
```

### 接手后第一件事：跑一遍门禁

```bash
bun run lint              # 期望 0 error / 0 warning
bunx tsc --noEmit         # 期望 0 错误
bun run test              # 期望 529 pass / 0 fail
bun run test:node         # 期望 7/7（node:sqlite 直测）
bun run check:i18n:strict # 期望 镜像 100% · 词条 986/986
bun run audit:osv         # 期望 0 Critical / 0 High（余 1 条 moderate，dev 链）
```

阅读顺序：本文 → [02 架构](./developer/02-architecture.md) → [08 部署](./developer/08-deployment.md) → [运维 Runbook](./YYC3-运维Runbook-Prometheus部署与密钥轮换.md) → [07 门禁](./developer/07-testing-quality.md)。

---

## 3. 当前基线快照（2026-11-21 实测）

| 维度 | 现状 |
| ---- | ---- |
| 分支拓扑 | **仅 `main`**（远程 6 个 Dependabot 分支已全部收敛，本地陈旧分支已清理） |
| 关键版本 | `next 16.4.5` · `react ^19.2.3` · `zod 4.6.7` · `eslint-config-next 16.4.6` |
| 单元测试 | **529 / 529**（32 文件，~2.9s） |
| 覆盖率 | 本地 funcs **93.24%** / lines **93.40%**；CI nightly **94.09% / 93.74%**（门槛 90%） |
| 类型 / Lint | tsc **0** · eslint **0 error / 0 warning** |
| 数据库直测 | SQLite 7/7；PG 12/12（设 `PG_TEST_URL` 后启用） |
| e2e / 视觉 | 7/7（3 个 spec：smoke 3 + prediction/TTS 4）· 8/8（四主题 × 首页/视频工坊） |
| i18n | 镜像路由 100% · 词条 986/986 |
| 依赖安全 | OSV 0 Critical / 0 High；余 1 条 moderate（minimatch@10.2.6，dev 链，已书面跟踪） |
| 静态资产 | `public/icon.svg`（145K）· `public/yyc3-pwa-icon.png`（128K）已就位；冒烟断言校验 **Content-Type + 魔数** |
| CI 工作流 | `ci.yml`（quality-gates / visual / smoke）· `osv-audit.yml` · `nightly.yml` · `deploy-pages.yml` · `yyc3-xy-workspace-ci.yml` |
| 同源仓库 | Companion（`frozen/2026-11`）、AI-Growth-Guardian / Growth-Guardian（`archive/2026-11`），三者 `archived=true`；**二次复核通过，可最终归档** |

---

## 4. 本轮交付清单（按类别，含提交号）

### 4.1 工程能力（P0/P1/P2）

| 能力 | 落点 | 提交 |
| ---- | ---- | ---- |
| 统一模型工厂（双通道密钥 + 占位符过滤） | `lib/ai/model-provider.ts` | `d3a2558` |
| Prometheus 指标端点（默认 + 3 条业务计数器） | `app/api/metrics`、`lib/monitoring/metrics.ts` | `d3a2558` |
| 生产冒烟 CI（八项断言，干净 runner 真实 `next start`） | `.github/workflows/ci.yml` | `d3a2558` / `51678b0` |
| TTS 服务端代理（密钥不出服务端） | `app/api/ai/text-to-speech` | `d3a2558` / `639e4a7` |
| 预测引擎前端可视化（真实数据 + 置信区间） | `app/api/ai/prediction`、`components/growth/GrowthTrendPrediction.tsx` | `5bbee8f` |
| 密钥判定单点（`isRealSecret`：≥20 位且不含 `your`） | `lib/config/secret.ts` | `639e4a7` |
| 指标端点应用层令牌门禁（401/503 语义） | `app/api/metrics/route.ts` | `23ae447` |
| 限流存储可插拔（内存 / Upstash，故障回退） | `lib/rate-limit.ts` | `e97b4de` |
| 预测引擎单测 22 例（行覆盖 24.9%→95.71%） | `__tests__/lib/prediction-engines.test.ts` | `e97b4de` / `e65a169` |
| 夜间覆盖率 CI（90% 门槛 + artifact） | `.github/workflows/nightly.yml` | `e97b4de` |
| e2e prediction/TTS 真实链路 4 例（外推区间+限流 / TTS 503 语义 / 趋势卡片诚实空态） | `e2e/prediction-tts.e2e.ts` | 本次提交 |

### 4.2 运维

| 交付 | 落点 | 提交 |
| ---- | ---- | ---- |
| 按环境生成 `METRICS_TOKEN` 脚本（幂等 / 0600 / `--force` 轮换） | `scripts/generate-metrics-token.mjs` | `a6a9f23` |
| Prometheus 抓取 + 三条告警规则 | `deploy/monitoring/` | `e97b4de` |
| 运维 Runbook（部署六步 + 密钥轮换 + 排障表 + 命令卡） | `docs/YYC3-运维Runbook-*.md` | `46fb749` / `28e41bc` |
| Prometheus **实机验证**（up=1 / 规则 3 条 / TTS 告警 firing / 负向 up=0） | 同上「实测记录」 | `28e41bc` |
| PG 切换演练（迁移行数一致 + 生产模式全链路 + PG 直测 12/12） | 08 文档「部署拓扑约束」 | `e97b4de` |

### 4.3 文档与治理

| 交付 | 说明 | 提交 |
| ---- | ---- | ---- |
| README / docs README 开源级升级 | 双 Mermaid 文档架构图、关键词扩充、徽章基线校正 | `b2179cf` |
| 四件套核查与修正 | LICENSE / CoC / SECURITY 完整；CONTRIBUTING 修正 3 处失实 | `b2179cf` |
| 仓库元数据 | topics 20 个关键词；description 修正「微服务」错误表述 | `b2179cf`（GitHub API） |
| 谱系收敛 + 全局测评落档 | 判据、执行记录、风险登记册、P0–P2 路线 | `185876f` / `ac529fc` |
| 工作区未跟踪项决策 | 2 份调研报告入库；`docs/yyc3-xy/`（23M 工程副本）gitignore | `e65a169` |
| flaky 修复 | 限流时间敏感用例窗口 1ms→50ms（CI 暴露） | `85a88bb` |

### 4.4 谱系收敛终局（2026-11-21）

| 交付 | 说明 | 提交 |
| ---- | ---- | ---- |
| 三仓二次复核 | 文件级 diff + 引用度 + 测试 + 实现质量抽样；独有 API 仅 3 个、lib 为无测试模拟实现、重型后端为骨架 → **代码层无可吸收** | `45738f3` |
| 资产缺口吸收 | `public/icon.svg` + `public/yyc3-pwa-icon.png`（layout.tsx 与 manifest 长期引用但此前不存在） | `45738f3` |
| 冒烟假绿修复 | 静态资产断言改为校验 Content-Type + 魔数（`/icon.svg` 曾返回 200 text/html） | `45738f3` |
| 结论落档 | 谱系收敛总结 §7「二次复核：可吸收内容确认」 | `45738f3` |
| 依赖对齐 | `eslint-config-next` 16.4.5 → 16.4.6（lint 0/0、529/529） | 本次提交 |

---

## 5. 关键决策与理由（为什么不是另一种做法）

| 决策 | 理由 | 被否决的方案 |
| ---- | ---- | ------------ |
| 本仓为唯一主线，三仓归档只读 | 三仓 tsc/lint 红灯、无真实流量、Dependabot 持续失败制造噪声 | 「保留观察」——无收益且误部署风险实存 |
| 依赖升级走**手动管控**，关闭 Dependabot 批量组 PR | 39 项批量升级会扰动刚建立的门禁与冒烟基线；`eslint-config-next` 刻意钉 16.4.5 | 全部合入批量组（#28/#26） |
| `/api/metrics` 加**应用层令牌**而非只靠反代 | 反代是环境相关配置，换环境即失效；应用层 503/401 语义可测、可被 CI 断言 | 仅依赖 Nginx 白名单 |
| 限流存储抽象但**默认仍用内存** | 单实例部署下内存桶最简；Upstash 仅在多副本时启用，且故障回退保证可用性 | 直接强制 Upstash（增加外部依赖与故障面） |
| `JWT_SECRET` 不引入 kid 多密钥 | 单实例、无灰度需求；代价是轮换=全员登出，已在 Runbook 明确公告 | 引入 kid 机制（复杂度不划算） |
| 生产未配 `METRICS_TOKEN` → **503** 而非放行 | 宁可抓取失败也不裸奔进程内存/事件循环信息 | 匿名可读 + 反代限制（原实现） |
| 错误语义分层：503=未配置/凭据无效、502=上游故障、429=限流 | 运维可据此一步判断是换密钥还是查上游 | 一律 500/502（无法归因） |
| 归档前二次复核，只吸收**资产**不吸收代码 | 3 个独有路由均劣于主线；lib 为无测试的模拟实现；后端为骨架。迁入等于质量倒退 | 「能跑就搬」——会把无测试模拟逻辑与无鉴权路由带入主线 |
| 静态资产断言校验 Content-Type + 魔数 | 只断言状态码会被动态路由 200 假绿（`[locale]` 把 `/icon.svg` 当 locale 渲染首页） | 仅 `check 200`（已证明会误报） |
| 6 个 `yyc3-logo` 变体与 4 份产品文档暂不吸收 | 主线零引用；产品内容按「先评审后摘录」单次抽取，归档仓只读仍可查阅 | 全部拷入（增加无引用资产与文档噪音） |

---

## 6. 架构与运行约束（改动前必读）

1. **单实例语义**（三处）：
   - 限流：默认进程内固定窗口；多副本前必须成对配置 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`；
   - SQLite 单写者：多副本需共享挂载 `data/` 或切 PostgreSQL；
   - AgenticCore 服务端单例：状态不跨进程。
2. **密钥边界**：所有密钥仅服务端读取，**禁止** `NEXT_PUBLIC_` 前缀；`.env*` 已 gitignore。
3. **AI 路由统一守卫**：一律经 `guardAIRequest`（认证 + 20/min 限流），不允许裸奔端点。
4. **SQL 安全**：表名与条件键必须过 `assertSQLIdentifier` 白名单。
5. **降级必须诚实**：无密钥时 chat 返回 `demo:true`、TTS 503、生图占位图；不可伪造成功。
6. **覆盖率命令必须带** `--path-ignore-patterns='docs/**'`（用 `bun run test:coverage`），否则会跑到 `docs/` 下归档工程的测试副本，永不收敛。

---

## 7. 待办与优先级

### P0 · 上线前（纯运维动作，无代码改动）

- [ ] 轮换 `BIGMODEL_API_KEY`（**当前密钥已实测失效**，上游 401；症状为 TTS 全量 503）
- [ ] 各环境注入 `METRICS_TOKEN`：`bun run gen:metrics-token -- production --print`
- [ ] 按 [运维 Runbook §一](./YYC3-运维Runbook-Prometheus部署与密钥轮换.md) 部署 Prometheus 实例并复核 `up=1`
- [ ] 容器形态改用 `node .next/standalone/server.js` 启动（`next start` 在 standalone 产物下有已知警告）
- [ ] 验证 `data/yyc3.db` 备份与恢复（`VACUUM INTO` → 停机替换）

### P1 · 一个月

- [ ] 告警接入通知渠道（Alertmanager → 邮件/Slack；当前仅规则与 firing 验证）
- [x] ~~补 e2e：prediction 与 TTS 两条真实交互链路~~ → 已于 2026-11-21 落地（e2e 3 → **7 例**）；顺带修复 2 处用户可见 i18n 缺陷（趋势卡片命名空间、评估图表维度名传已翻译串）
- [x] ~~`eslint-config-next` 跟随 patch~~ → 已于 2026-11-21 升级至 16.4.6（lint 0/0、529/529 复核通过）
- [ ] 覆盖率门禁从「夜间」扩展为「PR 增量提示」（非阻断）

### P2 · 一个季度

- [ ] 限流 Upstash 实网演练（当前仅单测 mock 验证命令序列）
- [ ] 多副本压测 + PG 切回演练（当前 PG 演练为单实例）
- [ ] 预测引擎 30 天回测报告（MAPE / 区间覆盖率），替换「统计外推」的模糊表述
- [ ] 儿童数据访问审计日志（合规）

### 长尾 / 产品侧

- [x] ~~从归档仓抽取产品资产为代码~~ → 已于 2026-11-21 二次复核否决（代码与模拟实现不吸收）；产品文档按需单次摘录（归档仓只读可查）
- [ ] `docs/yyc3-xy/`（23M 工程副本）本地是否保留，按需清理
- [ ] 三仓最终归档确认（内容复核已完成，归档操作由维护者执行）

---

## 8. 常见故障 → 定位入口

| 症状 | 第一步看 | 文档 |
| ---- | -------- | ---- |
| TTS 返回 503 | 上游凭据是否失效（`BIGMODEL_API_KEY`） | [Runbook §二 A](./YYC3-运维Runbook-Prometheus部署与密钥轮换.md) |
| TTS 返回 502 | 上游服务故障（与 503 区分） | 同上 |
| 对话返回 `demo:true` | 未配置模型密钥 | `.env.example` AI 段 |
| `/api/metrics` 匿名 401 | 正常（令牌门禁） | [04 API](./developer/04-api-reference.md) |
| `/api/metrics` 返回 503 | 生产未配 `METRICS_TOKEN` | [Runbook §0](./YYC3-运维Runbook-Prometheus部署与密钥轮换.md) |
| Prometheus `up=0` | 401=令牌不一致；503=应用未配令牌 | Runbook 步骤 6 排障表 |
| 告警不触发 | `for` 时长未满足；或计数只增 1 次（首样本语义） | Runbook 步骤 5 |
| CI 单测偶发失败 | 时间敏感用例（历史 flaky 已修，见 `85a88bb`） | — |
| 覆盖率跑不完 | 未排除 `docs/**` | 用 `bun run test:coverage` |
| PG 连上却报 read-only | 本机 5433 可能是只读副本 | 改用可写实例或临时集群 |
| 未知单段路径返回 200 HTML | `app/[locale]` 动态段把 `/icon.svg` 之类当 locale 渲染首页（静态资产缺失时表现为“假绿”） | 静态资产断言必须校验 Content-Type + 魔数；新增 `public/` 资产前确认文件真实存在 |

---

## 9. 环境与工具链坑位（本机实测）

| 坑 | 现象 | 解法 |
| ---- | ---- | ---- |
| bun 不在 PATH | `bun: command not found` | 用 `~/.bun/bin/bun` 或加入 PATH |
| npm 直连慢/失败 | install 卡住 | `--registry https://registry.npmmirror.com` |
| `gh repo edit --archived` | 报 `unknown flag` | 改 `gh api -X PATCH repos/... -F archived=true` |
| Docker Desktop 未启动 | `dial unix .../docker.sock: no such file` | `open -a Docker`，等约 30s |
| Docker 命名卷 + `--user` | Prometheus `panic: Unable to create mmap-ed active query log` | 改宿主目录绑定挂载 `deploy/monitoring/data` |
| 本机 PG 5433 只读 | `cannot execute CREATE TABLE in a read-only transaction` | 用可写实例；演练可用 `initdb` 临时集群 |
| `promtool check config` | 报 `stat ... metrics_token: no such file` | 先生成令牌文件再校验 |

---

## 10. 文档地图

| 文档 | 用途 |
| ---- | ---- |
| [docs/README](./README.md) | 文档中心（唯一入口，含门禁基线与分类索引） |
| [01 快速上手](./developer/01-getting-started.md) | 环境、安装、启动、常见问题 |
| [02 架构](./developer/02-architecture.md) | 分层 / 混合路由 / 数据流 / AI 链路 / 谱系边界 |
| [03 数据模型](./developer/03-data-model.md) | 十张表、JSON 列、迁移与备份 |
| [04 API 参考](./developer/04-api-reference.md) | 全部端点与错误码；指标端点访问控制 |
| [05 前端](./developer/05-frontend.md) / [10 可视化](./developer/10-visual-interaction-system.md) | 组件体系 / 设计令牌 / 四主题 / WCAG |
| [06 AI 引擎](./developer/06-ai-engine.md) | 三通道、密钥管理、降级语义 |
| [07 测试与质量](./developer/07-testing-quality.md) | 八道门禁与基线数字 |
| [08 部署](./developer/08-deployment.md) | 部署形态、环境变量、拓扑约束、上线清单 |
| [09 贡献](./developer/09-contributing.md) / [11 i18n](./developer/11-i18n-boundary.md) / [12 承载](./developer/12-hosting-profile.md) | 协作 / 国际化 / 承载选型 |
| [**运维 Runbook**](./YYC3-运维Runbook-Prometheus部署与密钥轮换.md) | Prometheus 部署六步 + 密钥轮换 + 排障 |
| [**谱系收敛**](./YYC3-谱系收敛-三仓归档执行总结.md) / [**全局测评**](./YYC3-全局测评-Baby-MoYu-深度测评与演进规划.md) | 三仓归档判据 + **§7 二次复核（可吸收内容确认）** / 风险登记册与路线图 |

---

## 11. 协作约定

- 提交信息中文优先，Conventional Commits；一次提交只做一件事。
- 提交前八道门禁全绿（见 §2），CI 三 job 必须绿。
- 会话执行日志是一次性产物，结论沉淀进 `docs/developer/` 或本目录对应篇章，不新建带日期的日志目录。
- 安全披露、行为准则渠道见 [SECURITY.md](../SECURITY.md)、[CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)。

---

## 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-11-20 | 首版 | 基线 `28e41bc`：门禁 529/529、覆盖率 93%+、CI 五工作流、三仓归档、Prometheus 实机跑通；沉淀决策理由、待办优先级与坑位清单 |
| 2026-11-21 | 承接更新 | 基线推进至 `45738f3`：三仓二次复核完成（代码无可吸收、吸收 2 个图标资产）、冒烟假绿修复（Content-Type + 魔数断言）、交付清单补 §4.4、决策补 3 条、坑位补 1 条；长尾产品资产项按复核结论关闭 |
| 2026-11-21 | 依赖对齐 | `eslint-config-next` 16.4.5 → **16.4.6**（与 next 16.4.5 同系 patch 对齐）；lint 0/0、tsc 0、529/529 复核通过 |
| 2026-11-21 | e2e 补强 | 新增 `e2e/prediction-tts.e2e.ts` 4 例（匿名 401 / 外推区间与免责声明 + 20/min 限流 / TTS 200 或 503 语义 / 趋势卡片诚实空态），e2e 3 → **7**；顺带修复趋势卡片 `useTranslations` 命名空间与评估图表维度名传已翻译串两处缺陷；门禁全绿 |
