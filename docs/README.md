# 📚 YYC³ 文档中心

> **本目录是 YYC³ 全部文档资产的唯一入口。** 架构分层：

| 目录 | 定位 | 维护策略 |
| ---- | ---- | -------- |
| `status/`（历史归档） | 项目实况跟踪（历史文档已归档，现行状态见根 README「当前状态」） | 归档只读 |
| [developer/](./developer/) | ★ **现行开发文档**（11 篇，唯一被维护的文档集） | 随代码变更持续更新 |
| `YYC3-小语/`（本地资料） | 组件拆分项：四项目同源收敛、12 包工作区、拆分总结与质量基线（已加入 `.gitignore`，暂缓入库） | 本地维护 |
| `standard/`（历史归档） | 术语表与命名规范（现行以团队 SSOT 为准） | 归档只读 |
| [analysis/](./analysis/) | 专项分析报告（兄弟项目对比/技术选型/融合路线） | 结论入 developer/ 后归档 |
| [archive/](./archive/) | 历史归档（白皮书/方案/审计/创作/快照） | 只读，不再维护 |

## 项目实况（本次会话）

| 文档 | 内容 |
| ---- | ---- |
| [00 · 项目现状审核报告](https://github.com/YYC-Cube/YYC3-Baby-MoYu/blob/main/docs/YYC3-Baby-MoYu-codex-20261102/00-项目现状审核报告.md) | 全局审计：质量门禁实测、CI 红叉根因、安全与文档缺口、评分与行动项 |
| [01 · 任务规划与节点目标](https://github.com/YYC-Cube/YYC3-Baby-MoYu/blob/main/docs/YYC3-Baby-MoYu-codex-20261102/01-任务规划与节点目标.md) | 本轮目标、任务分解、验收标准与里程碑 |
| [02 · 执行日志与进度跟踪](https://github.com/YYC-Cube/YYC3-Baby-MoYu/blob/main/docs/YYC3-Baby-MoYu-codex-20261102/02-执行日志与进度跟踪.md) | 逐项修复记录、命令与结果、遗留风险 |
| [03 · 总结文档与状态同步](https://github.com/YYC-Cube/YYC3-Baby-MoYu/blob/main/docs/YYC3-Baby-MoYu-codex-20261102/03-总结文档与状态同步.md) | 交付清单、验证证据、下次会话恢复指南 |

## 首次全维度调研（2026-11-02 · fullaudit）

| 文档 | 内容 |
| ---- | ---- |
| [00 · 全维度调研与审核报告](./YYC3-Baby-MoYu-fullaudit-20261102/00-全维度调研与审核报告.md) | 业务/技术/代码/协作四层采集 · 功能接线矩阵 · 六维深度分析 · P0–P3 分级 · 路线与风险 · 协作对接指引 |
| [01 · 测试方案与验证执行](./YYC3-Baby-MoYu-fullaudit-20261102/01-测试方案与验证执行.md) | 门禁与运行时实测证据 · 40+ 可执行用例（正向/反向/边界）· 覆盖与环境兼容范围 · 通过/失败判定 |
| [02 · 执行日志与进度跟踪](./YYC3-Baby-MoYu-fullaudit-20261102/02-执行日志与进度跟踪.md) | 本次调研逐项操作、命令与结果、阻塞与处置 |
| [03 · 总结文档与状态同步](./YYC3-Baby-MoYu-fullaudit-20261102/03-总结文档与状态同步.md) | 一句话结论 · 关键决策 · 下次会话启动指南 · TOP3 行动 |

## 专项分析（analysis/）

| 文档 | 内容 |
| ---- | ---- |
| [YYC3-AI-Growth-Companion 对比分析与融合路线](./analysis/YYC3-AI-Growth-Companion-对比分析与融合路线.md) | 兄弟项目差距矩阵 · P0/P1/P2 融合并行项 · 三阶段路线图 |
| [多主题融合方案专业分析与评估](./analysis/多主题融合方案-专业分析与评估报告.md) | 小语四版本主题资产审核 · Aurora 第四主题可行性/完整性评估 · 修订路线图（融合已完成，资产已提炼进主项目） |

## 现行文档（developer/）

面向开发者的完整技术文档套，以 [developer/README.md](./developer/README.md) 为入口：

| 文档 | 内容 |
| ---- | ---- |
| [用户使用手册](./user-manual.md) | 面向家长的产品操作指南（功能地图/常见操作/隐私/FAQ） |
| [01 · 快速上手](./developer/01-getting-started.md) | 环境要求、安装、启动、常见问题 |
| [02 · 可视化架构体系](./developer/02-architecture.md) | 系统分层 / 混合路由 / 数据流 / AI 链路 / 徽章评估（Mermaid） |
| [03 · 数据模型](./developer/03-data-model.md) | SQLite 十张表（含客户端集合 `user_documents`）、JSON 列约定、种子数据、备份 |
| [04 · API 参考](./developer/04-api-reference.md) | 全部 REST 端点：请求/响应/错误码约定 |
| [05 · 前端组件体系](./developer/05-frontend.md) | 目录组织、UI 基建、状态管理、主题与角色系统 |
| [06 · AI 引擎与安全](./developer/06-ai-engine.md) | 服务端代理模式、密钥管理、AI 引擎模块清单 |
| [07 · 测试与质量门禁](./developer/07-testing-quality.md) | tsc / lint / test / audit 四道门禁 |
| [08 · 部署](./developer/08-deployment.md) | 本地生产、脚本、Docker 注意事项 |
| [09 · 贡献指南](./developer/09-contributing.md) | 分支模型、提交规范、徽章系统扩展指南 |
| [10 · 可视化交互体系设计](./developer/10-visual-interaction-system.md) | 设计令牌 / 四主题 / 交互状态机 / 数据可视化 / 动效 / WCAG 2.2 AA / 视觉回归 |
| [11 · 国际化边界与治理](./developer/11-i18n-boundary.md) | 英文试点 2/14 页 · `@yyc3/i18n-core` 不适用评估 · 全量国际化排期（P0–P4） |
| [12 · 部署承载分析](./developer/12-hosting-profile.md) | 本机/单机/托管对比 · 反代/PG/备份/密钥配置清单 · 上线验收项 |

## 历史归档（archive/）

仅作追溯参考，内容可能过期，与当前代码不一致时以 `developer/` 为准：

| 目录 | 内容 | 规模 |
| ---- | ---- | ---- |
| [architecture/](./archive/architecture/) | 旧版架构/方案/白皮书（合并初期归档） | 63 篇 |
| [audit/](./archive/audit/) | 审计报告与 UI 方案 | 9 篇 |
| [creative/](./archive/creative/) | 沫语创作集（爱之细语等） | 40 篇 |
| [history-snapshots/](./archive/history-snapshots/) | 多版本合并前的项目快照 | 16 篇 |
| [plans/](./archive/plans/) | 历次开发规划 | 19 篇 |

## 已清除的冗余项

2026-08-19 文档架构规范化时移除（git 历史可完整找回，`git checkout <commit> -- <path>`）：

| 目录 | 原规模 | 清除原因 |
| ---- | ------ | -------- |
| `docs/library/` | ~13k 文件 / 130M | `generate-docs.py` 产物 + 多版本复制品，内容重复 |
| `docs/xy-02-microservices/` | ~2,850 文件 / 14M | 合并前微服务文档库，与统一基线无关 |
| `assets/` | 3 文件 | 无代码引用，内含过期 monorepo CI（apps/server、MongoDB） |

## 文档维护规范

1. **新增/修改文档一律写入 `developer/`**，不恢复 archive 旧结构
2. 改架构/数据模型/API 时同步更新 `developer/` 对应篇目
3. 新里程碑更新项目根 [README.md](../README.md) 的「当前状态」
4. 删除性改动注明可找回的 commit（见 [09 · 贡献指南](./developer/09-contributing.md)）
