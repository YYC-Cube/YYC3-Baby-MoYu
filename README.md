<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <img src="public/yyc3-family.png" alt="YYC³ Family" width="720" />
</p>
<!-- markdownlint-enable MD033 MD041 -->

<h1 align="center">YYC³ 小语智能成长守护系统（统一基线）</h1>

<p align="center">
  <a href="https://github.com/YYC-Cube/YYC3-Baby-MoYu/actions/workflows/ci.yml">
    <img src="https://github.com/YYC-Cube/YYC3-Baby-MoYu/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI" />
  </a>
  <a href="https://github.com/YYC-Cube/YYC3-Baby-MoYu/actions/workflows/deploy-pages.yml">
    <img src="https://github.com/YYC-Cube/YYC3-Baby-MoYu/actions/workflows/deploy-pages.yml/badge.svg?branch=main" alt="Docs Deploy" />
  </a>
  <a href="https://github.com/YYC-Cube/YYC3-Baby-MoYu/actions/workflows/osv-audit.yml">
    <img src="https://github.com/YYC-Cube/YYC3-Baby-MoYu/actions/workflows/osv-audit.yml/badge.svg?branch=main" alt="OSV Audit" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-yellow?logo=open-source-initiative&logoColor=white" alt="MIT License" />
  <img src="https://img.shields.io/badge/release-v1.0.0-0ea5e9" alt="Release v1.0.0" />
  <img src="https://img.shields.io/badge/PRs-welcome-22c55e" alt="PRs welcome" />
  <a href="./SECURITY.md">
    <img src="https://img.shields.io/badge/security-policy-dc2626" alt="Security Policy" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Bun-Test-14151A?logo=bun&logoColor=white" alt="Bun Test" />
  <img src="https://img.shields.io/badge/SQLite-WAL-003B57?logo=sqlite&logoColor=white" alt="SQLite WAL" />
  <img src="https://img.shields.io/badge/next--intl-v4-38BDF8?logo=vercel&logoColor=white" alt="next-intl v4" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-22c55e" alt="build passing" />
  <img src="https://img.shields.io/badge/tests-526%20passed-22c55e" alt="526 tests passed" />
  <img src="https://img.shields.io/badge/type--check-0%20errors-22c55e" alt="0 type errors" />
  <img src="https://img.shields.io/badge/a11y-WCAG%202.2%20AA-0f766e" alt="WCAG 2.2 AA" />
  <img src="https://img.shields.io/badge/%E5%BE%BD%E7%AB%A0-30%20%E6%9E%9A-d946ef?logo=medal&logoColor=white" alt="30 badges" />
</p>

<p align="center">
  <strong>标签 / Keywords</strong><br />
  <code>#Next.js</code> <code>#React</code> <code>#TypeScript</code> <code>#shadcn/ui</code> <code>#Radix UI</code>
  <code>#Tailwind CSS</code> <code>#Bun</code> <code>#SQLite</code> <code>#PostgreSQL</code> <code>#Prometheus</code>
  <code>#AI</code> <code>#Growth Companion</code> <code>#Child Development</code> <code>#Early Childhood</code>
  <code>#Accessibility</code> <code>#WCAG</code> <code>#i18n</code> <code>#Time Series</code> <code>#Open Source</code>
</p>

> YYC³ AI小语智能成长守护系统 — 0-3岁婴幼儿智能陪伴与成长守护平台。
> 本仓库是成长守护体系的**唯一现役主线（SSOT）**：历史上三个同源仓库
> （Companion / AI-Growth-Guardian / Growth-Guardian）已于 2026-11 冻结归档，
> 工程能力经定向吸收并入本仓，谱系与判据见 [docs/谱系收敛总结](./docs/YYC3-谱系收敛-三仓归档执行总结.md)。

## 技术栈

| 层级 | 技术 |
| ------ | ------ |
| 框架 | Next.js 16.4.5（App Router）+ React 19 + TypeScript 5.9 |
| 运行时/包管理 | Node ≥ 22.13（`node:sqlite`）+ Bun（测试）/ npm 兼容 |
| 样式 | Tailwind CSS 4 + shadcn/ui（Radix） |
| 状态 | React state + AuthProvider Context + authFetch/apiClient（认证自动附带与刷新） |
| AI | 三通道：OpenAI 兼容（对话 / 编排 / 评估 / 续写）· BigModel（作业批改 / 语音）· fal.ai（生图）；缺密钥自动降级且前端可感知，密钥仅服务端 |
| 数据 | **SQLite（默认，`node:sqlite` WAL）** 或 **PostgreSQL 15**（`DB_DRIVER=postgres`，同构 schema 可切换/回退） |
| i18n | next-intl v4（zh 默认 / en，`/en` 前缀路由） |

