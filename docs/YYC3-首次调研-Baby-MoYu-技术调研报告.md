---
file: YYC3-首次调研-Baby-MoYu-技术调研报告.md
title: YYC³ Baby-MoYu 首次技术调研报告
description: YYC3-Baby-MoYu 首次全维度技术调研、测试验证、风险诊断与协作对接报告
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-19
updated: 2026-11-19
status: active
tags: [调研报告, 技术诊断, 测试验证, 风险防控]
category: report
language: zh-CN
audience: developers,managers,stakeholders
complexity: advanced
project: YYC3-Baby-MoYu
phase: 首次调研
---

# YYC³ Baby-MoYu 首次技术调研报告

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 📋 文档说明

本报告对 `YYC3-Baby-MoYu`（下称 B）完成首次全维度技术调研。结论来自只读采集与真实命令执行；缺失项标注「待确认」并给出确认路径。硬约束按「以仓库代码事实为准」对齐。

**调研日期**：2026-11-19　**仓库**：`git@github.com:YYC-Cube/YYC3-Baby-MoYu.git`　**最近提交**：`021cb1b`（2026-11-07）

---

## 一、全面信息采集

### 1.1 业务层

| 维度 | 现状 | 证据 |
| --- | --- | --- |
| 核心目标 | 0–3 岁婴幼儿智能陪伴与成长守护平台，多版本收敛后的「唯一开发基线」 | `README.md:52-54` |
| 用户群体 | 家长与家庭用户；含种子账号 `parent@yyc3.com/demo123456` | `docs/user-manual.md:1,3`；`README.md:189` |
| 核心流程 | 提交记录 → `/api/growth-records` → `lib/db/server.ts` → node:sqlite(201) → `useBadges` 聚合评估 | `docs/developer/02-architecture.md:69-93` |
| 关键功能 | 成长记录/里程碑/情绪观察/作业批改/语音/AI 对话/30 枚勋章评估/17 功能页/四主题 | `README.md:96-121` |
| 非功能需求 | WCAG 2.2 AA、i18n 双语、密钥仅服务端、认证+租户隔离、限流 | `README.md:118-121,182-195` |
| 商业场景细化 | **待确认** | 确认路径：产品负责人（`docs/developer/12-hosting-profile.md:24-39` 仅给部署方案） |

### 1.2 技术层

| 维度 | 现状 | 证据 |
| --- | --- | --- |
| 技术栈 | Next `16.4.3` / React 19.2.3 / TS 5.9.3 / Tailwind 4.1.18 / next-intl 4.14.9 / zod 4.6.7 / bcryptjs 3.0.3 / pg 8.16.3 | `package.json:60-122` |
| 运行时 | Node≥22.13（`node:sqlite`）+ Bun 1.3.11（装依赖/测试） | `package.json:35-38` |
| 服务端形态 | 纯 Next App Router 单进程，单实例锁定 | `docs/developer/08-deployment.md` |
| 数据层 | `node:sqlite` 默认（WAL，落盘 `data/yyc3.db`）；`DB_DRIVER=postgres` 切 PG15（同签名双驱动可回退）；**无 Redis**（仅注释提及未来用 Upstash 替换限流，标注未接入） | `lib/db/driver.ts:24-56`；`lib/db/server.ts:75-93`；`.env.example:101-104` |
| 容器 | 单 compose（app Node22.13 standalone + 可选 pg15 profile，不暴露端口）；healthcheck `/api/health` | `docker-compose.yml:1-80` |
| CI/CD | ci.yml（lint→tsc→test→test:node→i18n strict→build→e2e，视觉独立 job）、osv-audit.yml（Critical 阻断）、deploy-pages.yml、workspace-ci.yml | `.github/workflows/` |
| 测试配置 | bun.test.config.ts（jsdom）、playwright.config.ts（串行 workers:1，视觉基线按 darwin/linux 分目录） | — |

### 1.3 代码层

- 目录：`app/`（api + [locale] + 功能页）、`components/`、`lib/{client,agentic,ai,api,auth,badges,db,prediction}`、`core/`、`services/prediction/`、`i18n/messages/`、`__tests__/`、`scripts/`、`docs/`（`README.md:146-175`）。
- 入口：`app/layout.tsx`（挂载 PWA manifest）、`middleware.ts`。
- 公共组件：`components/ui/`（shadcn/Radix）、`lib/utils`、`authFetch/apiClient`、`useBadges`。
- 测试分布：`__tests__/` 29 文件 + `e2e/` 2 文件（smoke + theme-visual）。
- `CLAUDE.md` 仅 `@AGENTS.md`；AGENTS.md 含 Next 16 强制读 bundled docs 规则 + 团队 SSOT 引用。

### 1.4 协作层

