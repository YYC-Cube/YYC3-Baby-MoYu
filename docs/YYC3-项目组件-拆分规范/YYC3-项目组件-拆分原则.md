---
file: YYC3-项目组件-拆分原则.md
title: YYC³ 组件独立完善与拆分原则
description: 组件独立完善与拆分的原则、流程、模板与检查清单
author: YYC³ Team <admin@0379.email>
version: v1.1.0
created: 2026-03-27
updated: 2026-11-02
status: stable
tags: [guide, component, split, principle]
category: guide
language: zh-CN
audience: developers,managers
complexity: basic
---

# YYC³ 组件独立完善与拆分原则

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

### 🎯 三大核心原则

1. 单一职责原则 - 每个组件只负责一个功能
2. 可复用性原则 - 识别重复元素，提取为可复用组件
3. 层次化原则 - 建立原子→分子→有机体→模板→页面的层次结构

### 🔧 四步完善流程

1. 组件识别与命名 - 识别潜在组件，清晰命名，分类整理
2. 组件属性定义 - 定义必需/可选属性、默认值、类型验证
3. 组件变体设计 - 设计视觉变体、状态变体、功能变体
4. 组件文档生成 - 生成描述、API、示例、最佳实践

### 🚀 三大实战模板

1. 完整组件拆分 - 从零开始拆分整个设计
2. 特定组件完善 - 优化现有组件
3. 组件库重构 - 系统性优化整个组件库

### 📊 质量检查清单

- 单一职责、可复用性、依赖管理
- 文档完整性、性能优化、可访问性
这个指南提供了完整的提示词模板和最佳实践，您可以直接在 Figma AI 中使用这些提示词来指导组件的拆分和完善工作！

## 📋 文档内容概览

### 🎨 五层组件体系 1. 原子组件

- 最基础的UI元素，不可再分
- 典型组件：Button、Input、Text、Icon、Image、Link
- 特点：功能单一、高度可复用、抽象通用 2. 分子组件
- 由2-3个原子组件简单组合
- 典型组件：SearchBox、FormField、Avatar、Breadcrumb
- 特点：相对独立、功能明确、具备基本交互逻辑 3. 有机体组件
- 由分子和原子组成的复杂UI区块
- 典型组件：Header、Sidebar、Modal、Card、Table
- 特点：功能完整、相对独立、业务逻辑丰富 4. 模板组件
- 页面布局结构，展示组件排列方式
- 典型组件：DashboardLayout、AuthLayout、ArticleLayout
- 特点：内容占位、布局框架、响应式设计 5. 页面组件
- 高保真的完整页面，具有上下文
- 典型组件：HomePage、LoginPage、DashboardPage
- 特点：具体内容、上下文完整、用户体验完整

### 🌳 组件分类决策树

是否是最基础的UI元素？ → 原子组件
是否由2-3个原子组件简单组合？ → 分子组件
是否是复杂的UI区块？ → 有机体组件
是否是页面布局结构？ → 模板组件
其他 → 页面组件

### 📚 每个层次包含

- ✅ 定义与特点
- ✅ 典型组件清单（分类表格）
- ✅ 设计原则（代码示例）
- ✅ 完整代码示例
- ✅ 最佳实践建议

### 🎯 核心价值

1. 清晰分类 - 五层体系，层次分明
2. 实用指南 - 每个组件都有详细说明和代码示例
3. 决策支持 - 决策树帮助快速分类
4. 最佳实践 - 命名规范、文件组织、文档规范
5. 质量控制 - 检查清单确保组件质量

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.1.0 | 2026-11-02 | 统一标头标尾 · 品牌标语与格式规范化 · 补齐 YAML 元数据与变更历史 | YYC³ Team |
| v1.0.0 | 2026-03-27 | 初始版本，提炼组件拆分原则与流程 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
