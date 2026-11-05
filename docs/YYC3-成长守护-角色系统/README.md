---
file: README.md
title: YYC³ 多元角色系统文档索引
description: 多元角色系统六篇按角色拆分的文档索引与职责对照
author: YYC³ Team <admin@0379.email>
version: v1.1.0
created: 2026-11-02
updated: 2026-11-02
status: stable
tags: [general, index, navigation]
category: general
language: zh-CN
audience: developers,managers,stakeholders
complexity: basic
project: yyc3-baby-mochen
phase: design
parent_doc: 07-成长日志系统
related_docs: 00-共享类型定义.md,../README.md,../04-分析模块.md
---

# YYC³ 多元角色系统文档索引

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 核心理念

**五高架构**：高可用 | 高性能 | 高安全 | 高扩展 | 高智能
**五标体系**：标准化 | 规范化 | 自动化 | 可视化 | 智能化
**五化转型**：流程化 | 数字化 | 生态化 | 工具化 | 服务化
**五维评估**：时间维 | 空间维 | 属性维 | 事件维 | 关联维

---

## 一、拆分说明

原 `05-多元角色系统.md` 为 3 966 行的单篇文档，其核心是一个 `MultiRoleSystemManager` 类（3 900 余行 TypeScript）。按五类角色与类骨架拆分为 6 篇，便于分工维护与定位检索。

| 项目 | 说明 |
| ---- | ---- |
| 拆分依据 | `executeRoleResponsibility` 中五角色职责派发及对应方法实现块 |
| 拆分方式 | 按方法块边界切分，代码逐行保真，仅补代码围栏 |
| 类型补全 | `00-共享类型定义.md` 提供 118 个共享类型、API 契约与导出声明 |
| 编译校验 | 六篇拼接 + 共享类型经 `tsc --noEmit` 与 `--strict` 双档校验通过（0 error） |
| 覆盖校验 | 原文 43–3946 行代码全部落位，无遗漏 |
| 原文归档 | `../../_archive/原始完整版-05-多元角色系统.md`（status: deprecated） |

## 二、角色与职责对照

| 角色 ID | 角色 | 职责 | 文档 |
| ---- | ---- | ---- | ---- |
| `recorder` | 记录者 | 记录医疗健康档案 / 珍藏“初始冠军”时刻 / 构建成长里程碑矩阵 / 记录日常生命韵律 | [02-记录者角色.md](./02-记录者角色.md) |
| `guardian` | 守护者 | 规划健康生态 / 构建安全防护体系 / 建立情绪安全基底 | [03-守护者角色.md](./03-守护者角色.md) |
| `listener` | 聆听者 | 记录情绪响应 / 捕捉兴趣信号 / 观察社交互动 | [04-聆听者角色.md](./04-聆听者角色.md) |
| `advisor` | 建议者 | 优化成长环境 / 支持兴趣发展 / 培养抗挫力 | [05-建议者角色.md](./05-建议者角色.md) |
| `cultural_guide` | 国粹导师 | 浸润语言启蒙 / 体验传统仪式 / 渗透礼仪文化 | [06-国粹导师角色.md](./06-国粹导师角色.md) |

## 三、章节索引

| 序号 | 文档 | 内容范围 | 行数 |
| ---- | ---- | ---- | ---- |
| 00 | [00-共享类型定义.md](./00-共享类型定义.md) | 共享类型、API 契约、导入与导出约定 | 326 |
| 01 | [01-角色框架与交互总览.md](./01-角色框架与交互总览.md) | 类骨架、五角色注册、角色交互、职责派发 | 261 |
| 02 | [02-记录者角色.md](./02-记录者角色.md) | 记录者四项职责实现 | 113 |
| 03 | [03-守护者角色.md](./03-守护者角色.md) | 健康生态、安全防护、情绪安全基底 | 891 |
| 04 | [04-聆听者角色.md](./04-聆听者角色.md) | 情绪响应、兴趣信号、社交互动观察 | 282 |
| 05 | [05-建议者角色.md](./05-建议者角色.md) | 成长环境、兴趣发展、抗挫力培养 | 968 |
| 06 | [06-国粹导师角色.md](./06-国粹导师角色.md) | 语言启蒙、传统仪式、文化礼仪 | 1383 |

## 四、阅读路径建议

| 目标 | 推荐顺序 |
| ---- | ---- |
| 了解整体设计 | 00 → 01 → 02 → 03 → 04 → 05 → 06 |
| 关注健康与安全 | 01 → 03 |
| 关注兴趣与社交 | 01 → 04 → 05 |
| 关注文化传承 | 01 → 06 |

## 五、维护约定

1. 六篇均为 `MultiRoleSystemManager` 的方法级节选，修改时须保持方法签名与类内调用一致；新增类型先补 `00-共享类型定义.md`，再在各篇「依赖声明」中引入。
2. 新增角色按 `{序号}-{角色}角色.md` 命名，并在 01 中补充注册与交互配置。
3. 新文档 `parent_doc` 取 `05-多元角色系统`，`related_docs` 至少指向本索引与 01。
4. 涉及角色职责变更时，同步更新 §二 职责对照表与 `../README.md` 索引。

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.1.0 | 2026-11-02 | 补全 00-共享类型定义与各篇依赖/导出声明 · 修正 3 处源码级缺陷 · `tsc` 校验通过 | YYC³ Team |
| v1.0.0 | 2026-11-02 | 初始版本 · 按五类角色输出 6 篇文档与职责对照 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
