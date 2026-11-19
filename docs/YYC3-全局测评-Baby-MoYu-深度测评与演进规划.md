# YYC³ Baby-MoYu · 全局深度测评与演进规划

> 测评日期：2026-11-20 ｜ 测评对象：`YYC3-Baby-MoYu` 主线（`main@a6a9f23` 之后的工作树）
> 方法：门禁实测 + 本地生产模式运行时验收 + 静态规模盘点，所有数字均来自本轮实际执行（未引用的历史结论单独标注）
> 关联：[02 架构](./developer/02-architecture.md)、[07 门禁](./developer/07-testing-quality.md)、[08 部署](./developer/08-deployment.md)、[谱系收敛总结](./YYC3-谱系收敛-三仓归档执行总结.md)

## 1. 结论先行

| 维度 | 结论 |
| ---- | ---- |
| 质量门禁 | 六道全绿（lint 0/0、tsc 0、500/500、i18n strict 达标、build 通过、OSV 0 Critical / 0 High） |
| 运行时 | 本地生产模式 28 项验收全过，服务端响应毫秒级 |
| 上线就绪度 | **条件放行**：仅剩两项运维动作（BigModel 密钥轮换、`METRICS_TOKEN` 注入），无代码阻断项 |
| 主要结构性约束 | 单实例语义（限流内存桶 / SQLite 单写 / AgenticCore 单例），扩容需前置改造 |
| 演进重心 | 从「功能补齐」转向「可观测性闭环 + 多实例化前置 + 预测能力可信度」 |

## 2. 规模画像（实测）

| 指标 | 数值 |
| ---- | ---- |
| 仓库历史 | 90 commits（2026-08-11 → 2026-11-20） |
| API 路由 | 30（`app/api/**/route.ts`） |
| 页面 | 33（17 功能页 + `[locale]` 镜像） |
| 组件 | 88（`components/**/*.tsx`） |
| 领域模块 | 40（`lib/**/*.ts`） |
| 测试 | 31 文件 / 500 用例 / 1631 断言 + node 直测 + 2 e2e spec + 8 视觉基线 |
| 国际化 | 词条 zh 986 / en 986，镜像路由覆盖 100% |
| 依赖 | runtime 65 / dev 29 |
| 数据层 | SQLite 十表（WAL + 外键，详见 03） |

## 3. 门禁基线（本轮实测，2026-11-20）

| 门禁 | 结果 | 备注 |
| ---- | ---- | ---- |
| `bunx tsc --noEmit` | **0 错误** | 全量类型检查 |
| `bun run lint` | **0 error / 0 warning** | 仅 `.eslintignore` 迁移提示（工具级） |
| `bun run test` | **500 pass / 0 fail**（31 文件，2.78s） | 较上一基线 +4（metrics 令牌门禁） |
| `bun run test:node` | 通过 | node:sqlite 真实驱动直测 |
| `bun run check:i18n:strict` | 达标 | 986/986，镜像 100% |
| `bun run build` | 成功 | Turbopack，约 6s |
| `bun run audit:osv` | 0 Critical / 0 High，**1 moderate** | `minimatch@10.2.6`（dev 链，修复版 11.0.1 为 major，跟踪） |
| CI（quality / visual / smoke） | 三 job 全绿 | 最近一次 push 实测 |

**覆盖率**：本轮未重跑（`bun test --coverage` 超过 7 分钟未收敛），沿用 [07](./developer/07-testing-quality.md) 记录的 funcs / lines **92.1%** 基线；建议后续改为夜间任务而非本地阻断。

## 4. 运行时验收（本地生产模式，28 项全过）

| 分组 | 项数 | 关键断言 |
| ---- | ---- | -------- |
| 匿名访问矩阵 | 10 | 首页 / 英文首页 / health 200；`/api/metrics` 匿名 **401**、带令牌 200；children / assessments / TTS / prediction 匿名 **401** |
| 安全响应头 | 6 | `X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`、CSP、`frame-ancestors` |
| 认证链路 | 4 | 注册 201 → 登录 200 → 写入 httpOnly `yyc3_at` → 带 Cookie 读数据 200 |
| 业务链路 | 3 | 建娃 201 → 6 次评估落库 → 趋势预测 200（含置信区间） |
| 降级语义 | 2 | 未配 BigModel → TTS **503**；未配 AI → chat `demo:true` |
| 限流与可观测 | 4 | prediction 第 21 次 **429**；metrics 含 AI 计数器、`source="mock"`、默认进程指标 |
| 性能基线 | 3 | `/` 10ms、`/api/health` 2ms、`/api/metrics` 2ms（3 次均值） |

## 5. 五维评估