## 快速开始

```bash
# 安装依赖（国内网络必须走镜像）
bun install --registry https://registry.npmmirror.com

# 配置环境变量
cp .env.example .env.local   # 填入 BIGMODEL_API_KEY 等

# 开发（端口 1228）
bun run dev

# 构建 / 生产启动
bun run build && bun run start

# 测试（526 个用例）
bun run test
```

## 数据层

- **真实持久化**：children / growth-records / homework（含 `[id]`）全套 CRUD API 走
  `lib/db/server.ts` → `lib/db/sqlite-client.ts`（`node:sqlite`），数据落盘 `data/yyc3.db`
- 首次访问自动建表并灌入种子数据（示例家庭/作业/课程）
- JSON 列（media_urls/tags 等）由 server 层自动序列化/反序列化
- 外键约束开启，非法引用返回 400 与中文提示
- 重启进程数据不丢失；备份走 `VACUUM INTO`

## 徽章系统

30 枚勋章 × 8 大分类 × 4 个等级，全部基于真实行为数据声明式评估（`lib/badges/`）。

| 等级 | 分值 | 示例勋章 |
| ------ | ------ | ------ |
| 🥉 铜牌 | 10 | 初试啼声 · 好奇目光 · 七日之约 |
| 🥈 银牌 | 30 | 成长档案馆 · 里程碑达人 · 全景记录者 |
| 🥇 金牌 | 80 | 百年纪念册 · 作业终结者 · 多宝家庭 |
| 💎 钻石 | 200 | 时光收藏家 · 一周年之礼 |

- **评估引擎**：`useBadges` 拉取真实记录 → `computeStats()` 聚合 → `evaluateAll()` 逐枚评估（进度 0-100）
- **分类**：成长记录 · 观察记录 · 情绪记录 · 学习成长 · 里程碑 · 作业任务 · 坚持陪伴 · 综合成就
- **可扩展**：新增勋章只需在 `lib/badges/definitions.ts` 加一行工厂函数，页面零改动
  （详见 [贡献指南](./docs/developer/09-contributing.md) 新增徽章指南）

## 可视化交互体系

视觉与交互的单一事实源见 **[10 · 可视化交互体系设计](./docs/developer/10-visual-interaction-system.md)**：

- **设计令牌**：颜色/字体/间距/圆角/阴影全部走语义令牌，组件禁止硬编码色值
- **四主题**：暖阳（默认）/ 液态翡翠 / 赛博霓虹 / 极光，均通过 `data-theme` 覆盖令牌，组件零分支
- **交互状态机**：默认/悬停/聚焦/按下/加载/禁用/错误/成功/空态九态齐备
- **数据可视化**：统一 `components/ui/chart.tsx` + `--chart-1…5` 令牌，图表附文字摘要
- **动效**：仅 `transform/opacity`，尊重 `prefers-reduced-motion`
- **可访问性**：WCAG 2.2 AA，正文对比度 ≥ 4.5:1，键盘全流程可达，axe 0 违规阻断

## 国际化

- `i18n/`（routing/navigation/request）+ `middleware.ts` 为 next-intl v4 标准结构
- `/` 为中文（默认语言无前缀），`/en`、`/en/growth` 等为英文路由
- 文案在 `messages/{zh,en}.json`；`LanguageSwitcher` 组件可直接切换
- 根路由（中文主应用）与 `[locale]` 镜像路由并存，Provider 已注入

## 常用脚本

