# 07 · 测试与质量门禁

## 四道门禁（提交前应全绿）

```mermaid
flowchart LR
    T["bunx tsc --noEmit<br/>0 错误"] --> L["bun run lint<br/>0 error / 0 warning"] --> B["next build<br/>含类型检查"] --> U["bun run test<br/>459 用例"] --> P["推送 ✅"]
```

| 门禁 | 命令 | 当前基线 |
| ---- | ---- | ---- |
| 类型 | `bun run type-check` | **0 错误**（应用代码；`__tests__/`、`themes/` 排除） |
| Lint | `bun run lint` | **0 error / 0 warning**（2026-11-05 清零；语义等价改写优先，合法惯用法注释豁免） |
| 构建 | `bun run build` | 通过（类型门禁已恢复，无 ignoreBuildErrors） |
| 测试 | `bun run test` | 459/459（26 文件，~2.6s；含鉴权/越权/限流类安全行为用例） |
| 覆盖率 | `bun test --coverage` | 全仓 funcs/lines 均 **92.1%**；jwt/badges/rate-limit/utils/cookies/guard/homework/ai_roles/auth refresh 路由均 100%（2026-11-05 补齐） |
| DB 直测 | `bun run test:node` | 7/7（SQLite）；设置 `PG_TEST_URL` 后 +5 条 PG 用例（共 12/12，CI 默认跳过 PG） |
| e2e | `bun run test:e2e` | 3/3（登录→建娃→写记录→登出 / 匿名 401 矩阵 / 敏感页重定向；生产构建，账号自举不依赖种子） |
| 视觉 | `bun run test:visual` | 8/8（首页/视频工坊 × 四主题；darwin/linux 分平台基线） |
| i18n | `bun run check:i18n:strict` | 16/16 路由镜像 + 词条 977/977 一致（CI 阻断级） |
| 依赖 | `bun run audit:osv` | OSV.dev 审计；Critical 阻断，报告输出 `osv-results.json`（ignored） |

> 2026-11-05 复核实测：tsc 0 error · lint 0 error/0 warning（58 条债务清零）· 459/459 · node 7/7 · e2e 3/3 · 四主题视觉 8/8 ·
> 覆盖率全仓 funcs/lines 均 92.1%（jwt dev-secret/badges/rate-limit sweep/character-manager/auth refresh 路由已补齐）·
> OSV 0 Critical/0 High（brace-expansion 1.1.21/5.0.12 已升级关闭 4 条 high；残余 minimatch 2 条 moderate，
> 修复版 11.0.1 为 ESM-only 待上游随链消除）。数字以本节为准，变更门禁时请同步刷新。

## 测试套件结构（按目录实况）

```
__tests__/
├── api/                    auth-routes（登录/注册/刷新/限流/令牌类型）
│                           data-routes（children/growth/homework 的 401·403·IDOR·白名单）
│                           homework-routes（GET 过滤分支/POST 全链/404/500/FK + auth/cookies 传输）
│                           ai-chat（401/400/demo 降级/role 回落/429）
│                           user-documents（kind 白名单/覆盖语义/隔离/体积与条数上限）
│                           growth-assessments（401/400/403/201/分页夹取 + health 200/503）
├── lib/                    badges · auth · auth/jwt-type · auth/guard（CSRF/401×4/403×2/双通道）
│                           auth/jwt-dev-secret（dev 密钥生成/复用/生产拒绝）
│                           ai-roles（选角色/复杂度分析/协同响应/历史裁剪，100%）
│                           character-manager（图片路径/主题色/CSS/预加载，95%+）
│                           config · db/identifier · utils
│                           utils/index（数组/对象/深比较/格式化/异步/函数式全家桶，utils.ts 100%）
│                           api/auth-fetch（401→刷新→重试并发锁）
├── hooks/                  hooks.test.bun · useAccessibility · useGrowthRecords
├── components/common/      LanguageSwitcher
├── pages/                  settings · profile
└── utils/                  helpers
```

> 已删除 `__tests__/hooks/useAIChat.test.ts`：该文件在测试内**自定义**同名 Hook 并断言自身，
> 生产代码中不存在该模块，属「自证型用例」，会虚增通过数。对应能力改由 `api/ai-chat.test.ts` 覆盖真实端点。

运行时：Bun test + jsdom（`bun.test.preload.ts` 提供 DOM 环境与 framer-motion mock）。

**测试写法范式**（以徽章引擎为例）：纯函数 → 直接断言；Hook → bun:test + renderHook 风格；组件 → jsdom 渲染 + 行为断言。中文用例名与产品语言一致。

## Lint 债务清单（2026-11-05 清零存档）

58 条 warning 已全部清零（0 error / 0 warning）：unused-vars 删除、confusing-void 块体化、
unsafe 家族类型断言、purity 家族确定性替代（LCG/crypto/公式）、set-state-in-effect 语义等价改写
（rAF 首帧前校正 / useSyncExternalStore 挂载检测 / 渲染期派生）+ 合法惯用法注释豁免
（挂载拉取、embla 订阅初始化）。豁免点共 5 处，均带理由注释。

| 规则族 | 状态 |
| -------- | ------ |
| no-explicit-any / no-unsafe-* / require-await / no-floating-promises | 此前已清零 |
| React Compiler（set-state-in-effect/immutability/purity） | 2026-11-05 清零 |

每清一个规则族 → 在 `eslint.config.js` 把它升回 `error`，防止回潮。

## 类型债治理史（存档）

1,986（合并初期）→ 990（tsconfig 标准化）→ 804（themes 排除+补类型族）→ 415（完整化阶段）→ **0**（清零冲刺，2026-08-19）。当前维持 0 错误基线（`bunx tsc --noEmit` 全量校验）。
