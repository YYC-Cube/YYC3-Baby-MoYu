# 05 · 前端组件体系

## 目录组织（components/ 20 个域目录）

| 目录 | 职责 |
| ------ | ------ |
| `ui/` | shadcn/ui 基础件 65+（Button/Card/Dialog/Form/Tabs…），Radix 无障碍基座 |
| `ui/character-themed/` | 角色主题组件族（Input/Container/Alert），消费 `components/CharacterThemeContext` |
| `headers/` `common/` | 页面头（PageHeader）、通用件（LanguageSwitcher 等） |
| `growth/` | 成长域：仪表盘、时间线、图表、里程碑庆祝、智能相册 |
| `homework/` | 作业域：SmartHomeworkHelper（拍照批改+语音答题） |
| `emotion/` | EmotionMonitor 情绪监测面板 |
| `analytics/` | 指标总览、实时活动流、WebSocket 连接 |
| `prediction/` | 预测仪表盘、实时监控、智能配置面板 |
| `ai-xiaoyu/` `ai-widget/` | AI 小语浮窗（FixedAIWidget）与可拖拽智能浮窗（AgenticCore 驱动） |
| `auth/` | LoginModal、UserCenter |
| `accessibility/` `pwa/` | 无障碍面板、PWA 提示 |
| `theme/` | 生日主题族（Countdown/WishForm/Decorations） |
| `books/` `courses/` | 绘本与课程域 |
| `optimization/` `performance/` `deployment/` `testing/` | 懒加载封装、性能面板、部署向导、系统测试套件 |

## 状态管理分层

```mermaid
flowchart LR
    L["本地状态 useState<br/>（表单/弹窗）"] --- H["领域 Hooks<br/>useChildren · useBadges · useAIChat…"]
    H --- C["AuthProvider Context<br/>useAuth（登录态/用户信息）"]
    C --> F["authFetch / apiClient<br/>自动凭据 + 401→刷新→重试"]
    F --> API["fetch → /api/*（httpOnly Cookie）"]
```

选型规则：**能 useState 不上 Hook，能 Hook 不上全局 Context；服务端数据一律走 authFetch/apiClient**。
（原 Redux Toolkit / TanStack Query / SWR 已于 2026-08 架构收敛中移除——实际消费面只剩单一选择器与零星缓存，维护成本大于收益。）

## 徽章系统（本次完善后的标准范式）

新功能推荐参照徽章系统的四层结构：

```
types/badges.ts          类型（数据形状与展示元数据）
lib/badges/definitions   领域定义（30 枚勋章 = 纯数据 + 纯函数）
lib/badges/engine.ts     评估引擎（computeStats / evaluateAll 纯函数，100% 可单测）
hooks/useBadges.ts       数据接入（fetch 聚合 + localStorage 持久化 + 新解锁通知）
app/badges/page.tsx      纯展示（筛选/网格/详情弹窗/分享）
__tests__/lib/badges.test.ts  17 个用例锁行为
```

要点：定义与引擎零副作用、页面零业务逻辑、解锁状态跨会话持久化（`yyc3_badge_unlocks_v1`）。

## 主题与角色系统

### 统一主题系统（四主题 · data-theme）

`components/theme-system/` 提供基于 next-themes 的四主题机制：

| 主题 | data-theme | 类型 | 特征 |
| ---- | ---- | ---- | ---- |
| 暖阳 | `default` | 浅色 | 琥珀色系，默认 |
| 赛博霓虹 | `cyberpunk` | 暗色 | 霓虹青 `#00f0ff` |
| 液态翡翠 | `liquid` | 浅色 | 翡翠青绿 `#10b981` |
| 极光 | `aurora` | 暗色 | 极光流动，`#00ff87`（动效见 `styles/aurora-effects.css`） |

- `ThemeSystemProvider`（`attribute="data-theme"`）已在 `app/layout.tsx` 挂载；`ThemeSwitcher` 四选一胶囊；`ThemeBackgroundLayer` 按主题渲染增强背景
- token 双层：兄弟 token（`--bg-app/--fg-default/--theme-accent`）+ shadcn 语义 token（`--background/--primary/--ring` 等，暗色主题全量覆盖）
- **`@custom-variant dark` 已扩展**：`dark:` 变体在 `.dark`、`[data-theme='cyberpunk']`、`[data-theme='aurora']` 下均生效，shadcn 组件暗色适配自动工作

### 语义类规范（Phase 3 · 组件三元表达式渐进 token 化）

新组件优先使用语义类（四主题自适应），旧组件按页渐进迁移：

| 语义类 | 映射 | 用途 |
| ---- | ---- | ---- |
| `text-adaptive` | `var(--fg-default)` | 正文/标题文字 |
| `text-adaptive-muted` | `var(--fg-muted)` | 次要文字/说明 |
| `bg-surface` | `var(--bg-surface)` | 卡片/容器表面 |
| `bg-surface-soft` | `var(--bg-surface-soft)` | 弱化表面/输入框 |
| `border-soft` | `var(--border-soft)` | 柔和边框 |
| `text-theme-accent` | `var(--theme-accent)` | 主题强调文字 |
| `bg-theme-accent` | `var(--theme-accent)` + `--theme-accent-fg` | 主题强调按钮 |

**迁移原则**：`isDark ? 'text-white' : 'text-gray-800'` 类三元 → `text-adaptive`；`bg-white dark:bg-gray-800` → `bg-surface`；`border-gray-200 dark:border-gray-700` → `border-soft`。
**透明度约束**：语义类为实色类，**不支持 `/opacity` 修饰**（如 `bg-surface/80` 无效）。透明/毛玻璃场景使用 `bg-white/80 dark:bg-gray-800/80` 组合（`dark:` 已映射 data-theme）。

### 角色系统

- `components/CharacterThemeContext`（reducer 型）提供 currentCharacter / themeColors / 表情切换 Hooks
- `themes/` 存三套 Figma 主题参考（cyberpunk/default/liquid）——**未接线**，接线时需补齐其内部相对导入（`../foundation/*` 等），已排除出 tsc
- 全局 Tailwind 4（`app/globals.css`），无暗色模式切换时使用 `next-themes` 可直接挂接

## 动画

framer-motion 12：页面级 `AnimatePresence` 过渡、卡片 `whileHover` 微交互、徽章解锁 `animate-pulse` NEW 标记。列表动画 delay 按 `index * 0.03s` 封顶防长列表卡顿。