| 命令 | 作用 |
| ------ | ------ |
| `bun run dev` | Next.js 开发服务器（:1228） |
| `bun run build` / `start` | 生产构建 / 启动 |
| `bun run test` | 单元测试（529 用例，全绿） |
| `bun run test:coverage` | 覆盖率（排除 `docs/**`；夜间 CI 设 90% 门槛） |
| `bun run type-check` | 类型检查（应用代码 **0 错误**，见 [07 · 测试与质量门禁](./docs/developer/07-testing-quality.md)） |
| `bun run lint` / `lint:fix` | ESLint 检查 / 自动修复 |
| `bun run test:e2e` | Playwright 行为链路（7 例：冒烟 3 + prediction/TTS 4） |
| `bun run test:visual` | 四主题视觉回归（首页/视频工坊 × 暖阳/液态/赛博/极光） |
| `bun run test:visual:update` | 重新生成当前平台视觉基线（darwin / linux） |
| `bun run audit:osv` | OSV.dev 依赖审计（Critical 阻断，生成 `osv-results.json`） |
| `bun run audit:osv:high` | OSV 高危观察（不阻断，用于排查） |
| `bun run check:i18n` | i18n 边界巡检（页面覆盖率 + zh/en 词条键一致性；`check:i18n:strict` 可阻断） |
| `bun run gen:metrics-token` | 按环境生成 `/api/metrics` 访问令牌（幂等、0600 权限） |

## 目录结构

```text
├── app/                  # Next.js App Router
│   ├── api/              #   API 路由（AI 代理 + SQLite CRUD）
│   ├── [locale]/         #   国际化路由（en）
│   └── <feature>/        #   功能页面（growth/homework/books/...）
├── components/           # React 组件（ui/ 基础件 + 业务分组 + 角色主题）
├── lib/
│   ├── client/           #   客户端集合持久化适配层（本地缓存 + 服务端同步/迁移）
│   ├── agentic/           #   AgenticCore 服务端单例（经 /api/agentic 调用）
│   ├── ai/               #   AI 引擎（情感/语音/多模态）
│   ├── api/              #   外部 API 客户端（服务端）+ authFetch/ai-guard（客户端认证）
│   ├── auth/             #   JWT/守卫/Cookie 传输
│   ├── badges/           #   徽章定义与评估引擎（30 枚）
│   ├── db/               #   SQLite 数据层（server.ts 为 API 统一入口）
│   └── prediction/       #   预测引擎基座与专项引擎
├── services/prediction/  # 智能预测服务（模型选择/质量监控）
├── core/                 # AgenticCore 自治核心
├── i18n/ messages/       # next-intl 配置与中英文案
├── middleware.ts         # locale 路由中间件
├── hooks/ types/ config/ # 钩子、类型、配置
├── themes/               # Figma 三套主题参考（未接线，排除出 tsc）
├── __tests__/            # 单元测试（529 用例）
├── public/               # 静态资源（icon/manifest/PWA/角色照片/CNAME）
├── scripts/              # 运维脚本（osv-audit / 令牌生成 / 文档生成 / PG 迁移）
├── deploy/monitoring/    # Prometheus 抓取与告警规则（可直接挂载使用）
└── docs/                 # ★ 文档中心（唯一入口见 docs/README.md）
    ├── developer/        #   现行开发文档（12 篇，唯一维护）
    └── YYC3-成长守护-*   #   产品设计基线（全栈内容/角色系统/日志系统）
```

## 容器与探活

- `Dockerfile`（Node 22.13 运行 + Bun 装依赖）与 `docker-compose.yml`（单实例，mount `./data`、`./logs`）
- `GET /api/health`：数据库只读探针，异常返回 503，供容器 healthcheck / K8s 探活

## 安全约定

- **密钥只进服务端**：`BIGMODEL_API_KEY` 为服务端变量；AI 调用一律走 `app/api/ai/*` 代理路由。
  禁止 `NEXT_PUBLIC_` 前缀承载密钥。
- **认证**：JWT（access/refresh 类型声明不可互换）经 **httpOnly Cookie** 传输（Bearer 头兼容），
  SameSite=Lax + Origin 校验防 CSRF；数据 API 一律登录 + 按用户隔离，写操作校验归属；
  AI 路由认证 + 限流（429 带 Retry-After）。生产必须配置 `JWT_SECRET`。
