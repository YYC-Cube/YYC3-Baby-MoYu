---
file: YYC3-团队通用-代码规范.md
title: YYC³ 代码标头规范标准
description: YYC³ 代码文件标头格式、字段定义与校验规范
author: YYC³ Team <admin@0379.email>
version: v2.1.0
created: 2026-03-25
updated: 2026-11-02
status: stable
tags: [policy, code, header, standard]
category: policy
language: zh-CN
audience: developers,managers
complexity: intermediate
---

# YYC³ 代码标头规范标准

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 概述

YYC³（YanYuCloudCube™）代码标头规范标准定义了项目中所有代码文件的标头格式和内容要求，确保代码的可维护性、可追溯性和专业性。本规范基于 YYC³ 团队标准和行业最佳实践，为项目提供统一的代码标头标准。

### 标头规范目标

- **可追溯性**：清晰记录代码的创建者、创建时间和修改历史
- **可维护性**：提供代码用途、依赖关系和注意事项的说明
- **专业性**：符合行业标准，提升代码质量
- **一致性**：统一格式，便于团队协作和代码审查

---

## 标头规范标准

### 1. TypeScript/JavaScript 文件标头

#### 1.1 格式定义

```typescript
/**
 * file: 文件名.tsx
 * description: 文件描述
 * author: 作者名称
 * version: 版本号
 * created: 创建日期
 * updated: 更新日期
 * status: 状态
 * tags: [标签1, 标签2, 标签3]
 *
 * copyright: YYC³ Team
 * license: MIT
 *
 * brief: 简要说明
 *
 * details: 详细说明
 *
 * dependencies: 依赖列表
 * exports: 导出内容
 * notes: 注意事项
 */
```

#### 1.2 字段说明

| 字段 | 必填 | 说明 | 示例 |
| ---- | ---- | ---- | ---- |
| file | ✅ | 文件名（包含扩展名） | file: useI18n.ts |
| description | ✅ | 文件描述（一句话概括） | description: 国际化 Hook · 支持中文/English 动态切换 |
| author | ✅ | 作者名称 | author: YYC³ Team |
| version | ✅ | 版本号（遵循语义化版本） | version: v1.0.0 |
| created | ✅ | 创建日期（YYYY-MM-DD） | created: 2026-03-05 |
| updated | ✅ | 更新日期（YYYY-MM-DD） | updated: 2026-03-05 |
| status | ✅ | 文件状态 | status: active |
| tags | ✅ | 标签列表 | tags: [hook, i18n, locale] |
| copyright | ❌ | 版权信息 | copyright: YYC³ Team |
| license | ❌ | 许可证 | license: MIT |
| brief | ❌ | 简要说明 | brief: 提供国际化功能 |
| details | ❌ | 详细说明 | details: 支持中英文动态切换 |
| dependencies | ❌ | 依赖列表 | dependencies: React, Context API |
| exports | ❌ | 导出内容 | exports: useI18n, I18nProvider |
| notes | ❌ | 注意事项 | notes: 需要在 App 根组件包裹 |

#### 1.3 状态值

| 状态值 | 说明 | 使用场景 |
| ---- | ---- | ---- |
| active | 活跃状态 | 正在使用的文件 |
| deprecated | 已弃用 | 即将移除的文件 |
| experimental | 实验性 | 实验性功能 |
| stable | 稳定 | 稳定版本 |
| draft | 草稿 | 正在开发中 |

#### 1.4 标签示例

| 类别 | 标签 | 说明 |
| ---- | ---- | ---- |
| 类型 | [component] | 组件文件 |
| | [hook] | Hook 文件 |
| | [util] | 工具函数 |
| | [type] | 类型定义 |
| | [config] | 配置文件 |
| | [test] | 测试文件 |
| 功能 | [i18n] | 国际化 |
| | [auth] | 认证 |
| | [api] | API |
| | [ui] | UI |
| | [data] | 数据处理 |
| 模块 | [dashboard] | 仪表板 |
| | [cp-im] | CP-IM 模块 |
| | [learning] | 学习中心 |
| | [settings] | 设置 |

#### 1.5 实际示例

