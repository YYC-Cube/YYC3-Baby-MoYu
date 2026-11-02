---
file: YYC3-文档命名-格式规范.md
title: YYC³ 文档命名与格式规范
description: YYC³ 文档目录、文件命名与格式统一规范
author: YYC³ Team <admin@0379.email>
version: v1.1.0
created: 2026-03-26
updated: 2026-11-02
status: stable
tags: [guide, naming, document, format]
category: guide
language: zh-CN
audience: developers,managers
complexity: basic
---

# YYC³ 文档命名与格式规范

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 📋 命名规范

### 项目级文档 (`/docs/`)

#### 目录命名规范

**格式**: `{序号}-{阶段}-{功能}-{子功能}`

**示例**:
```
00-YYC3-CP-IM-项目总览-目录索引/
01-YYC3-CP-IM-项目规划-启动阶段/
02-YYC3-CP-IM-项目规划-设计阶段/
03-YYC3-CP-IM-项目开发-实施阶段/
04-YYC3-CP-IM-项目测试-审核阶段/
05-YYC3-CP-IM-项目部署-文档闭环/
06-YYC3-CP-IM-项目运营-维护阶段/
07-YYC3-CP-IM-项目合规-安全保障/
08-YYC3-CP-IM-项目整合-实施阶段/
09-YYC3-CP-IM-项目资产-知识管理/
10-YYC3-CP-IM-项目模版-标准规范/
11-YYC3-CP-IM-智能演进-优化阶段/
12-YYC3-CP-IM-用户指南-操作手册/
13-YYC3-CP-IM-智能演进-优化阶段/
```

**规则**:
- 序号: 2 位数字（00-99）
- 阶段: 项目规划、项目开发、项目测试、项目部署、项目运营、项目合规、项目整合、项目资产、项目模版、智能演进、用户指南
- 功能: 简短描述（中文）
- 子功能: 可选，进一步细分

#### 文件命名规范

**格式**: `{序号}-{项目}-{功能}-{描述}.md`

**示例**:
```
001-CP-IM-项目总览索引-项目总览手册.md
002-CP-IM-项目总览索引-快速开始指南.md
003-CP-IM-代码标头规范标准.md
004-CP-IM-项目多维检测审查报告.md
```

**规则**:
- 序号: 3 位数字（001-999）
- 项目: CP-IM（CloudPivot Intelli-Matrix）
- 功能: 简短描述（中文）
- 描述: 详细描述（中文）

#### 标准规范文档命名

**格式**: `YYC3-CP-IM-{功能}-{描述}.md`

**示例**:
```
YYC3-CP-IM-代码标头规范标准.md
YYC3-CP-IM-代码标头规范化最终总结报告.md
YYC3-CP-IM-项目多维检测审查报告.md
YYC3-CP-IM-文档架构整理报告.md
YYC3-CP-IM-封装文档更新指南.md
```

---

### 应用级文档 (`/src/app/docs/`)

#### 文件命名规范

**格式**: `{功能}-{类型}.ts`

**示例**:
```
API-REFERENCE.ts
COMPONENT-REFERENCE.ts
DEVELOPER-HANDOFF.ts
TESTING-GUIDE.ts
ALIGNMENT-PLAN.ts
FINAL-AUDIT-REPORT.ts
HA-ARCHITECTURE-TEST.ts
LOCAL-DESIGN-GUIDE.ts
STORAGE-AUDIT.ts
```

**规则**:
- 功能: 大写字母，单词用连字符分隔
- 类型: REFERENCE, GUIDE, HANDOFF, REPORT, TEST, PLAN, AUDIT

---

## 📊 文档类型分类

### 项目级文档类型

| 类型 | 说明 | 示例 |
| ---- | ---- | ---- |
| 项目总览 | 项目介绍、快速开始 | 00-YYC3-CP-IM-项目总览-目录索引/ |
| 项目规划 | 启动、设计 | 01-YYC3-CP-IM-项目规划-启动阶段/ |
| 项目开发 | 实施阶段 | 03-YYC3-CP-IM-项目开发-实施阶段/ |
| 项目测试 | 审核阶段 | 04-YYC3-CP-IM-项目测试-审核阶段/ |
| 项目部署 | 文档闭环 | 05-YYC3-CP-IM-项目部署-文档闭环/ |
| 项目运营 | 维护阶段 | 06-YYC3-CP-IM-项目运营-维护阶段/ |
| 项目合规 | 安全保障 | 07-YYC3-CP-IM-项目合规-安全保障/ |
| 项目整合 | 实施阶段 | 08-YYC3-CP-IM-项目整合-实施阶段/ |
| 项目资产 | 知识管理 | 09-YYC3-CP-IM-项目资产-知识管理/ |
| 项目模版 | 标准规范 | 10-YYC3-CP-IM-项目模版-标准规范/ |
| 智能演进 | 优化阶段 | 11-YYC3-CP-IM-智能演进-优化阶段/ |
| 用户指南 | 操作手册 | 12-YYC3-CP-IM-用户指南-操作手册/ |
| 标准规范 | 代码规范、审查报告 | YYC3-CP-IM-*.md |

### 应用级文档类型

| 类型 | 说明 | 示例 |
| ---- | ---- | ---- |
| API 参考 | API 接口文档 | API-REFERENCE.ts |
| 组件参考 | 组件使用文档 | COMPONENT-REFERENCE.ts |
| 开发者交接 | 开发协作规范 | DEVELOPER-HANDOFF.ts |
| 测试指南 | 测试规范和最佳实践 | TESTING-GUIDE.ts |
| 对齐计划 | 项目对齐计划 | ALIGNMENT-PLAN.ts |
| 审核报告 | 最终审核报告 | FINAL-AUDIT-REPORT.ts |
| 架构测试 | 高可用架构测试 | HA-ARCHITECTURE-TEST.ts |
| 设计指南 | 本地设计指南 | LOCAL-DESIGN-GUIDE.ts |
| 存储审计 | 存储审计报告 | STORAGE-AUDIT.ts |

---

## 🎯 命名原则

### 1. 一致性

- 所有文档使用统一的命名格式
- 相同类型的文档使用相同的后缀
- 序号保持连续性

### 2. 可读性

- 使用中文描述，便于理解
- 使用连字符分隔，便于解析
- 避免使用特殊字符

### 3. 可扩展性

- 预留足够的序号空间
- 支持多层子目录
- 支持新类型的文档

### 4. 标准化

- 遵循行业最佳实践
- 符合 YYC³ 标准化要求
- 便于自动化处理

---

## 📝 文档模板

### 项目级文档模板

```markdown
# {序号}-{项目}-{功能}-{描述}

## 📋 文档说明

{文档说明}

## 📄 文档内容

{文档内容}

---

**最后更新**: {日期}
**维护者**: {姓名}
```

### 应用级文档模板

```typescript
/**
 * {功能}-{类型}
 * ================
 * {描述}
 */

// 文档内容
```

---

## 🔗 相关文档

- [项目文档 README](./README.md)
- [应用文档 README](../src/app/docs/README.md)
- [项目根目录 README](../README.md)

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.1.0 | 2026-11-02 | 统一标头标尾 · 品牌标语与格式规范化 · 补齐 YAML 元数据与变更历史 | YYC³ Team |
| v1.0.0 | 2026-03-26 | 初始版本，建立文档命名与格式规范 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
