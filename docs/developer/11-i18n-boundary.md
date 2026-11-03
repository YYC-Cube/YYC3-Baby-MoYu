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

## 5. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-11-02 | 新建本文 + `check:i18n` 脚本 | 起因：调研发现「全站双语」表述与 3/19 覆盖不符；并评估 `@yyc3/i18n-core` 不适用 |