```typescript
/**
 * file: useI18n.ts
 * description: 国际化 Hook · 支持中文/English 动态切换
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-02-26
 * updated: 2026-03-05
 * status: active
 * tags: [hook, i18n, locale]
 *
 * copyright: YYC³ Team
 * license: MIT
 *
 * brief: 提供国际化功能，支持中英文动态切换
 *
 * details:
 * - localStorage 持久化语言偏好
 * - React Context 全局共享
 * - 动态切换无需刷新
 * - t() 函数支持嵌套 key 和模板变量
 *
 * dependencies: React, Context API
 * exports: useI18n, I18nProvider, I18nContext
 * notes: 需要在 App 根组件包裹 I18nProvider
 */

import { useState, useCallback, useMemo, createContext, useContext } from "react";
import { zhCN, enUS } from "../i18n";
import type { TranslationKeys } from "../i18n";
import type { Locale, LocaleInfo } from "../types";

// ... 代码实现
```

### 2. CSS/SCSS 文件标头

#### 2.1 格式定义

```css
/**
 * file: 文件名.css
 * description: 文件描述
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-03-05
 * updated: 2026-03-05
 * status: active
 * tags: [style, theme, global]
 *
 * brief: 简要说明
 *
 * details: 详细说明
 *
 * dependencies: 依赖列表
 * notes: 注意事项
 */
```

#### 2.2 实际示例

```css
/**
 * file: index.css
 * description: 全局样式文件 · 包含基础样式、主题变量和重置样式
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-02-26
 * updated: 2026-03-05
 * status: active
 * tags: [style, theme, global]
 *
 * brief: 全局样式定义
 *
 * details:
 * - 基础样式重置
 * - 主题变量定义（深蓝 + 青色赛博朋克主题）
 * - 全局字体设置
 * - 工具类定义
 *
 * dependencies: TailwindCSS, 自定义主题
 * notes: 在 main.tsx 中引入
 */

/* ... 样式实现 */
```

### 3. 配置文件标头

#### 3.1 格式定义

```typescript
/**
 * file: 文件名.ts
 * description: 文件描述
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-03-05
 * updated: 2026-03-05
 * status: active
 * tags: [config, build, vite]
 *
 * brief: 简要说明
 *
 * details: 详细说明
 *
 * dependencies: 依赖列表
 * notes: 注意事项
 */
```

#### 3.2 实际示例

```typescript
/**
 * file: vite.config.ts
 * description: Vite 配置文件 · 包含构建、插件、别名等配置
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-02-26
 * updated: 2026-03-05
 * status: active
 * tags: [config, build, vite]
 *
 * brief: Vite 构建配置
 *
 * details:
 * - 基础路径配置（./ 用于 Electron 兼容）
 * - 插件配置（React + TailwindCSS）
 * - 路径别名（/* → ./src/*）
 * - 开发服务器配置（端口 3218）
 * - 构建优化（代码分割、压缩）
 *
 * dependencies: Vite, React, TailwindCSS
 * notes: 修改配置后需要重启开发服务器
 */

import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from 'tailwindcss/vite'
import react from 'vitejs/plugin-react'

// ... 配置实现
```

### 4. 测试文件标头

#### 4.1 格式定义

```typescript
/**
 * file: 文件名.test.ts
 * description: 测试文件描述
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-03-05
 * updated: 2026-03-05
 * status: active
 * tags: [test, unit, integration]
 *
 * brief: 简要说明
 *
 * details: 详细说明
 *
 * test-target: 测试目标
 * coverage: 覆盖率
 * notes: 注意事项
 */
```

#### 4.2 实际示例

```typescript
/**
 * file: useI18n.test.ts
 * description: useI18n Hook 单元测试
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-03-05
 * updated: 2026-03-05
 * status: active
 * tags: [test, unit, hook]
 *
 * brief: 测试 useI18n Hook 的功能
 *
 * details:
 * - 测试语言切换功能
 * - 测试翻译函数 t()
 * - 测试嵌套 key 支持
 * - 测试模板变量支持
 *
 * test-target: src/app/hooks/useI18n.ts
 * coverage: 90%+
 * notes: 使用 Vitest + React Testing Library
 */

// vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "testing-library/react";

// ... 测试实现
```

### 5. Electron 文件标头

#### 5.1 格式定义