- **演示账号**（种子数据）：`parent@yyc3.com` / `demo123456`。
- `.env*` 已 gitignore；`data/`（SQLite 库文件与开发密钥）同样不入库。
- 安全响应头（CSP / X-Frame-Options / nosniff / Referrer-Policy）配置于 `next.config.mjs`。
- 依赖审计：以 `bun.lock` 为准，接入 **OSV.dev** 审计源（`bun run audit:osv`，CI 定时/PR 扫描，Critical 阻断）；
  已升级 `next`/`zod`/`next-intl` 并通过 `overrides` 收敛 `undici`/`js-yaml`/`moment`/`source-map-js` 等传递依赖。
  `brace-expansion` 4 条 high 通告已随 2026-11-04 升级（1.1.21 / 5.0.12）关闭；
  当前残余仅 `minimatch` 2 条 moderate（修复版 11.0.1 为 ESM-only，待上游 ESLint 工具链升级随链消除，仅构建期非运行时），见 [SECURITY.md](./SECURITY.md)。

## 开发者文档

文档中心见 **[docs/README.md](./docs/README.md)**（唯一入口），现行开发文档套见 **[docs/developer/](./docs/developer/)**：

```mermaid
flowchart LR
    subgraph Entry["入口层"]
        R[README] --> DR[docs/README 文档中心]
        UM[用户使用手册]
    end
    subgraph Dev["developer/ 现行开发文档（唯一维护）"]
        A["01 快速上手"] --> B["02 架构(Mermaid)"]
        B --> C["03 数据模型"] --> D["04 API 参考"]
        B --> E["05 前端组件"] --> F["06 AI 引擎"]
        D --> G["07 测试与质量"] --> H["08 部署"]
        E --> V["10 可视化交互体系"]
        C --> I["11 i18n 边界"]
        H --> J["12 部署承载分析"]
    end
    subgraph Prod["产品设计基线（演进时更新）"]
        P2["全栈内容"] --- P3["角色系统"]
        P3 --- P4["日志系统"]
    end
    subgraph Open["开源协作四件套"]
        L[LICENSE] --- CT[CONTRIBUTING]
        CC[CODE_OF_CONDUCT] --- S[SECURITY]
    end
    DR --> Dev & Prod & Open
```

| 文档 | 内容 |
| ------ | ------ |
| [用户使用手册](./docs/user-manual.md) | 面向家长的产品操作指南（功能地图/隐私/FAQ） |
| [01 · 快速上手](./docs/developer/01-getting-started.md) | 环境要求、安装、启动、常见问题 |
| [02 · 可视化架构体系](./docs/developer/02-architecture.md) | 系统分层 / 混合路由 / 数据流 / AI 链路 / 目录拓扑（Mermaid） |
| [03 · 数据模型](./docs/developer/03-data-model.md) | SQLite 十张表（含客户端集合 `user_documents`）、JSON 列约定、种子数据、备份 |
| [04 · API 参考](./docs/developer/04-api-reference.md) | 全部 REST 端点：请求/响应/错误码约定 |
| [05 · 前端组件体系](./docs/developer/05-frontend.md) | 目录组织、UI 基建、状态管理、主题与角色系统 |
| [06 · AI 引擎与安全](./docs/developer/06-ai-engine.md) | 服务端代理模式、密钥管理、AI 引擎模块清单 |
| [07 · 测试与质量门禁](./docs/developer/07-testing-quality.md) | tsc / lint / test / audit 四道门禁 |
| [08 · 部署](./docs/developer/08-deployment.md) | 本地生产、脚本、Docker 注意事项 |
| [09 · 贡献指南](./docs/developer/09-contributing.md) | 分支模型、提交规范、徽章系统扩展指南 |
| [10 · 可视化交互体系设计](./docs/developer/10-visual-interaction-system.md) | 设计令牌 / 四主题 / 交互状态机 / 数据可视化 / 动效 / WCAG 2.2 AA / 视觉回归 |
| [11 · 国际化边界与治理](./docs/developer/11-i18n-boundary.md) | i18n 全量闭环（16/16 页双语 · 词条 986/986）· `@yyc3/i18n-core` 不适用评估 · 单组件复用强约定 · 残余清单 |
| [12 · 部署承载分析](./docs/developer/12-hosting-profile.md) | 本机/单机/托管三方案对比 · 环境与反代/PG/备份配置清单 · 上线验收项 |
| [运维 Runbook](./docs/YYC3-运维Runbook-Prometheus部署与密钥轮换.md) | ★ Prometheus 实例部署六步（三形态+排障表）· 六类密钥轮换（影响面/回滚/清单）· 快速命令卡 |
| [交接文档](./docs/YYC3-交接文档-项目衔接与接手说明.md) | ★ 接手第一入口：五分钟上手 · 基线快照 · 交付清单 · 决策理由 · 待办优先级 · 坑位表 |

