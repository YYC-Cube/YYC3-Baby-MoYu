# 11 · 国际化（i18n）边界与治理

> 结论先行：本项目**不是全站双语**。当前是「中文主应用 + 英文镜像试点」，
> 任何对外表述都必须按本文口径，避免把试点说成全量国际化。

## 1. 现状（以构建产物与源码为准，2026-11-04 复核）

| 项 | 事实 |
| ---- | ---- |
| 方案 | `next-intl` v4（仅此一套，**不引入第二套 i18n 运行时**） |
| 默认语言 | `zh`（无前缀，根路由 `/`、`/growth`…） |
| 英文路由 | `/en`、`/en/growth`、`/en/ai-chat`、`/en/homework`（**4 条**，含首页共 4/15=27%） |
| 文案规模 | zh/en **254/254** 扁平键一致（home+header+growth+homework+navigation 已接线） |
| Provider | 根布局注入 zh Provider（2026-11-04，P0）；`/en\|/zh` 由 `app/[locale]/layout.tsx` 内层 Provider 覆盖 |
| 文案源 | `messages/zh.json`、`messages/en.json`（13 命名空间，扁平键 173/173 一致） |
| 路由策略 | `middleware.ts`：仅 `/en`、`/zh` 前缀交 next-intl；其余直通根路由（防全站被重写导致 404） |

### ⚠️ 诚实口径：路由覆盖 ≠ 词条化覆盖

2026-11-04 复核发现：`/en`、`/en/growth`、`/en/ai-chat` 三个镜像页是**硬编码中文副本**
（`useTranslations` 被注释、文案写死中文）——此前「英文试点 2/14」实为**假覆盖**。

| 页面 | 路由存在 | 真词条化（双语） |
| ---- | ---- | ---- |
| `/en/homework` | ✅ | ✅ 单组件复用，zh 逐字不变 |
| `/en`（首页） | ✅ | ✅ **P1**：app/page.tsx + HomeHeader 全量词条化（home/header 命名空间） |
| `/en/growth` | ✅ | ✅ **P1**：47 处替换（Tab/统计/提醒/里程碑/记录/评估/AI洞察）；子组件内部示例文案仍中文（P2） |
| 底部导航 `Navigation` | — | ✅ 全站生效（8 项全部走 `navigation.tab*` 词条） |
| `/en/ai-chat` | ✅ | ❌ 中文硬编码副本，待 P2 重构为同款「单组件复用」模式 |
| 其余 12 个子页 | ❌ | ❌ |

> 技术注记：根布局 zh Provider 会把 `messages/zh.json`（约 7 KB）序列化进 RSC payload，
> 因此 `/en` 页面 HTML 的 `<script>` 中会出现中文串——属词条对象而非可见文本（已实测剥离 script 后无残留）。
> 如需消除，可将根 Provider 改为按路由组拆分布局，代价是层级复杂化，暂不做。

## 2. 关于 `@yyc3/i18n-core`

该包在 npm 存在（`3.0.2`），但 `peerDependencies` 为 **`lit@^3`**（Lit Web Component 体系），
与本项目的 Next.js/App Router + next-intl 组合不兼容：引入会带来第二套运行时、Lit 依赖与
SSR 水合风险，且无法复用现有 `messages/*.json` 与 middleware 策略。

**结论：不引入。** 若未来需要跨框架共享词条，建议只抽取「词条包」（纯 JSON/TS 常量），
而不是引入框架级运行时。

## 3. 边界治理（当前做法）

1. **词条键一致**：`messages/zh.json` 与 `en.json` 的键集合必须相同（缺失键会导致运行期回退到 key）；`check:i18n` 已校验（当前 173/173）。
2. **页面覆盖率可见**：`bun run check:i18n` 输出覆盖率与缺失清单（首页已计入）；⚠️ 仅统计路由存在，词条化需按 §1 诚实口径单独核对。
3. **镜像页必须用「单组件复用」**（P1 起的强约定）：`app/[locale]/<page>/page.tsx` 一律 re-export 根组件，**禁止复制页面代码**——既有三个副本页即为反例教训。
4. **未翻译入口不暴露**：导航/首页仅链接中文路由；`/en` 仅放已翻译页面。
5. **新增页面流程**：先完成中文（用 `useTranslations`）→ 补 `messages` 两语言键 → 建 `app/[locale]/<page>/page.tsx` re-export → 更新本文覆盖表。

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