| 维度 | 评估 | 证据 |
| ---- | ---- | ---- |
| 时间 | 反馈闭环在单次 push 内完成 | CI 全链路约 1.5–2 分钟；构建 6s；服务端响应 ms 级 |
| 空间 | 单进程、低耦合、零冗余依赖 | 预测卡片手写 SVG 未引新库；standalone 镜像 604MB；三仓收敛后噪声源清零 |
| 属性 | 安全与可用性边界清晰 | 30 路由鉴权分层；CSP + httpOnly；错误语义 401/503/502/429 各归其位；密钥判定单点（`isRealSecret`） |
| 事件 | 交互与错误处理可观测 | 限流 20/min（prediction）；三条业务计数器；CI 冒烟八项含鉴权门禁 |
| 关联 | 接线收敛 | 模型工厂统一 4 条 AI 路由；metrics 端点与业务计数器共享注册中心；前端数据全部走真实 API，无 mock 曲线 |

## 6. 风险登记册

| 级别 | 风险 | 证据 | 处置 | 时点 |
| ---- | ---- | ---- | ---- | ---- |
| **高** | BigModel 密钥已失效 | 本地实测上游返回 401，TTS 已能正确报 503 | 上线前轮换 `BIGMODEL_API_KEY` | 上线前 |
| 中 | 单实例锁定 | 限流内存桶、SQLite 单写者、AgenticCore 单例 | 禁止 `--scale`；扩容前置 Upstash + PostgreSQL | 扩容前 |
| 中 | 容器启动方式 | `next start` 在 standalone 产物下的已知警告 | 容器内改 `node .next/standalone/server.js` | 首次容器发布 |
| 中 | 指标端点运维依赖 | 生产未配 `METRICS_TOKEN` 即 503 | 用 `bun run gen:metrics-token` 生成并按环境注入；反代白名单作第二层 | 上线前 |
| 低 | minimatch moderate | OSV 明细 1 条（dev 链） | 修复版为 major，暂跟踪 | 季度 |
| 低 | 覆盖率基线未刷新 | 本轮覆盖率重跑超时 | 改为夜间 CI 任务，不阻断 | 一月内 |
| 观察 | 预警准确度无回测 | 预测为统计外推，卡片含免责声明 | 补 30 天回测指标（MAPE / 区间覆盖率） | 季度 |

## 7. 建议与路线图

### P0 · 上线前（运维动作，无代码改动）

- [ ] 轮换 `BIGMODEL_API_KEY`，按环境注入 `OPENAI_API_KEY` 或成对的 `AI_API_KEY` + `AI_BASE_URL`
- [ ] `bun run gen:metrics-token -- production` 生成并注入 `METRICS_TOKEN`，抓取端配置 Bearer
- [ ] 反代层限制 `/api/metrics` 来源（`allow 10.0.0.0/8; deny all;`）
- [ ] 容器形态改用 `node .next/standalone/server.js` 启动
- [ ] 验证 `data/yyc3.db` 备份与恢复（VACUUM INTO → 停机替换）

### P1 · 一个月

| 目标 | 验收标准 |
| ---- | -------- |
| 可观测闭环 | Prometheus 抓取 + 3 条告警（5xx 比率 >2%、TTS 503 >0、事件循环延迟 >100ms） |
| 覆盖率回归 CI | 夜间任务产出覆盖率，funcs/lines 不低于 92.1% 基线 |
| e2e 增强 | 增加 prediction 与 TTS 两条真实交互链路（当前仅冒烟 + 视觉） |
| 依赖维护 | `eslint-config-next` 跟随 next patch（当前 16.4.5，16.4.6 已发布） |

### P2 · 一个季度

| 目标 | 验收标准 |
| ---- | -------- |
| 多实例化前置 | 限流存储抽象 + Upstash 实现；PostgreSQL 切换演练；多副本压测报告 |
| 预测可信度 | 30 天回测报告（MAPE、区间覆盖率、模型选择依据） |
| 合规与审计 | 儿童数据访问审计日志、租户隔离复核清单 |

**阶段度量**：可用性 ≥ 99.5%/月；P95 服务端响应 < 50ms；TTS/AI 降级事件可观测且可归因；每次 push 门禁零红灯。

## 8. 复现命令

```bash
bun run lint && bunx tsc --noEmit && bun run test && bun run test:node
bun run check:i18n:strict && bun run audit:osv && bun run build
JWT_SECRET=acceptance-secret METRICS_TOKEN=acceptance-metrics-token \
  NODE_ENV=production bun run start   # 另开终端跑 28 项验收脚本
```

> 验收脚本（28 项）为本地一次性产物，未入库；持久断言已固化在 CI `smoke` job：
> 首页 / 视频工坊 / 英文首页 / health / manifest / icon / 指标令牌门禁（401 + 带令牌 200）/ AI 鉴权门禁。
