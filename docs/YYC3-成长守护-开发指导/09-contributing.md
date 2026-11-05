# 09 · 贡献指南

## 仓库

- 远程：`https://github.com/YYC-Cube/YYC3-Baby`（main 分支直推，小步提交）
- 仓库即项目根（无子目录嵌套），git 历史自 `init: 从 yyc3-xy-05 派生统一基线` 起

## 提交规范

沿用现行风格：`类型: 中文摘要 — 要点`，类型取值：

| 类型 | 用途 |
| ------ | ------ |
| feat | 新功能 |
| fix | 缺陷修复 |
| refactor | 结构调整（不改行为） |
| quality | 质量门禁/测试/lint |
| docs | 文档 |
| chore | 杂务/资产 |

正文列要点与验证结论（构建/测试/冒烟结果），删除性改动注明可从哪个 commit 找回。

## 开发流程

```bash
bun run dev                 # 开发
bun run test                    # 新增逻辑必须带测试（参考 __tests__/lib/badges.test.ts）
bunx tsc --noEmit && bun run lint && bun run build   # 四门禁
git commit && git push
```

## 硬性红线

1. **禁止 `NEXT_PUBLIC_` 承载密钥**（见 [06 · AI 引擎与安全](./06-ai-engine.md)）
2. **禁止在 API 路由直接拼 SQL**（必须经 `lib/db/server.ts` 白名单层）
3. **禁止让 next-intl 处理根路由**（混合路由架构，见 [02 · 架构](./02-architecture.md) §2，曾致全站 404）
4. **不新增 tsc 错误**（现为 0，`ignoreBuildErrors` 已移除）
5. 服务进程只跑 Node，Bun 仅 install/test

## 新增徽章指南（五分钟）

徽章系统是完全声明式的（30 枚 × 8 分类 × 4 等级），加一枚勋章只需在 `lib/badges/definitions.ts` 增加一条：

| 等级 | 分值 | 定位 |
| ------ | ------ | ------ |
| `bronze` 铜牌 | 10 | 新手起步（首记录、首个里程碑） |
| `silver` 银牌 | 30 | 稳定投入（累计 20-50 次） |
| `gold` 金牌 | 80 | 深度参与（累计 50-100 次 / 复合条件） |
| `platinum` 钻石 | 200 | 里程碑级（满一年 / 200 条记录） |

```ts
// 计数型：一行工厂
countBadge("emotion-100", "情绪百科全书", "记录 100 次情绪变化", "💌", "platinum", "情绪记录",
  (s) => s.recordsByType.emotion ?? 0, 100),

// 复合型：条件函数
compoundBadge("night-owl", "夜航员", "在 22 点后仍有记录", "🦉", "silver", "坚持陪伴",
  (s) => s.nightRecordCount > 0,   // 需先在 types/engine 扩展统计字段
  ["至少一条记录创建于 22:00 之后"]),
```

若需要新统计字段：`types/badges.ts` 的 `BadgeStats` 加字段 → `lib/badges/engine.ts` 的 `computeStats()` 聚合 → 补一条单测。页面零改动（评估流水线见 [02 · 架构](./02-architecture.md) §8）。

> 新增后请在 `__tests__/lib/badges.test.ts` 补一条用例，保证「定义完整性」与「评估正确性」两组门禁持续覆盖。

## 新增页面/路由

- 中文主应用：`app/<feature>/page.tsx`（直通，无前缀）
- 需要国际化：同步建 `app/[locale]/<feature>/` 并在 `messages/{zh,en}.json` 补文案
- 底部导航入口：`components/Navigation.tsx`

## 文档维护

改架构/数据模型/API 时同步更新 `docs/developer/` 对应篇目；新里程碑更新 [docs/status/project-status.md](../status/project-status.md) 的进度与里程碑（每工作日 17:00）；测试计数变化同步更新 [07 · 测试与质量门禁](./07-testing-quality.md)。
