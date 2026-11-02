---
file: YYC3-拆分组件-存放利用.md
title: YYC³ 组件拆分后存放与再利用完整指南
description: 组件拆分后的存放架构、包管理、复用与版本升级
author: YYC³ Team <admin@0379.email>
version: v1.1.0
created: 2026-03-27
updated: 2026-11-02
status: stable
tags: [guide, component, monorepo, reuse]
category: guide
language: zh-CN
audience: developers,managers
complexity: intermediate
---

# YYC³ 组件拆分后存放与再利用完整指南

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 📋 目录导航

1. [拆分策略概述](#-拆分策略概述)
2. [组件存放架构](#-组件存放架构)
3. [包管理与发布](#-包管理与发布)
4. [组件再利用策略](#-组件再利用策略)
5. [依赖管理最佳实践](#-依赖管理最佳实践)
6. [版本控制与升级](#-版本控制与升级)
7. [文档与知识管理](#-文档与知识管理)
8. [实施路线图](#-实施路线图)

---

## 🎯 拆分策略概述

### 核心理念

基于原子设计方法论和 YYC³「五高五标五化」原则，将大型项目拆分为可独立管理、可复用的组件和模块。

### 拆分层次

```
YYC³ 项目（155+ 组件）
    ↓ 拆分为
├─ UI基础组件库（38个）
│   └─ @yyc3/ui
├─ 业务组件库（25个）
│   └─ @yyc3/business
└─ 核心库模块（20个）
    ├─ @yyc3/performance
    ├─ @yyc3/error
    ├─ @yyc3/metrics
    ├─ @yyc3/health
    ├─ @yyc3/multimodal
    └─ @yyc3/gitops
```

### 拆分原则

| 原则 | 说明 | 应用场景 |
| ---- | ---- | ---- |
| **单一职责** | 每个包只负责一个功能领域 | 性能优化、错误处理 |
| **高内聚低耦合** | 包内部高度内聚，包之间低耦合 | UI组件、业务组件 |
| **可独立发布** | 每个包可以独立发布和升级 | 核心库模块 |
| **可独立测试** | 每个包有独立的测试套件 | 所有组件和模块 |
| **文档完整** | 每个包有完整的文档和示例 | 所有发布的包 |

---

## 📦 组件存放架构

### 1. Monorepo vs Multi-repo

#### 方案对比

| 特性 | Monorepo | Multi-repo |
| ---- | ---- | ---- |
| **代码管理** | 统一仓库，便于管理 | 分散仓库，独立管理 |
| **依赖管理** | 共享依赖，版本一致 | 独立依赖，版本可能不同 |
| **构建速度** | 增量构建，速度快 | 独立构建，速度慢 |
| **发布流程** | 统一发布流程 | 独立发布流程 |
| **团队协作** | 便于跨团队协作 | 团队独立性强 |
| **学习成本** | 需要学习 Monorepo 工具 | 简单直接 |

#### 推荐方案：**Monorepo**

**理由**：
- YYC³ 项目组件之间有较强的关联性
- 便于统一管理版本和依赖
- 支持增量构建，提高开发效率
- 便于跨组件的代码共享和重构

### 2. Monorepo 架构设计

#### 目录结构

```
yyc3-monorepo/
├── packages/
│   ├── ui/                          # UI基础组件库
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button/
│   │   │   │   ├── card/
│   │   │   │   ├── dialog/
│   │   │   │   ├── select/
│   │   │   │   ├── input/
│   │   │   │   ├── form/
│   │   │   │   ├── table/
│   │   │   │   ├── tabs/
│   │   │   │   └── ...
│   │   │   ├── hooks/
│   │   │   ├── utils/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.js
│   │   └── README.md
│   │
│   ├── business/                     # 业务组件库
│   │   ├── src/
│   │   │   ├── monitoring/
│   │   │   │   ├── PerformanceMonitorDashboard/
│   │   │   │   ├── HealthStatusDashboard/
│   │   │   │   └── ...
│   │   │   ├── chat/
│   │   │   │   ├── ChatArea/
│   │   │   │   ├── MessageBubble/
│   │   │   │   └── ...
│   │   │   ├── knowledge/
│   │   │   │   ├── KnowledgeGraphVisualization/
│   │   │   │   └── ...
│   │   │   └── gitops/
│   │   │       ├── SyncProgressDialog/
│   │   │       └── ...
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── performance/                  # 性能优化模块
│   │   ├── src/
│   │   │   ├── connection-pool/
│   │   │   ├── query-cache/
│   │   │   └── batch-query-optimizer/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── error/                        # 错误处理模块
│   │   ├── src/
│   │   │   ├── error-classifier/
│   │   │   ├── error-aggregator/
│   │   │   └── error-handler/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── metrics/                      # 指标收集模块
│   │   ├── src/
│   │   │   ├── collector/
│   │   │   ├── storage/
│   │   │   └── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── health/                       # 健康检查模块
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── checks/
│   │   │   └── executor/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── multimodal/                   # 多模态AI模块
│   │   ├── src/
│   │   │   ├── voice-recognition/
│   │   │   ├── gesture-recognition/
│   │   │   ├── eye-tracking/
│   │   │   └── multimodal-fusion/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── gitops/                      # GitOps模块
│       ├── src/
│       │   ├── gitops-service/
│       │   ├── status-pusher/
│       │   ├── websocket-manager/
│       │   └── notification-manager/
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── apps/                            # 应用示例
│   ├── demo-app/                     # 演示应用
│   │   ├── src/
│   │   ├── package.json
│   │   └── ...
│   └── docs-app/                     # 文档应用
│       ├── src/
│       ├── package.json
│       └── ...
│
├── tools/                           # 开发工具
│   ├── eslint-config/
│   ├── prettier-config/
│   ├── typescript-config/
│   └── storybook-config/
│
├── .github/                         # GitHub配置
│   ├── workflows/
│   └── ...
│
├── package.json                      # 根package.json
├── pnpm-workspace.yaml               # pnpm工作区配置
├── turbo.json                        # Turborepo配置
├── tsconfig.json                     # 根TypeScript配置
├── .eslintrc.js                      # ESLint配置
├── .prettierrc                       # Prettier配置
├── .gitignore
└── README.md
```

### 3. 工具选择

#### Turborepo（推荐）

**优势**：
- 快速的增量构建
- 智能的任务缓存
- 并行任务执行
- 良好的TypeScript支持

**配置示例**：

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

#### pnpm-workspace

**配置示例**：

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'tools/*'
```

#### 根 package.json

```json
{
  "name": "yyc3-monorepo",
  "version": "1.0.0",
  "private": true,
  "description": "YYC³ Monorepo - 组件和模块的统一管理",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "clean": "turbo run clean && rm -rf node_modules",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo run build --filter=...^build && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.26.0",
    "turbo": "^1.10.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.0.0"
}
```

---

## 🚀 包管理与发布

### 1. 包命名规范

#### 命名规则

```bash
# 基础格式
@yyc3/<package-name>

# 示例
@yyc3/ui              # UI基础组件库
@yyc3/business        # 业务组件库
@yyc3/performance     # 性能优化模块
@yyc3/error           # 错误处理模块
@yyc3/metrics         # 指标收集模块
@yyc3/health          # 健康检查模块
@yyc3/multimodal      # 多模态AI模块
@yyc3/gitops          # GitOps模块
```

#### 包描述规范

```json
{
  "name": "@yyc3/ui",
  "version": "1.0.0",
  "description": "YYC³ UI基础组件库 - 基于 Radix UI 和 Tailwind CSS 的高质量React组件库",
  "keywords": [
    "react",
    "components",
    "ui",
    "design-system",
    "radix-ui",
    "tailwind-css",
    "yyc3"
  ],
  "author": "YYC³ Team <admin@0379.email>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/YYC-Cube/yyc3-ui.git"
  },
  "homepage": "https://yyc3.0379.email/ui"
}
```

### 2. 依赖管理策略

#### 依赖类型

| 依赖类型 | 说明 | 示例 |
| ---- | ---- | ---- |
| **dependencies** | 运行时依赖 | react, @radix-ui/react-dialog |
| **devDependencies** | 开发时依赖 | typescript, eslint, prettier |
| **peerDependencies** | 对等依赖 | react: ">=18.0.0" |
| **optionalDependencies** | 可选依赖 | @types/node |

#### UI组件包依赖

```json
{
  "name": "@yyc3/ui",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@radix-ui/react-slot": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "lucide-react": "^0.400.0"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0"
  }
}
```

#### 业务组件包依赖

```json
{
  "name": "@yyc3/business",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@yyc3/ui": "^1.0.0",
    "recharts": "^2.0.0",
    "zustand": "^4.0.0",
    "date-fns": "^3.0.0"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0",
    "@yyc3/ui": ">=1.0.0"
  }
}
```

#### 核心库包依赖

```json
{
  "name": "@yyc3/performance",
  "version": "1.0.0",
  "dependencies": {},
  "peerDependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "vitest": "^1.0.0"
  }
}
```

### 3. 版本管理

#### 语义化版本（SemVer）

```
MAJOR.MINOR.PATCH

示例：
1.0.0  - 初始版本
1.1.0  - 新增功能（向后兼容）
1.1.1  - Bug修复（向后兼容）
2.0.0  - 重大更新（不兼容）
```

#### Changesets 工作流

```bash
# 1. 创建 changeset
pnpm changeset

# 2. 选择要发布的包
# 选择变更类型：major | minor | patch

# 3. 添加变更描述
# 描述本次变更的内容

# 4. 版本升级
pnpm changeset version

# 5. 发布到 npm
pnpm changeset publish
```

#### Changeset 配置

```json
// .changeset/config.json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### 4. 发布流程

#### 自动化发布流程

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build packages
        run: pnpm build

      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
          version: pnpm changeset version
          commit: 'chore: version packages'
          title: 'chore: version packages'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### 手动发布流程

```bash
# 1. 更新版本号
pnpm changeset version

# 2. 构建所有包
pnpm build

# 3. 运行测试
pnpm test

# 4. 发布到 npm
pnpm changeset publish

# 5. 创建 GitHub Release
gh release create v1.0.0 --notes "Release notes"
```

---

## ♻️ 组件再利用策略

### 1. 安装与使用

#### 安装组件包

```bash
# 安装 UI 组件库
pnpm add @yyc3/ui

# 安装业务组件库
pnpm add @yyc3/business

# 安装核心库模块
pnpm add @yyc3/performance
pnpm add @yyc3/error
pnpm add @yyc3/metrics
pnpm add @yyc3/health
pnpm add @yyc3/multimodal
pnpm add @yyc3/gitops
```

#### 导入组件

```typescript
// 导入 UI 组件
import { Button, Card, Dialog, Select } from '@yyc3/ui';

// 导入业务组件
import { 
  PerformanceMonitorDashboard,
  ChatArea,
  KnowledgeGraphVisualization 
} from '@yyc3/business';

// 导入核心库模块
import { ConnectionPool } from '@yyc3/performance';
import { ErrorHandler } from '@yyc3/error';
import { MetricsCollector } from '@yyc3/metrics';
import { HealthChecker } from '@yyc3/health';
import { VoiceRecognition } from '@yyc3/multimodal';
import { GitOpsService } from '@yyc3/gitops';
```

### 2. 组件使用示例

#### UI组件使用

```tsx
import { Button, Card, CardHeader, CardTitle, CardContent } from '@yyc3/ui';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>卡片标题</CardTitle>
      </CardHeader>
      <CardContent>
        <p>卡片内容</p>
        <Button onClick={() => console.log('clicked')}>
          点击按钮
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### 业务组件使用

```tsx
import { PerformanceMonitorDashboard } from '@yyc3/business';

function DashboardPage() {
  return (
    <div>
      <h1>性能监控仪表板</h1>
      <PerformanceMonitorDashboard
        metrics={['cpu', 'memory', 'disk']}
        refreshInterval={5000}
        onAlert={(alert) => console.log(alert)}
      />
    </div>
  );
}
```

#### 核心库使用

```typescript
import { ConnectionPool } from '@yyc3/performance';
import { ErrorHandler } from '@yyc3/error';
import { MetricsCollector } from '@yyc3/metrics';

// 使用连接池
const pool = new ConnectionPool({
  maxConnections: 10,
  minConnections: 2,
  acquireTimeout: 30000
});

// 使用错误处理
const errorHandler = new ErrorHandler();
try {
  // 业务逻辑
} catch (error) {
  errorHandler.handle(error);
}

// 使用指标收集
const collector = new MetricsCollector();
collector.record('request_duration', 150);
collector.record('request_count', 1);
```

### 3. 主题定制

#### Tailwind CSS 配置

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@yyc3/ui/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      }
    }
  },
  plugins: []
};
```

#### CSS 变量定制

```css
/* globals.css */
:root {
  --primary-color: #0ea5e9;
  --secondary-color: #64748b;
  --background-color: #ffffff;
  --text-color: #0f172a;
  --border-color: #e2e8f0;
}

[data-theme='dark'] {
  --primary-color: #38bdf8;
  --secondary-color: #94a3b8;
  --background-color: #0f172a;
  --text-color: #f1f5f9;
  --border-color: #334155;
}
```

### 4. 组件扩展

#### 继承和扩展

```tsx
import { Button as BaseButton } from '@yyc3/ui';

interface CustomButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  children,
  ...props
}) => {
  return (
    <BaseButton
      variant={variant}
      size={size}
      disabled={loading}
      {...props}
    >
      {loading ? '加载中...' : children}
    </BaseButton>
  );
};
```

#### 组合使用

```tsx
import { Card, Button, Input } from '@yyc3/ui';

function LoginForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>登录</CardTitle>
      </CardHeader>
      <CardContent>
        <form>
          <Input label="用户名" placeholder="请输入用户名" />
          <Input label="密码" type="password" placeholder="请输入密码" />
          <Button type="submit" variant="primary">
            登录
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

---

## 🔗 依赖管理最佳实践

### 1. 依赖版本锁定

#### package-lock.json vs pnpm-lock.yaml

```bash
# 使用 pnpm-lock.yaml
pnpm install

# 锁定所有依赖版本
pnpm install --frozen-lockfile
```

#### 依赖版本范围

```json
{
  "dependencies": {
    // 精确版本（不推荐）
    "react": "18.2.0",
    
    // 补丁版本更新（推荐）
    "react": "^18.2.0",
    
    // 次版本更新（谨慎使用）
    "react": "~18.2.0",
    
    // 主版本更新（不推荐）
    "react": "18.x"
  }
}
```

### 2. 依赖更新策略

#### 定期更新

```bash
# 检查过时的依赖
pnpm outdated

# 更新所有依赖到最新版本
pnpm update

# 更新特定依赖
pnpm update react

# 交互式更新
pnpm update -i
```

#### 安全更新

```bash
# 检查安全漏洞
pnpm audit

# 自动修复安全漏洞
pnpm audit fix

# 强制修复安全漏洞（可能破坏性更新）
pnpm audit fix --force
```

### 3. 依赖优化

#### 移除未使用的依赖

```bash
# 使用 depcheck 检查未使用的依赖
npx depcheck

# 移除未使用的依赖
pnpm remove <package-name>
```

#### 依赖分析

```bash
# 分析依赖大小
npx bundlephobia-cli

# 查看依赖树
pnpm why <package-name>

# 查看所有依赖
pnpm list --depth=0
```

---

## 📝 版本控制与升级

### 1. Git 工作流

#### 分支策略

```
main (生产环境)
  ↑
  develop (开发环境)
  ↑
feature/* (功能分支)
bugfix/* (修复分支)
hotfix/* (紧急修复)
```

#### 提交规范

```bash
# feat: 新功能
git commit -m "feat: 添加 Button 组件的 loading 状态"

# fix: Bug修复
git commit -m "fix: 修复 Dialog 组件的 z-index 问题"

# docs: 文档更新
git commit -m "docs: 更新 Button 组件的使用文档"

# style: 代码格式调整
git commit -m "style: 统一代码缩进格式"

# refactor: 重构
git commit -m "refactor: 重构 Card 组件的内部逻辑"

# test: 测试相关
git commit -m "test: 添加 Button 组件的单元测试"

# chore: 构建/工具相关
git commit -m "chore: 更新 TypeScript 配置"

# perf: 性能优化
git commit -m "perf: 优化 Dialog 组件的渲染性能"
```

### 2. 版本升级策略

#### 主版本升级（Major）

```bash
# 1. 创建升级分支
git checkout -b upgrade-to-v2

# 2. 更新依赖版本
pnpm update @yyc3/ui@^2.0.0

# 3. 运行测试
pnpm test

# 4. 修复破坏性变更
# 根据升级指南修复代码

# 5. 提交变更
git add .
git commit -m "chore: 升级到 v2.0.0"

# 6. 合并到主分支
git checkout main
git merge upgrade-to-v2
```

#### 次版本升级（Minor）

```bash
# 1. 更新依赖版本
pnpm update @yyc3/ui@^1.1.0

# 2. 运行测试
pnpm test

# 3. 检查新功能
# 查看新功能的使用文档

# 4. 提交变更
git add .
git commit -m "chore: 升级到 v1.1.0"
```

#### 补丁版本升级（Patch）

```bash
# 1. 更新依赖版本
pnpm update @yyc3/ui@^1.0.1

# 2. 运行测试
pnpm test

# 3. 提交变更
git add .
git commit -m "chore: 升级到 v1.0.1"
```

### 3. 降级策略

```bash
# 1. 查看已安装的版本
pnpm list @yyc3/ui

# 2. 降级到特定版本
pnpm add @yyc3/ui@1.0.0

# 3. 运行测试
pnpm test

# 4. 提交变更
git add .
git commit -m "chore: 降级到 v1.0.0"
```

---

## 📚 文档与知识管理

### 1. 文档结构

#### 包级文档

```
@yyc3/ui/
├── README.md                    # 包文档
├── CHANGELOG.md                 # 变更日志
├── CONTRIBUTING.md              # 贡献指南
├── LICENSE                      # 许可证
├── docs/                        # 详细文档
│   ├── getting-started.md       # 快速开始
│   ├── components/              # 组件文档
│   │   ├── button.md
│   │   ├── card.md
│   │   ├── dialog.md
│   │   └── ...
│   ├── theming.md               # 主题定制
│   ├── migration.md             # 迁移指南
│   └── faq.md                   # 常见问题
└── examples/                    # 示例代码
    ├── basic-usage/
    ├── advanced-usage/
    └── real-world/
```

#### README.md 模板

```markdown
# @yyc3/ui

YYC³ UI基础组件库 - 基于 Radix UI 和 Tailwind CSS 的高质量React组件库

## 特性

- ✅ 基于 Radix UI，无障碍性良好
- ✅ 使用 Tailwind CSS，样式灵活
- ✅ TypeScript 支持，类型安全
- ✅ 完整的文档和示例
- ✅ 高度可定制
- ✅ 性能优化

## 安装

\`\`\`bash
pnpm add @yyc3/ui
\`\`\`

## 快速开始

\`\`\`tsx
import { Button } from '@yyc3/ui';

function App() {
  return <Button>点击我</Button>;
}
\`\`\`

## 文档

完整文档请访问：https://yyc3.0379.email/ui

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 许可证

MIT License
```

#### 组件文档模板

```markdown
# Button

按钮组件，支持多种样式和状态。

## 特性

- 多种变体：primary, secondary, ghost, link
- 多种尺寸：small, medium, large, icon
- 支持 loading 状态
- 完整的无障碍支持

## API

### Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| variant | 'primary' \| 'secondary' \| 'ghost' \| 'link' | 'primary' | 按钮样式 |
| size | 'small' \| 'medium' \| 'large' \| 'icon' | 'medium' | 按钮大小 |
| disabled | boolean | false | 是否禁用 |
| loading | boolean | false | 是否加载中 |
| onClick | () => void | - | 点击事件 |

## 示例

### 基础用法

\`\`\`tsx
<Button>点击我</Button>
\`\`\`

### 不同变体

\`\`\`tsx
<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="ghost">幽灵按钮</Button>
\`\`\`

### 不同尺寸

\`\`\`tsx
<Button size="small">小按钮</Button>
<Button size="medium">中按钮</Button>
<Button size="large">大按钮</Button>
\`\`\`

### 加载状态

\`\`\`tsx
<Button loading>加载中...</Button>
\`\`\`

## 最佳实践

- 使用 primary 样式表示主要操作
- 使用 secondary 样式表示次要操作
- 为按钮提供清晰的标签文本
- 避免在按钮内嵌套复杂组件
```

### 2. Storybook 集成

#### 安装 Storybook

```bash
# 安装 Storybook
pnpm add -D @storybook/react @storybook/addon-essentials @storybook/addon-interactions

# 初始化 Storybook
npx storybook@latest init
```

#### 组件 Story 示例

```tsx
// stories/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@yyc3/ui';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'link']
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'icon']
    },
    disabled: {
      control: 'boolean'
    },
    loading: {
      control: 'boolean'
    }
  }
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: '主要按钮'
  }
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: '次要按钮'
  }
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: '幽灵按钮'
  }
};

export const Small: Story = {
  args: {
    size: 'small',
    children: '小按钮'
  }
};

export const Medium: Story = {
  args: {
    size: 'medium',
    children: '中按钮'
  }
};

export const Large: Story = {
  args: {
    size: 'large',
    children: '大按钮'
  }
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: '禁用按钮'
  }
};

export const Loading: Story = {
  args: {
    loading: true,
    children: '加载中...'
  }
};
```

#### Storybook 配置

```javascript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|ts|tsx)'
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-themes'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {}
  },
  docs: {
    autodocs: 'tag'
  }
};

export default config;
```

### 3. 知识管理

#### 组件使用记录

```markdown
# 组件使用记录

## Button 组件

### 使用场景
- 表单提交按钮
- 操作触发按钮
- 导航按钮

### 使用次数
- 项目A: 50次
- 项目B: 30次
- 项目C: 20次

### 常见问题
1. 如何自定义按钮样式？
   - 使用 className 属性添加自定义样式
   
2. 如何禁用按钮？
   - 使用 disabled 属性

### 改进建议
- 添加更多图标支持
- 优化加载状态的动画
```

#### 组件性能监控

```typescript
// 组件性能监控工具
class ComponentPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  record(componentName: string, renderTime: number) {
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, []);
    }
    this.metrics.get(componentName)!.push(renderTime);
  }

  getAverage(componentName: string): number {
    const times = this.metrics.get(componentName) || [];
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getSlowComponents(threshold: number = 100): string[] {
    const slowComponents: string[] = [];
    for (const [name, times] of this.metrics.entries()) {
      const avg = this.getAverage(name);
      if (avg > threshold) {
        slowComponents.push(name);
      }
    }
    return slowComponents;
  }
}
```

---

## 🗺️ 实施路线图

### 阶段1：基础设施搭建（第1-2周）

#### 任务清单

- [ ] 初始化 Monorepo 项目
- [ ] 配置 Turborepo
- [ ] 配置 pnpm-workspace
- [ ] 配置 TypeScript
- [ ] 配置 ESLint 和 Prettier
- [ ] 配置 GitHub Actions
- [ ] 配置 Changesets
- [ ] 创建文档模板

#### 交付物

- ✅ 可用的 Monorepo 项目
- ✅ 完整的配置文件
- ✅ 自动化 CI/CD 流程
- ✅ 文档模板

---

### 阶段2：UI基础组件库（第3-5周）

#### 任务清单

- [ ] 拆分 UI 组件到 `@yyc3/ui` 包
- [ ] 为每个组件编写单元测试
- [ ] 为每个组件创建 Storybook Story
- [ ] 编写组件文档
- [ ] 配置 Tailwind CSS
- [ ] 创建设计系统文档
- [ ] 发布 `@yyc3/ui` v1.0.0

#### 交付物

- ✅ `@yyc3/ui` 包
- ✅ 完整的测试覆盖
- ✅ Storybook 文档
- ✅ 组件使用文档
- ✅ 设计系统文档

---

### 阶段3：业务组件库（第6-8周）

#### 任务清单

- [ ] 拆分业务组件到 `@yyc3/business` 包
- [ ] 为每个组件编写单元测试
- [ ] 为每个组件创建 Storybook Story
- [ ] 编写组件文档
- [ ] 配置依赖关系
- [ ] 发布 `@yyc3/business` v1.0.0

#### 交付物

- ✅ `@yyc3/business` 包
- ✅ 完整的测试覆盖
- ✅ Storybook 文档
- ✅ 组件使用文档

---

### 阶段4：核心库模块（第9-12周）

#### 任务清单

- [ ] 拆分性能优化模块到 `@yyc3/performance`
- [ ] 拆分错误处理模块到 `@yyc3/error`
- [ ] 拆分指标收集模块到 `@yyc3/metrics`
- [ ] 拆分健康检查模块到 `@yyc3/health`
- [ ] 拆分多模态AI模块到 `@yyc3/multimodal`
- [ ] 拆分GitOps模块到 `@yyc3/gitops`
- [ ] 为每个模块编写单元测试
- [ ] 编写模块文档
- [ ] 发布所有核心库模块 v1.0.0

#### 交付物

- ✅ 6个核心库模块
- ✅ 完整的测试覆盖
- ✅ 模块使用文档
- ✅ API 文档

---

### 阶段5：文档与示例（第13-14周）

#### 任务清单

- [ ] 创建完整的使用文档
- [ ] 创建迁移指南
- [ ] 创建最佳实践文档
- [ ] 创建示例项目
- [ ] 创建视频教程
- [ ] 创建 FAQ 文档

#### 交付物

- ✅ 完整的使用文档
- ✅ 迁移指南
- ✅ 最佳实践文档
- ✅ 示例项目
- ✅ 视频教程
- ✅ FAQ 文档

---

## 🎯 总结

### 核心要点

1. **Monorepo 架构**
   - 使用 Turborepo 进行高效管理
   - 统一的依赖和版本管理
   - 支持增量构建和并行执行

2. **包管理策略**
   - 统一的包命名规范
   - 清晰的依赖关系
   - 语义化版本管理
   - 自动化发布流程

3. **组件再利用**
   - 简单的安装和导入
   - 灵活的主题定制
   - 支持组件扩展和组合
   - 完整的文档和示例

4. **最佳实践**
   - 定期依赖更新和安全检查
   - 完整的测试覆盖
   - 清晰的文档和示例
   - 持续的性能监控

### 预期收益

- **开发效率提升 50%**：组件复用，减少重复开发
- **代码质量提升 40%**：统一标准，减少错误
- **维护成本降低 60%**：独立管理，降低耦合
- **团队协作提升 30%**：清晰分工，提高效率

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.1.0 | 2026-11-02 | 统一标头标尾 · 品牌标语与格式规范化 · 补齐 YAML 元数据与变更历史 | YYC³ Team |
| v1.0.0 | 2026-03-27 | 初始版本，建立组件存放与再利用方案 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