```javascript
/**
 * file: 文件名.js
 * description: 文件描述
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-03-05
 * updated: 2026-03-05
 * status: active
 * tags: [electron, main-process, ipc]
 *
 * brief: 简要说明
 *
 * details: 详细说明
 *
 * dependencies: 依赖列表
 * notes: 注意事项
 */
```

#### 5.2 实际示例

```javascript
/**
 * file: main.js
 * description: Electron 主进程入口文件 · 创建窗口、托盘和 IPC 通信
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-02-26
 * updated: 2026-03-05
 * status: active
 * tags: [electron, main-process, ipc]
 *
 * brief: Electron 主进程配置
 *
 * details:
 * - 创建 BrowserWindow（1400x900，最小 1200x700）
 * - 系统托盘集成
 * - IPC 通信（preload 脚本）
 * - 自动更新（electron-updater）
 * - 安全配置（contextIsolation, nodeIntegration: false）
 *
 * dependencies: Electron, electron-updater
 * notes: 需要配合 preload.js 使用
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');

// ... 代码实现
```

---

## 标头规范实施指南

### 1. 新文件创建

#### 1.1 创建新文件时

1. **复制标头模板**：从本规范中复制对应文件类型的标头模板
2. **填写必填字段**：填写所有必填字段（file, description, author, version, created, updated, status, tags）
3. **填写可选字段**：根据需要填写可选字段（brief, details, dependencies, exports, notes）
4. **更新日期**：每次修改文件时更新 updated 字段
5. **更新版本**：重大修改时更新 version 字段（遵循语义化版本）

#### 1.2 标头模板

**TypeScript/JavaScript 文件模板**：
```typescript
/**
 * file: 文件名.tsx
 * description: 文件描述
 * author: YYC³ Team
 * version: v1.0.0
 * created: YYYY-MM-DD
 * updated: YYYY-MM-DD
 * status: active
 * tags: [标签1, 标签2, 标签3]
 *
 * brief: 简要说明
 *
 * details: 详细说明
 *
 * dependencies: 依赖列表
 * exports: 导出内容
 * notes: 注意事项
 */
```

### 2. 现有文件更新

#### 2.1 更新现有文件时

1. **添加标头**：如果文件没有标头，添加完整的标头
2. **更新标头**：如果文件有标头但不规范，更新为规范格式
3. **更新日期**：每次修改文件时更新 updated 字段
4. **更新版本**：重大修改时更新 version 字段
5. **更新状态**：如果文件状态发生变化，更新 status 字段

#### 2.2 批量更新策略

1. **按模块更新**：按模块逐个更新，确保不遗漏
2. **优先级排序**：优先更新核心文件（types, hooks, components）
3. **代码审查**：更新后进行代码审查，确保标头正确
4. **测试验证**：更新后运行测试，确保没有破坏功能

### 3. 标头维护

#### 3.1 日常维护

- **更新日期**：每次修改文件时更新 updated 字段
- **更新版本**：重大修改时更新 version 字段
- **更新状态**：文件状态发生变化时更新 status 字段
- **更新标签**：文件功能变化时更新 tags 字段

#### 3.2 定期审查

- **每月审查**：每月审查一次标头规范执行情况
- **季度更新**：每季度更新一次标头规范标准
- **年度总结**：每年总结标头规范执行效果

---

## 标头规范检查工具

### 1. 自动检查脚本

创建 `scripts/check-headers.js` 脚本，自动检查所有文件的标头规范：

```javascript
const fs = require('fs');
const path = require('path');

const REQUIRED_FIELDS = ['file', 'description', 'author', 'version', 'created', 'updated', 'status', 'tags'];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // 检查是否有标头
  if (!lines[0].includes('/**')) {
    return { valid: false, error: 'Missing header' };
  }

  // 检查必填字段
  const missingFields = REQUIRED_FIELDS.filter(field => !content.includes(field));
  if (missingFields.length > 0) {
    return { valid: false, error: `Missing fields: ${missingFields.join(', ')}` };
  }

  return { valid: true };
}

function checkDirectory(dir) {
  const files = fs.readdirSync(dir);
  let validCount = 0;
  let invalidCount = 0;
  const invalidFiles = [];

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      return;
    }

    if (!file.match(/\.(ts|tsx|js|jsx|css|scss)$/)) {
      return;
    }

    const result = checkFile(filePath);
    if (result.valid) {
      validCount++;
    } else {
      invalidCount++;
      invalidFiles.push({ file, error: result.error });
    }
  });

  console.log(`Valid: ${validCount}, Invalid: ${invalidCount}`);
  if (invalidFiles.length > 0) {
    console.log('Invalid files:');
    invalidFiles.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }
}

checkDirectory('./src');
```

