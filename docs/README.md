# 📚 YYC³ 文档中心

> **本目录是 YYC³ 全部文档资产的唯一入口。** 架构分层：

| 目录 | 定位 | 维护策略 |
| ---- | ---- | -------- |
| [developer/](./developer/) | ★ **现行开发文档**（12 篇，唯一被持续维护的文档集） | 随代码变更持续更新 |
| [YYC3-成长守护-开发指导/](./YYC3-成长守护-开发指导/) | 产品开发指导（需求→设计→实现对照） | 产品演进时更新 |
| [YYC3-成长守护-全栈内容/](./YYC3-成长守护-全栈内容/) | 全栈设计基线（概述/技术栈/UI 体系/库表设计/脚本） | 产品演进时更新 |
| [YYC3-成长守护-角色系统/](./YYC3-成长守护-角色系统/) | Q 版角色/IP 矩阵/形象与情绪体系 | 角色扩展时更新 |
| [YYC3-成长守护-日志系统/](./YYC3-成长守护-日志系统/) | 成长记录/日志/时间线产品语义 | 功能演进时更新 |
| `YYC3-成长守护-未来之语/`（本地） | 0–22 岁成长寄语与阶段设计方案（gitignore，暂缓入库） | 本地维护 |
| `YYC3-小语/`（本地） | 组件拆分工作区（gitignore，本地审计用） | 本地维护 |
| `YYC3-Baby-MoYu-glm53flash-*/`（本地） | 有日期后缀的会话执行日志（gitignore，一次性产物不入库） | 本地留档 |

> 历史归档（archive/analysis/standard/status 与 20261102 两轮审计日志）已于 2026-11-05
> 移出仓库：结论均已沉淀进 developer/ 各篇， git 历史可溯。团队通用规范/开发指南以
> **SSOT `~/YYC-Cube/YYC3-团队通用-标准规范/` 为唯一事实源**，本仓不自备副本。

## 现行门禁基线（实测 2026-11-05，详见 [developer/07](./developer/07-testing-quality.md)）

| 门禁 | 基线 |
| ---- | ---- |
| `bunx tsc --noEmit` | **0 错误** |
| `bun run lint` | **0 error / 0 warning**（58 条债务已清零） |
| `bun run test` | **459/459**（26 文件） |
| 覆盖率 | funcs/lines 均 **92.1%** |
| `check:i18n:strict` | 16/16 路由镜像 · 词条 977/977（CI 阻断级） |
| e2e / 视觉 | 3/3 · 8/8 |
| OSV 依赖审计 | 0 Critical / 0 High |

## 文档使用路线

- **第一次接触本仓**：根 [README](../README.md) → [developer/01 快速上手](./developer/01-getting-started.md)
- **改代码前**：[developer/02 架构](./developer/02-architecture.md) + 对应领域篇（03–06）
- **提交前**：[developer/07 门禁](./developer/07-testing-quality.md) 四道全绿
- **发版/部署**：[developer/08 部署](./developer/08-deployment.md) + [12 承载分析](./developer/12-hosting-profile.md)
- **加新页面**：[developer/11 i18n 边界治理](./developer/11-i18n-boundary.md) §3（单组件复用强约定）
- **产品语义/设计溯源**：YYC3-成长守护-* 五目录