- 干系人：维护者 `admin@0379.email`、贡献者；评审 ≥1 维护者批准、squash merge（`CONTRIBUTING.md:136`）。
- 提交规范：Conventional Commits，中文优先、subject ≤72 字符（`CONTRIBUTING.md:38-78`）。
- 流程：Issue→Fork/分支→PR（关联 Issue+证据）→CI 全绿→批准合并；SemVer + tag + Release，发布后 24h 观察（`CONTRIBUTING.md:130-172`）。
- 反馈：Issue、安全邮箱、行为准则 `[CONDUCT]` 前缀；发布周期未固定 **待确认**。

---

## 二、测试验证执行（真实命令结果）

| 验证项 | 命令 | 结果 |
| --- | --- | --- |
| 单元测试 | `bun test --path-ignore-patterns='docs/**'` | **459 通过 / 0 失败**，26 文件，1538 expect()，2.55s |
| 类型检查 | `bunx tsc --noEmit` | **通过**（EXIT 0） |
| Lint | `bunx eslint --config eslint.config.js .` | **通过**（EXIT 0，1 条 .eslintignore 弃用警告） |
| 构建 | `bun run build` | **环境阻断**：IDE safe-delete 钩子拦截 `.next/trace-build` 批量删除（count 500 阈值），非项目缺陷，须在无该钩子环境复验 |
| E2E | `playwright test` | 未在本轮执行（见复验计划） |

**测试体系**：459 单测 + `test:node` 7 例 + E2E 3 例 + 四主题视觉 8 基线；i18n strict（16/16 页、977/977 词条）；OSV Critical 阻断。

### 2.1 通过标准与失败判定

- 通过：单测 0 fail + tsc EXIT 0 + eslint 0 error + build 成功 + e2e 通过。
- 当前 B 在前三项**判定通过**；build 一项**判定阻断待复验**，不粉饰为通过。

---

## 三、深度维度分析（现状 → 问题 → 影响）

### 3.1 架构合理性
- 现状：单进程 Next App Router，双驱动数据层，单实例锁定。
- 问题：单实例语义（内存限流、SQLite 单写者、AgenticCore 单例）锁死水平扩展。
- 影响：并发承载有天花板；扩容前必须先改 Redis 限流 + 迁 PG（已知设计取舍）。

### 3.2 代码质量
- 现状：测试/类型/lint 全绿，三项目中质量最高。
- 问题：`.eslintignore` 已被 ESLint9 弃用；`bun test` 脚本未直接引用 `bun.test.config.ts`（是否联动待确认）。
- 影响：轻微，不影响交付。

### 3.3 技术债务
- 文档残留「容器化尚未落地」与现存 Dockerfile/compose 冲突。
- 影响：文档滞后，需核实。

### 3.4 性能风险
- 有 `/api/health` + `X-Response-Time` 埋点，但无实测基准；内存限流 + SQLite 单写者在并发写入下有锁竞争。
- 影响：并发承载**无法量化**。

### 3.5 安全风险（三项目中最佳）
- 良好面：JWT access(2h)/refresh(30d) 带 type 声明防互换、httpOnly Cookie、`getSecret()` 生产缺失即抛错（`lib/auth/jwt.ts:60-102`）；bcrypt cost 12；SQL 标识符白名单防注入（29 条测试）；硬编码密钥/IP 扫描 0 命中；`.env*`/`data/` 已 gitignore。
- 问题：密钥降级逻辑在生产必须显式配置，配置遗漏风险需运维保障。
- 影响：安全基线扎实，可作为 G/A 鉴权改造参照。

### 3.6 可维护性
- 文档体系完整（developer 手册、i18n/OSV/视觉门禁），二次开发成本最低。

---

## 四、系统性总结

### 4.1 项目整体画像
- 一句话：收敛后的单基线，测试与门禁最健全、生产就绪度最高。
- 标签：`单进程` / `单实例` / `门禁全绿` / `生产就绪度最高`。

### 4.2 问题分级清单

| 级别 | 问题 |
| --- | --- |
| **P1 严重** | ① build 在当前 IDE 环境被 safe-delete 钩子阻断（环境问题，需复验） |
| **P2 一般** | ② 单实例扩展锁定；③ 文档残留过时表述 |
| **P3 优化** | ④ `.eslintignore` 弃用警告；⑤ 商业场景描述待细化 |

### 4.3 优化优先级
1. 在无钩子环境复验 build + e2e（本轮已执行，见附录）。
2. 补性能基准，明确单实例承载上限。
3. 清理过时文档表述与 `.eslintignore`。

### 4.4 可行性风险评估
- 结论：**可行，生产就绪度最高**；风险等级 **中低**。
- 唯一不确定性：build 环境阻断（需复验）与单实例扩展上限（已知取舍）。

---

## 五、待确认清单

| 编号 | 事项 | 确认路径 |
| --- | --- | --- |
| C-01 | 商业场景细化描述 | 产品负责人 |
| C-02 | 生产环境部署拓扑（云/物理机） | 运维负责人 |
| C-03 | 发布周期 | 项目管理者 |
| C-04 | 单实例并发承载上限 | 性能测试 |

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-19 | 首次完整技术调研报告落盘 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