## 开源协作

| 文档 | 内容 |
| ------ | ------ |
| [LICENSE](./LICENSE) | MIT 许可证（允许商用、修改、分发，须保留版权与许可声明） |
| [CONTRIBUTING](./CONTRIBUTING.md) | 分支模型、提交规范、质量门禁、PR 检查清单、发布流程 |
| [CODE_OF_CONDUCT](./CODE_OF_CONDUCT.md) | Contributor Covenant v2.1（YYC³ 适配版）与执行指南 |
| [SECURITY](./SECURITY.md) | 漏洞报告渠道、响应 SLA、安全范围与安全港条款 |

- **参与方式**：Issue 提需求/报缺陷 → Fork + 分支 → PR（关联 Issue 并附验证证据）→ CI 四绿 → 评审合并。
- **质量门禁**：`bun run type-check`、`bun run lint`、`bun run test`、`bun run build`、`bun run test:e2e`。
- **交流语言**：中文优先，英文可接受；技术讨论以代码与可复现证据为准。
- **安全披露**：请勿在公开 Issue 披露漏洞细节，统一发送至 `admin@0379.email`。

## 当前状态

- ✅ 构建通过，生产冒烟 200（含 `/en` i18n 路由、`/manifest.json`、`/icon.svg`）；本地生产模式 28 项验收全过
- ✅ SQLite 真实持久化（写入 → 重启 → 数据在）；课表/日程/互动/视频经 `/api/user-documents` 跨设备同步（游客自动降级本地）
- ✅ **PostgreSQL 切换演练通过**（2026-11-20）：schema 建表 + 数据迁移（行数一致校验）+ `DB_DRIVER=postgres` 生产模式注册/登录/建娃全链路 + PG 直测 12/12
- ✅ 测试 **526/526** 全绿（含鉴权/越权/限流/预测引擎/Upstash 限流等行为用例）；`test:node` 7/7；E2E 3/3；四主题视觉 8/8；覆盖率 funcs 90.06% / lines 90.33%（夜间 CI 守门）
- ✅ 类型债 1,986 → **0**（`tsc --noEmit` 0 error）；lint **0 error / 0 warning**
- ✅ i18n 全量闭环（P0–P4 完成）：16/16 页真双语、词条 986/986 一致、`check:i18n:strict` 入 CI 阻断、hreflang 三语声明
- ✅ 可观测性：`/api/metrics`（Prometheus 文本 + 三条业务计数器）**应用层令牌门禁**（匿名 401 / 生产未配置 503），配套抓取与告警规则见 `deploy/monitoring/`
- ✅ 限流存储可插拔：默认进程内固定窗口，配置 Upstash 即多副本共享配额（存储异常自动回退内存）
- ✅ AI 悬浮窗水合错配修复（首帧确定性定位 + 挂载后视口校正，Playwright 8 路由 0 错误）
- ✅ 关键依赖安全升级：`next` 16.4.5、`zod` 4.6.7、`next-intl` 4.14.9；OSV 0 Critical / 0 High
- ✅ 四主题视觉回归：8 张基线（首页/视频工坊 × 暖阳/液态/赛博/极光），macOS 与 Linux 分平台
- ✅ 徽章系统：30 枚勋章 × 真实数据评估引擎（`lib/badges/`）
- ✅ 鉴权（JWT 类型声明 + httpOnly Cookie + 限流 + 租户隔离）、Winston 日志体系、语音三件套、四主题系统
- ✅ CI 五件套：quality-gates / visual / smoke（生产冒烟八项 + 指标令牌门禁）/ OSV 周扫 / nightly 覆盖率
- ✅ **谱系收敛**：三个同源仓库已冻结归档，本仓为唯一现役主线（见 [谱系收敛总结](./docs/YYC3-谱系收敛-三仓归档执行总结.md)）
- 📍 后续：P1 告警接线实测（Prometheus 部署）、`eslint-config-next` 跟随 patch、prediction 引擎覆盖率 60%+

---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***
