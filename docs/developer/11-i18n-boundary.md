# 11 · 国际化（i18n）边界与治理

> 结论先行：本项目**不是全站双语**。当前是「中文主应用 + 英文镜像试点」，
> 任何对外表述都必须按本文口径，避免把试点说成全量国际化。

## 1. 现状（以构建产物为准）

| 项 | 事实 |
| ---- | ---- |
| 方案 | `next-intl` v4（仅此一套，**不引入第二套 i18n 运行时**） |
| 默认语言 | `zh`（无前缀，根路由 `/`、`/growth`…） |
| 英文路由 | `/en`、`/en/growth`、`/en/ai-chat`（**3 条**） |
| 未覆盖 | `/children`、`/homework`、`/badges`、`/books`、`/videos`、`/courses`、`/curriculum`、`/schedule`、`/interactions`、`/activities`、`/messages`、`/settings`、`/ai-creative` 等（访问 `/en/<未覆盖>` 返回 404，属预期） |
| 文案源 | `messages/zh.json`、`messages/en.json`（键集合需保持一致） |
| 路由策略 | `middleware.ts`：仅 `/en`、`/zh` 前缀交 next-intl；其余直通根路由（防全站被重写导致 404） |

## 2. 关于 `@yyc3/i18n-core`

该包在 npm 存在（`3.0.2`），但 `peerDependencies` 为 **`lit@^3`**（Lit Web Component 体系），
与本项目的 Next.js/App Router + next-intl 组合不兼容：引入会带来第二套运行时、Lit 依赖与
SSR 水合风险，且无法复用现有 `messages/*.json` 与 middleware 策略。

**结论：不引入。** 若未来需要跨框架共享词条，建议只抽取「词条包」（纯 JSON/TS 常量），
而不是引入框架级运行时。

## 3. 边界治理（当前做法）

1. **词条键一致**：`messages/zh.json` 与 `en.json` 的键集合必须相同（缺失键会导致运行期回退到 key）。
2. **页面覆盖率可见**：`bun run check:i18n` 扫描 `app/*/page.tsx` 与 `app/[locale]/*/page.tsx`，输出覆盖率与缺失清单（默认不阻断，`--strict` 可在 CI 阻断）。
3. **未翻译入口不暴露**：导航/首页仅链接中文路由；`/en` 仅放已翻译页面，避免「点进去是 404」。
4. **新增页面流程**：先完成中文 → 补 `messages` 键 → 建 `app/[locale]/<page>/page.tsx` → 更新本文覆盖表。

## 4. 完成全量国际化的判定标准

- [ ] `bun run check:i18n` 页面覆盖率 100%（`app/[locale]` 与根页面一一对应）
- [ ] `zh/en` 键集合完全一致，无 key 回退
- [ ] 日期/数字/货币使用 `next-intl` 的 formatter（禁止手写 `toLocaleString` 分歧）
- [ ] 所有用户可见文案（含错误提示、空态、toast）均来自 `messages`
- [ ] 英文路由纳入 e2e（至少 3 条关键流程）
- [ ] 视觉基线补充 `/en` 首页

> 当前仅第 5 项具备基础（`/en` 首页可访问），其余未达标，故对外口径为「英文试点」。

## 6. 全量化排期（Q3 已批准，2026-11-02 起）

> 原则：**先框架、再页面、最后验收**；每阶段结束必须 `bun run check:i18n` 覆盖率上升且 e2e 不回归。

| 阶段 | 范围 | 产出 | 验收 |
| ---- | ---- | ---- | ---- |
| **P0 框架**（0.5 天） | `messages` 分层（common/nav/growth/homework/books/videos/settings…）+ 键命名规范 | `zh/en` 键集合一致（当前 140/140） | `check:i18n` 无缺失键 |
| **P1 高频页**（1 天） | `/`、`/growth`（含评估）、`/homework` | 3 个 `app/[locale]/<page>` 镜像 + 文案抽取 | 覆盖率 5/14；英文页 e2e 冒烟 3 条 |
| **P2 内容页**（1.5 天） | `/books`、`/videos`、`/ai-creative`、`/courses` | 4 个镜像 + 图片 alt/aria 英文 | 覆盖率 9/14 |
| **P3 系统页**（1.5 天） | `/children`、`/badges`、`/curriculum`、`/schedule`、`/interactions`、`/activities`、`/messages`、`/settings` | 8 个镜像 + 表单校验文案 | 覆盖率 **14/14（100%）** |
| **P4 收口**（0.5 天） | 日期/数字 formatter、语言切换持久化、SEO `hreflang` | 全站可切换且刷新保持 | 清单 §4 全勾 |

**页面清单（14 个中文页 → 镜像）**：
`activities`、`ai-creative`、`badges`、`books`、`children`、`courses`、`curriculum`、`growth`、`homework`、
`interactions`、`messages`、`schedule`、`settings`、`videos`（+ 已完成的 `ai-chat`、`growth`）。

**关键约束**
1. 禁止在 JSX 里硬编码第二语言分支（`locale === 'en' ? … : …`），一律走 `messages`；
2. 新增文案必须同时提交 `zh`/`en` 两个键；
3. 翻译质量由产品/领域专家复核（育儿术语不使用机器直译）；
4. 每阶段把 `check:i18n:strict` 纳入 CI（先告警，P4 起阻断）。

**本轮已交付**：边界文档 + 巡检脚本 + 覆盖率基线（2/14 = 14%）。**P1–P4 属后续排期，不在本轮虚假宣称完成。**

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-11-02 | 新建本文 + `check:i18n` 脚本 | 起因：调研发现「全站双语」表述与 3/19 覆盖不符；并评估 `@yyc3/i18n-core` 不适用 |
