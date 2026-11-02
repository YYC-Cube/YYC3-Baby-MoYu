---
file: YYC3-组件保存-复用指南.md
title: YYC³ 组件保存与复用指南
description: 组件保存、Monorepo 复用架构、发布与集成方案
author: YYC³ Team <admin@0379.email>
version: v1.1.0
created: 2026-03-27
updated: 2026-11-02
status: stable
tags: [guide, component, reuse, monorepo]
category: guide
language: zh-CN
audience: developers,managers
complexity: intermediate
---

# YYC³ 组件保存与复用指南

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 📋 目录导航

1. [组件复用架构](#-组件复用架构)
2. [Monorepo结构设计](#-monorepo结构设计)
3. [组件包发布流程](#-组件包发布流程)
4. [组件版本管理](#-组件版本管理)
5. [项目集成方案](#-项目集成方案)
6. [组件文档管理](#-组件文档管理)
7. [最佳实践](#-最佳实践)

---

## 🏗️ 组件复用架构

### 架构设计原则

#### 1. **Monorepo架构**
- 使用Monorepo管理多个组件包
- 统一的代码规范和构建流程
- 共享依赖和工具配置
- 简化跨包依赖管理

#### 2. **包分类策略**
- **@yyc3/ui** - UI基础组件包
- **@yyc3/business** - 业务组件包
- **@yyc3/smart** - Smart组件包
- **@yyc3/effects** - 特效组件包
- **@yyc3/navigation** - 导航组件包
- **@yyc3/hooks** - Hooks包
- **@yyc3/utils** - 工具函数包

#### 3. **依赖管理**
- 使用pnpm workspace管理依赖
- 统一版本管理
- 避免重复依赖
- 优化构建性能

---

## 📦 Monorepo结构设计

### 推荐的Monorepo结构

```
yyc3-component-library/
├── packages/                          # 📦 组件包目录
│   ├── ui/                          # 🎨 UI基础组件包
│   │   ├── src/                     # 源代码
│   │   │   ├── components/          # 组件源码
│   │   │   │   ├── button/         # Button组件
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── button.tsx
│   │   │   │   │   ├── button.test.tsx
│   │   │   │   │   └── button.stories.tsx
│   │   │   │   ├── input/          # Input组件
│   │   │   │   │   └── ...
│   │   │   │   ├── dialog/         # Dialog组件
│   │   │   │   │   └── ...
│   │   │   │   └── index.ts       # 统一导出
│   │   │   ├── hooks/              # Hooks
│   │   │   │   └── index.ts
│   │   │   ├── utils/              # 工具函数
│   │   │   │   └── index.ts
│   │   │   ├── styles/             # 样式
│   │   │   │   └── globals.css
│   │   │   └── index.ts           # 包入口
│   │   ├── package.json            # 包配置
│   │   ├── tsconfig.json           # TypeScript配置
│   │   ├── tailwind.config.js      # Tailwind配置
│   │   ├── README.md               # 包文档
│   │   └── CHANGELOG.md           # 变更日志
│   │
│   ├── business/                   # 💼 业务组件包
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── dashboard/     # Dashboard组件
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── dashboard.tsx
│   │   │   │   │   ├── dashboard.test.tsx
│   │   │   │   │   └── dashboard.stories.tsx
│   │   │   │   ├── customers/     # Customers组件
│   │   │   │   │   └── ...
│   │   │   │   ├── orders/        # Orders组件
│   │   │   │   │   └── ...
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── README.md
│   │   └── CHANGELOG.md
│   │
│   ├── smart/                      # 🤖 Smart组件包
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── smart-sales/   # SmartSales组件
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   ├── smart-sales.tsx
│   │   │   │   │   ├── smart-sales.test.tsx
│   │   │   │   │   └── smart-sales.stories.tsx
│   │   │   │   ├── smart-prediction/ # SmartPrediction组件
│   │   │   │   │   └── ...
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── README.md
│   │   └── CHANGELOG.md
│   │
│   ├── effects/                    # ✨ 特效组件包
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── 3d-effects/   # 3DEffects组件
│   │   │   │   │   └── ...
│   │   │   │   ├── micro-interactions/ # MicroInteractions组件
│   │   │   │   │   └── ...
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── README.md
│   │   └── CHANGELOG.md
│   │
│   ├── navigation/                 # 🧭 导航组件包
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── tab-navigation/ # TabNavigation组件
│   │   │   │   │   └── ...
│   │   │   │   ├── sidebar/       # Sidebar组件
│   │   │   │   │   └── ...
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── README.md
│   │   └── CHANGELOG.md
│   │
│   ├── hooks/                      # 🪝 Hooks包
│   │   ├── src/
│   │   │   ├── use-persisted-state.ts
│   │   │   ├── use-navigation-context.ts
│   │   │   ├── use-notifications.ts
│   │   │   ├── use-responsive.ts
│   │   │   ├── use-gestures.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── README.md
│   │   └── CHANGELOG.md
│   │
│   └── utils/                      # 🔧 工具函数包
│       ├── src/
│       │   ├── cn.ts
│       │   ├── format-date.ts
│       │   ├── format-number.ts
│       │   ├── debounce.ts
│       │   ├── throttle.ts
│       │   └── index.ts
│       ├── package.json
│       ├── tsconfig.json
│       ├── README.md
│       └── CHANGELOG.md
│
├── apps/                           # 🚀 应用示例
│   ├── demo/                       # 演示应用
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── docs/                       # 文档网站
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── .github/                        # GitHub配置
│   └── workflows/                  # CI/CD工作流
│       ├── test.yml
│       ├── build.yml
│       └── release.yml
│
├── docs/                           # 📚 文档
│   ├── CONTRIBUTING.md               # 贡献指南
│   ├── DEVELOPMENT.md               # 开发指南
│   ├── PUBLISHING.md               # 发布指南
│   └── VERSIONING.md               # 版本管理
│
├── scripts/                        # 🔧 脚本
│   ├── build.js                    # 构建脚本
│   ├── release.js                  # 发布脚本
│   └── sync-versions.js            # 版本同步脚本
│
├── .gitignore                      # Git忽略文件
├── .npmrc                          # npm配置
├── pnpm-workspace.yaml             # pnpm工作空间配置
├── package.json                    # 根包配置
├── pnpm-lock.yaml                 # pnpm锁文件
├── turbo.json                     # Turborepo配置
├── tsconfig.json                  # TypeScript配置
├── .eslintrc.js                  # ESLint配置
├── .prettierrc.js                # Prettier配置
└── README.md                      # 项目说明
```

### 配置文件示例

#### pnpm-workspace.yaml

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

#### package.json (根目录)

```json
{
  "name": "yyc3-component-library",
  "version": "1.0.0",
  "private": true,
  "description": "YYC³ Component Library - Monorepo",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean",
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "turbo run build --filter=... && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.26.2",
    "@types/node": "^20.10.0",
    "turbo": "^1.11.0",
    "typescript": "^5.3.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.10.0"
}
```

#### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

---

## 🚀 组件包发布流程

### 1. 包配置示例

#### packages/ui/package.json

```json
{
  "name": "@yyc3/ui",
  "version": "1.0.0",
  "description": "YYC³ UI基础组件库",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles": "./dist/styles.css"
  },
  "files": [
    "dist",
    "README.md",
    "CHANGELOG.md"
  ],
  "scripts": {
    "dev": "vite",
    "build": "tsup",
    "test": "jest",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-dialog": "^1.1.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "tsup": "^8.0.0",
    "vite": "^5.0.0",
    "jest": "^29.7.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/YYC-Cube/yyc3-component-library.git",
    "directory": "packages/ui"
  },
  "keywords": [
    "yyc3",
    "ui",
    "components",
    "react",
    "tailwindcss"
  ],
  "author": "YYC³ Team <admin@0379.email>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/YYC-Cube/yyc3-component-library/issues"
  },
  "homepage": "https://github.com/YYC-Cube/yyc3-component-library#readme"
}
```

#### packages/ui/tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.tsx", "**/*.stories.tsx"]
}
```

#### packages/ui/tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  treeshake: true,
  onSuccess: 'npm run build:styles'
});
```

### 2. 组件导出结构

#### packages/ui/src/components/button/index.tsx

```typescript
/**
 * @file button/index.tsx
 * @description Button组件导出
 * @author YYC³ Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 YanYuCloudCube™（YYC³）
 */

export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';
```

#### packages/ui/src/components/index.ts

```typescript
/**
 * @file components/index.ts
 * @description 组件统一导出
 * @author YYC³ Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 YanYuCloudCube™（YYC³）
 */

// UI基础组件
export * from './button';
export * from './input';
export * from './dialog';
export * from './card';
export * from './table';
export * from './badge';
export * from './avatar';
export * from './tooltip';
export * from './alert';
export * from './skeleton';
// ... 其他组件
```

#### packages/ui/src/index.ts

```typescript
/**
 * @file index.ts
 * @description 包入口文件
 * @author YYC³ Team
 * @version 1.0.0
 * @license MIT
 * @copyright 2026 YanYuCloudCube™（YYC³）
 */

// 组件
export * from './components';

// Hooks
export * from './hooks';

// 工具函数
export * from './utils';

// 样式
export './styles/globals.css';
```

### 3. 发布流程

#### 步骤1：构建包

```bash
# 进入包目录
cd packages/ui

# 安装依赖
pnpm install

# 构建包
pnpm build

# 运行测试
pnpm test

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint
```

#### 步骤2：更新版本

```bash
# 使用changeset管理版本
cd ../..

# 创建changeset
pnpm changeset

# 选择要发布的包
# 选择版本类型（major/minor/patch）
# 添加变更说明

# 更新版本
pnpm version-packages
```

#### 步骤3：发布到npm

```bash
# 登录npm
npm login

# 发布包
pnpm release

# 或者单独发布某个包
cd packages/ui
npm publish
```

---

## 📊 组件版本管理

### 语义化版本控制 (SemVer)

#### 版本格式

```
MAJOR.MINOR.PATCH

例如: 1.0.0
- MAJOR: 主版本号（不兼容的API修改）
- MINOR: 次版本号（向下兼容的功能新增）
- PATCH: 修订号（向下兼容的问题修正）
```

#### 版本更新规则

| 变更类型 | 版本变化 | 示例 | 说明 |
| ---- | ---- | ---- | ---- |
| **破坏性变更** | MAJOR+1 | 1.0.0 → 2.0.0 | 不兼容的API修改 |
| **新功能** | MINOR+1 | 1.0.0 → 1.1.0 | 向下兼容的功能新增 |
| **Bug修复** | PATCH+1 | 1.0.0 → 1.0.1 | 向下兼容的问题修正 |

### Changesets配置

#### .changeset/config.json

```json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.1/schema.json",
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

#### 创建Changeset

```bash
# 创建changeset
pnpm changeset

# 按照提示操作：
# 1. 选择要更新的包（可以多选）
# 2. 选择版本类型（major/minor/patch）
# 3. 添加变更说明

# 示例：
# ? Which packages would you like to include? @yyc3/ui, @yyc3/business
# ? Which packages should have a major bump? none
# ? Which packages should have a minor bump? @yyc3/ui
# ? Which packages should have a patch bump? @yyc3/business
# ? Please enter a summary for this change:
#   - 添加新的Button组件变体
#   - 修复Dashboard组件的bug
```

#### 版本更新

```bash
# 应用changeset并更新版本
pnpm version-packages

# 这会：
# 1. 更新package.json中的版本号
# 2. 生成CHANGELOG.md
# 3. 创建git commit
```

### CHANGELOG.md示例

```markdown
# @yyc3/ui

## 1.2.0

### Minor Changes

- 8a5f2a: 添加新的Button组件变体（ghost, link）
- 3b2c1d: 优化Input组件的可访问性

### Patch Changes

- 1a2b3c: 修复Dialog组件的z-index问题
- 4d5e6f: 更新依赖到最新版本

## 1.1.0

### Minor Changes

- 7f8e9d: 添加Card组件
- 2c3d4e: 添加Badge组件

### Patch Changes

- 5a6b7c: 修复Button组件的样式问题

## 1.0.0

### Major Changes

- 初始版本发布
- 包含45个UI基础组件
- 支持TypeScript
- 支持Tailwind CSS
```

---

## 🔗 项目集成方案

### 1. 安装组件包

```bash
# 安装UI基础组件包
npm install @yyc3/ui

# 安装业务组件包
npm install @yyc3/business

# 安装Smart组件包
npm install @yyc3/smart

# 安装所有组件包
npm install @yyc3/ui @yyc3/business @yyc3/smart @yyc3/effects @yyc3/navigation
```

### 2. 配置Tailwind CSS

#### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@yyc3/ui/**/*.{js,jsx,ts,tsx}',
    './node_modules/@yyc3/business/**/*.{js,jsx,ts,tsx}',
    './node_modules/@yyc3/smart/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
```

#### globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### 3. 使用组件

```tsx
import { Button, Input, Dialog } from '@yyc3/ui';
import { Dashboard } from '@yyc3/business';
import { SmartSales } from '@yyc3/smart';

function App() {
  return (
    <div>
      <Button>点击按钮</Button>
      <Input placeholder="请输入内容" />
      <Dialog>
        <DialogContent>
          对话框内容
        </DialogContent>
      </Dialog>
      <Dashboard currentLanguage="zh" onNavigate={() => {}} />
      <SmartSales currentLanguage="zh" />
    </div>
  );
}
```

---

## 📚 组件文档管理

### 1. 文档网站

使用Storybook构建组件文档网站：

#### 安装Storybook

```bash
# 安装Storybook
npx storybook@latest init

# 配置Storybook
```

#### .storybook/main.ts

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../packages/ui/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../packages/business/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../packages/smart/src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
```

#### .storybook/preview.ts

```typescript
import type { Preview } from '@storybook/react';
import '../packages/ui/src/styles/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
```

### 2. 组件Story示例

#### packages/ui/src/components/button/button.stories.tsx

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './index';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: '按钮',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: '删除',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: '轮廓按钮',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: '幽灵按钮',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: '链接按钮',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: '小按钮',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: '大按钮',
  },
};

export const Icon: Story = {
  args: {
    size: 'icon',
    children: '🎨',
  },
};
```

---

## ✨ 最佳实践

### 1. 组件开发最佳实践

#### 单一职责原则

```typescript
// ✅ 推荐：每个组件只做一件事
function Button({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>;
}

function IconButton({ icon, onClick }) {
  return <Button onClick={onClick}>{icon}</Button>;
}

// ❌ 不推荐：一个组件做太多事情
function ComplexButton({ children, icon, onClick, isIcon, ... }) {
  // 混合了多种职责
}
```

#### 组件组合优于配置

```typescript
// ✅ 推荐：使用组件组合
<Dialog>
  <DialogHeader>
    <DialogTitle>标题</DialogTitle>
    <DialogDescription>描述</DialogDescription>
  </DialogHeader>
  <DialogContent>内容</DialogContent>
  <DialogFooter>
    <Button>确认</Button>
  </DialogFooter>
</Dialog>

// ❌ 不推荐：使用复杂配置
<Dialog
  title="标题"
  description="描述"
  content="内容"
  footer={<Button>确认</Button>}
/>
```

#### 使用TypeScript类型

```typescript
// ✅ 推荐：使用TypeScript类型
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, ...props }, ref) => {
    return <button ref={ref} {...props} />;
  }
);

// ❌ 不推荐：使用any类型
const Button = ({ variant, size, ...props }: any) => {
  return <button {...props} />;
};
```

### 2. 性能优化最佳实践

#### 使用React.memo

```typescript
// ✅ 推荐：使用React.memo避免不必要的重渲染
const Button = React.memo<ButtonProps>(
  ({ children, onClick }) => {
    return <button onClick={onClick}>{children}</button>;
  }
);
```

#### 使用useMemo和useCallback

```typescript
// ✅ 推荐：使用useMemo缓存计算结果
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(props.data);
}, [props.data]);

// ✅ 推荐：使用useCallback缓存回调函数
const handleClick = useCallback(() => {
  console.log('clicked');
}, []);
```

### 3. 可访问性最佳实践

#### 提供ARIA属性

```typescript
// ✅ 推荐：提供适当的ARIA属性
<button
  aria-label="关闭对话框"
  aria-describedby="dialog-description"
>
  关闭
</button>
```

#### 支持键盘导航

```typescript
// ✅ 推荐：支持键盘导航
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  onClick={handleClick}
>
  点击
</div>
```

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.1.0 | 2026-11-02 | 统一标头标尾 · 品牌标语与格式规范化 · 补齐 YAML 元数据与变更历史 | YYC³ Team |
| v1.0.0 | 2026-03-27 | 初始版本，建立组件保存与复用流程 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