**进度（2026-11-04，PR #25 合并后）**：**P0–P4 全部完成 ✅（i18n 全局闭环达成）**——**英文镜像 16/16（100%）**，词条 **977/977** 一致。
- P4 三项收口实测：① formatter——新增 `lib/i18n/format.ts`（localeTag/formatDateByLocale/formatTimeByLocale），收敛 7 处 toLocale* 散布（顺带修复 interactions en 镜像下日期硬编码 zh-CN 的缺陷）；② hreflang——根 layout alternates.languages 三条（zh-CN/en/x-default），curl 实测 head 输出正确；③ `check:i18n:strict` 入 CI quality-gates（阻断级，exit 1），本机实测 exit 0。
- 有意保留：EmailNotification zh 邮件模板（服务端内容层）、VideoGenerator 配音 language:"zh-CN"（数据参数）。
- 内容数据层残留（上线后迭代项）：时间线示例 25 处、书籍 mock、`BOOK_CATEGORY_CONFIG`/`lib/growth_stages` 数据本体、console 日志 2 处 + 默认参数 3 处（非 UI）、品牌 Header。实测数值见 `docs/YYC3-Baby-MoYu-fullaudit-20261102/06-全维度测试实测数值总结-20261104.md`。**不虚假宣称「内容 100%」。**

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-11-02 | 新建本文 + `check:i18n` 脚本 | 起因：调研发现「全站双语」表述与覆盖不符；并评估 `@yyc3/i18n-core` 不适用 |
| 2026-11-04（P1） | **首页+growth 真双语** | 首页 12 组文案 + HomeHeader（header 命名空间、日期按 locale）+ growth 47 处替换全走词条；两个镜像副本删除改 re-export（-694/+320 行）；messages 至 254/254；e2e 11/11 基线未重生成即过 |
| 2026-11-04 | **P0 落地 + 诚实口径修正** | ① 根布局注入 zh Provider（根页面可 `useTranslations`）；② `Navigation` 8 项全部词条化（zh 逐字不变，视觉基线/e2e 不受影响）；③ `homework` 成为首个真双语页（单组件复用 + `/en/homework`）；④ 复核发现既有 3 个镜像为硬编码中文副本（假覆盖），已如实标注；⑤ 覆盖口径改为含首页：4/15=27%（词条化真实值：1 页 + 全局导航） |
| 2026-11-04（P2 首批，PR #20） | **ai-chat/settings/children/badges 真双语** | ai-chat 角色/建议/降级文案全词条（`ai.roles.*` 6 角色×6 键）；settings 21 处、children 26 处（年龄单位词条）、badges 30 处；+4 镜像；messages 402/402 |
| 2026-11-04（P2 次批，PR #21） | **courses/books/messages/activities 真双语** | courses 课程/分类改稳定 id（`categoryColors` 修复英文按中文科名失配隐患）；books 分类名词条化（zh 与数据层逐字一致）；messages 用 `messageCenter` 命名空间避开目录名；activities `icon.includes("plant")` 隐性匹配改显式 `theme` 字段、history Tab "(5)" 保基线标 TODO(P3)；+4 镜像；messages 481/481；tsc/lint 0 错误、单测 266 pass、e2e+视觉 11 pass、双语运行时抽查通过 |
| 2026-11-04（P2 收口，PR #22） | **videos/ai-creative/interactions/curriculum/schedule 真双语（P2 全部完成）** | 5 大页全词条 + VideoPlayer aria-label + BackButton 默认"返回"走 common.back；curriculum 22 学科/星期/课程类型映射（option value 保数据层中文键）；修复 TIME_SLOTS.map((t)) 遮蔽隐患；+5 镜像 → **16/16（100%）**；词条 716/716；受保护页带 Cookie 复验口径确立（PROTECTED_PAGES 会话门禁 307 属既有设计）；全部门禁绿 |
| 2026-11-04（P3 主项，PR #23） | **30 枚勋章/VideoGenerator/GrowthTimeline 数据层词条化 + 全维度实测文档** | types/badges 增 4 个 i18n 字段（titleKey/descriptionKey/condKeys/progressGoal），30 勋章+12 复合条件+4 等级+8 分类入词条，badges 页 9 处消费点改词条渲染（计数型条件 progress 反推动态模板）；VideoGenerator 63 处全词条；GrowthTimeline 骨架 8 组；videos 风格标签/BookReader 收尾；**新增 06 号实测数值总结文档（7/7 门禁 + Playwright 双语 6/6 FOUND 双向验证 + 诚实残留清单）**；词条 **873/873**；单测 266 pass、coverage lines 59.15%（如实呈报）、e2e 11 pass |
| 2026-11-04（P3.5，PR #24） | **growth 7 弹层组件 UI 骨架 86 处全部清零** | CreateRecordModal 23（情绪 6 值词条化）/GrowthCharts 22（雷达 SVG 标签改全名，替代 slice 截断）/TagSelector 18（16 预设标签键化）/DevelopmentCurveChart 11/AssessmentReport 12（评估日期按 locale）/StageIndicator 12（`lib/growth_stages` 阶段数据按内容层归档）/MediaUploader 3；残留如实登记：console 日志 2 + 默认参数 3（非 UI）；词条 **977/977**；Playwright SSR 直出确认 StageIndicator/DevelopmentCurveChart 双语渲染 + CreateRecordModal 交互 3/4 命中（缺项为 AI 建议条件渲染区）；全部门禁绿 |
| 2026-11-04（P4，PR #25） | **formatter + hreflang + strict CI（i18n 全局闭环达成）** | ① 新增 `lib/i18n/format.ts`，收敛 7 处 toLocale* 散布（videos 保 month:short 原样式；修复 interactions en 镜像日期硬编码 zh-CN 缺陷；EmailNotification/配音参数/shadcn ui 有意保留并登记）；② 根 layout `alternates.languages` 三条 hreflang（zh-CN/en/x-default），curl 实测 head 输出正确；③ CI quality-gates 新增 `check:i18n:strict` 阻断步骤（本机实测 exit 0，PR #25 CI 双绿）；Playwright 实测 HomeHeader 日期 en/zh 双格式正确。**P0–P4 全部完成，闭环达成** |
