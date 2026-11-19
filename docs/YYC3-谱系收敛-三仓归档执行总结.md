# YYC³ 项目谱系收敛 · 三仓归档执行总结

> 生成日期：2026-11-20 ｜ 执行仓：`YYC3-Baby-MoYu`（唯一现役主线）
> 关联：`docs/YYC3-首次调研-三项目横向对比报告.md`（谱系判断）、`docs/YYC3-全局测评-Baby-MoYu-深度测评与演进规划.md`（现状测评与路线）

## 1. 决策

**一主、三冻结**：`YYC3-Baby-MoYu` 为唯一现役主线（SSOT），三个同源仓库全部冻结为只读归档，**代码零迁移**（已吸收能力除外）。

| 仓库 | 处置 | 归档前动作 | 归档 tag | 远程状态 |
| ---- | ---- | ---------- | -------- | -------- |
| `YYC3-AI-Growth-Companion` | 冻结（Frozen） | README 首屏加冻结声明（`bd7cc18`） | `frozen/2026-11` | `archived=true` |
| `YYC3-AI-Growth-Guardian-System` | 归档（Archive） | 合入 `fix/ci-yaml-header`（`d72ed30`）→ 同步远程 PR #1（`323b6ec`）→ 归档声明（`f6d2751`） | `archive/2026-11` | `archived=true` |
| `YYC3-Growth-Guardian-System` | 归档（Archive） | README 归档声明 + 产品资产去向说明（`887ae24`） | `archive/2026-11` | `archived=true` |

## 2. 判据

| 判据 | 结论 | 证据（本轮实测） |
| ---- | ---- | ---------------- |
| 工程门禁健全度 | Baby-MoYu 唯一全绿 | tsc 0 / lint 0/0 / 500 用例全过 / OSV 0 Critical·0 High |
| 维护活跃度 | 三仓已停更 | 最近提交分别停留在 2026-10-29 / 10-30 / 10-29；GitHub 上仅 Dependabot 自动任务且持续失败 |
| 架构一致性 | 三仓与主线冲突 | Next 14 分叉 + Hono/Express/microservices 多服务端形态，与主线「纯 Next App Router 单进程」不兼容 |
| 独有资产 | 仅文档层 | 孕育期至 22 岁全生命周期链路、语音浮窗交互方案等为产品文档，非可复用代码 |
| 告警噪声 | 三仓持续制造 | 多子目录 monorepo 使 Dependabot 无法自动升级，每次运行必失败 |

## 3. 已吸收能力（单向，不回流）

| 能力 | 落地位置 | 来源 |
| ---- | -------- | ---- |
| 统一模型工厂（双通道密钥） | `lib/ai/model-provider.ts` | Companion |
| Prometheus 指标端点 + 业务计数器 | `app/api/metrics`、`lib/monitoring/metrics.ts` | Companion |
| TTS 服务端代理（密钥不出服务端） | `app/api/ai/text-to-speech` | Companion |
| 生产冒烟 CI（八项断言 + 指标令牌门禁） | `.github/workflows/ci.yml` | 自建 |
| 预测引擎前端可视化 | `app/api/ai/prediction`、`components/growth/GrowthTrendPrediction.tsx` | 自建（引擎原有） |

更早吸收：Winston 日志体系、docs-kit 文档五件套、文化设计三要素（family 顶图 / 家族徽章 / 四行署名尾）。

## 4. 执行偏差与处理

| 问题 | 现象 | 处理 |
| ---- | ---- | ---- |
| `gh repo edit --archived` 不可用 | gh 2.103.3 输出 usage，提示 `unknown flag: --archived` | 改用 `gh api -X PATCH repos/<owner>/<repo> -F archived=true`，三仓均返回 `true` |
| Guardian 远程已合并同一修复 | 本地 merge 后 push 被拒（`ahead 2, behind 1`），远程 PR #1（`c01b5e8`）已含 `22eeae7` | `fetch` → `merge origin/main`（`323b6ec`，无冲突）→ 重指 tag 至最终 HEAD 后推送 |

## 5. 收敛后的边界规则

1. **禁止双写**：任何新功能只在 Baby-MoYu 开发，归档仓不再接受提交（GitHub 层面已只读）。
2. **单向吸收**：若归档仓仍有未消费的资产，以「先评审、后手工移植、再补测试」的方式单次吸收，不恢复双向同步。
3. **产品内容走文档**：0–22 岁生命周期、语音交互等以产品文档进入主线路线规划，不搬代码。
4. **恢复成本可控**：归档可随时 unarchive，tag 固定了归档时点，历史完整保留。

## 6. 遗留事项

| 事项 | 状态 | 说明 |
| ---- | ---- | ---- |
| 本地工作区脏改动 | 保留 | Companion 1 个删除文档 + `.DS_Store`；Guardian `bun.lock` 等 8 项。仓库已只读，改动无影响，无需处理 |
| `node_modules` 清理 | **待手动执行** | Guardian 1.1G + Growth-Guardian 1.2G ≈ 2.3G。命令策略禁止递归删除，需手动执行：<br>`rm -rf ~/YYC-Cube/personal/YYC3-AI-Growth-Guardian-System/node_modules`<br>`rm -rf ~/YYC-Cube/personal/YYC3-Growth-Guardian-System/node_modules`<br>（Companion 无 `node_modules`，总体积仅 94M） |
| Dependabot 告警 | 已停止产生 | 归档仓不再接收自动升级；历史告警仅作记录展示 |
