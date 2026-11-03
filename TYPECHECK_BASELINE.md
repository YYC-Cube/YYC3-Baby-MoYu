# TypeScript 类型债基线 —— ✅ 已清零（2026-08-19）

> **终态：应用代码 tsc 错误 0 个，构建类型门禁已恢复。**
> 演进全程：1,986 →（tsconfig 标准化/冗余清除）990 →（themes 排除/补类型）804 →
> （完整化阶段）415 →（清零冲刺）**0**。
> `next.config.mjs` 的 `ignoreBuildErrors` 补丁已移除，`next build` 现在执行完整类型检查。

## 清零路径（按贡献）

| 阶段 | 措施 | 降幅 |
|------|------|------|
| 配置 | tsconfig 回归 Next.js 标准（lint 职责开关交还 ESLint） | -996 |
| 冗余 | 删除零引用死代码（ai-modules 副本、supabase-client、3 个幻影引擎等）+ 8 个测试路由 | ~-90 |
| 类型 | 补写缺失类型族（Chat/prediction 20+/schedule/analytics/CharacterTheme） | ~-150 |
| 架构 | base-predictor 富基类重写、RealtimeMetrics 独立、AgenticCore 接口对齐 | ~-180 |
| 冲刺 | 逐个修复 14→0：模态框负载类型、Pie label 签名、motion 类型收敛、mod 重命名一致性、Hook 规则修复 | -14 |

## 现行质量门禁

| 门禁 | 状态 |
|------|------|
| `bunx tsc --noEmit` | **0 错误**（应用代码；`__tests__/`、`themes/` 排除，前者由 bun test 运行时把关） |
| `next build` | 含完整类型检查，**通过** |
| `bun run lint` | **0 error**，51 warning（any 家族/悬浮 Promise/React Compiler 现代化债务，已归档见下） |
| `bun test` | 258/258 全绿（2026-11-02 复核） |
| `bun run audit:osv` | 0 Critical（814 包，High/Medium 留档） |

## 剩余 warning 债务（不阻断，按域消化）

- `no-explicit-any` / `no-unsafe-*`：~300 处，历史 any 用法
- `no-floating-promises` / `no-misused-promises`：~116 处，UI 事件中的 fire-and-forget
- React Compiler（immutability/purity/refs/static-components）：~90 处，React 19 编译器兼容性整改
- `require-await`：~120 处，同步实现的 async 接口（既有 API 契约）
- 修复时按目录域推进，每清一个规则族在 eslint.config.js 中将其升回 `error`