### 2. ESLint 规则

创建 `.eslintrc.js` 规则，强制执行标头规范：

```javascript
module.exports = {
  rules: {
    'header/header': [
      'error',
      'block',
      [
        '*',
        {
          pattern: ' file: .+\\n description: .+\\n author: .+\\n version: .+\\n created: .+\\n updated: .+\\n status: .+\\n tags: .+',
          template: `/**
 * file: FILENAME
 * description: DESCRIPTION
 * author: YYC³ Team
 * version: v1.0.0
 * created: YYYY-MM-DD
 * updated: YYYY-MM-DD
 * status: active
 * tags: [TAG1, TAG2, TAG3]
 */`,
        },
      ],
    ],
  },
};
```

### 3. Git Hook

创建 `.git/hooks/pre-commit` 钩子，提交前检查标头规范：

```bash
#!/bin/bash

# 检查修改的文件是否有标头
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|css|scss)$')

if [ -z "$FILES" ]; then
  exit 0
fi

node scripts/check-headers.js

if [ $? -ne 0 ]; then
  echo "❌ Header check failed. Please add proper headers to your files."
  exit 1
fi

echo "✅ Header check passed."
exit 0
```

---

## 标头规范最佳实践

### 1. 标头编写原则

- **简洁明了**：描述要简洁明了，一句话概括
- **准确完整**：信息要准确完整，不遗漏重要信息
- **统一格式**：格式要统一，便于阅读和维护
- **及时更新**：信息要及时更新，保持最新状态

### 2. 标头内容建议

- **description**：一句话概括文件用途，不超过 50 字
- **brief**：简要说明文件功能，不超过 100 字
- **details**：详细说明文件功能、特性和注意事项
- **dependencies**：列出主要依赖，便于理解代码关系
- **exports**：列出主要导出内容，便于快速了解文件接口
- **notes**：列出重要注意事项，避免使用错误

### 3. 标头版本管理

- **语义化版本**：遵循语义化版本规范（MAJOR.MINOR.PATCH）
- **MAJOR**：不兼容的 API 修改
- **MINOR**：向下兼容的功能性新增
- **PATCH**：向下兼容的问题修正

### 4. 标头标签规范

- **标签分类**：按类型、功能、模块分类
- **标签数量**：每个文件 2-4 个标签
- **标签顺序**：类型标签在前，功能标签在后

---

## 附录

### A. 标头规范检查清单

#### 新文件创建检查清单

- [ ] 复制标头模板
- [ ] 填写必填字段
- [ ] 填写可选字段
- [ ] 更新创建日期
- [ ] 选择合适的状态
- [ ] 添加相关标签

#### 现有文件更新检查清单

- [ ] 检查是否有标头
- [ ] 检查标头是否规范
- [ ] 更新修改日期
- [ ] 更新版本号（如需要）
- [ ] 更新状态（如需要）
- [ ] 更新标签（如需要）

### B. 标头规范术语表

| 术语 | 定义 |
| ---- | ---- |
| 标头 | 文件开头的注释块，包含文件信息 |
| 必填字段 | 必须填写的标头字段 |
| 可选字段 | 可选填写的标头字段 |
| 状态 | 文件的当前状态 |
| 标签 | 文件的分类标签 |
| 版本号 | 文件的版本号，遵循语义化版本 |

### C. 参考文档

- [YYC³ CloudPivot Intelli-Matrix 项目文档](../00-YYC3-CP-IM-项目总览-目录索引/)
- [ESLint 文档](https://eslint.org/docs/latest/)
- [语义化版本](https://semver.org/lang/zh-CN/)
- [Git Hooks](https://git-scm.com/book/zh/v2/自定义-Git-Git-钩子)

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v2.1.0 | 2026-11-02 | 统一标头标尾 · 品牌标语与格式规范化 · 修正 file 字段与 tags 写法 | YYC³ Team |
| v2.0.0 | 2026-03-25 | 建立全局代码标头规范标准 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
