---
file: YYC3-项目组件-分类讲解.md
title: YYC³ 项目组件分类讲解 — 原子设计五层体系
description: 原子设计五层体系、组件分类决策树与最佳实践
author: YYC³ Team <admin@0379.email>
version: v1.1.0
created: 2026-03-27
updated: 2026-11-02
status: stable
tags: [guide, component, design-system, atomic-design]
category: guide
language: zh-CN
audience: developers,managers
complexity: intermediate
---

# YYC³ 项目组件分类讲解 — 原子设计五层体系

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 📋 目录导航

1. [原子设计方法论概述](#-原子设计方法论概述)
2. [原子组件（Atoms）](#-原子组件atoms)
3. [分子组件（Molecules）](#-分子组件molecules)
4. [有机体组件（Organisms）](#-有机体组件organisms)
5. [模板组件（Templates）](#-模板组件templates)
6. [页面组件（Pages）](#-页面组件pages)
7. [组件分类决策树](#-组件分类决策树)
8. [组件层次最佳实践](#-组件层次最佳实践)

---

## 🎨 原子设计方法论概述

### 核心理念

原子设计是一种创建设计系统的分层次方法，将UI组件分解为五个层次，从最基础的原子到完整的页面。这种方法确保了设计系统的一致性、可维护性和可扩展性。

### 五层架构图

```
┌─────────────────────────────────────────┐
│          页面组件（Pages）                │  ← 完整页面
│         高保真、具体、上下文              │
├─────────────────────────────────────────┤
│         模板组件（Templates）             │  ← 页面布局
│       页面结构、内容占位、布局框架          │
├─────────────────────────────────────────┤
│        有机体组件（Organisms）             │  ← 复杂UI区块
│     由分子组成的复杂、独立、功能完整        │
├─────────────────────────────────────────┤
│        分子组件（Molecules）              │  ← 简单组合
│      由原子组成的简单、相对独立            │
├─────────────────────────────────────────┤
│         原子组件（Atoms）                  │  ← 基础元素
│      最基础、不可再分、抽象、通用           │
└─────────────────────────────────────────┘
```

### 设计优势

| 优势 | 说明 |
| ---- | ---- |
| **一致性** | 统一的设计语言和交互模式 |
| **可维护性** | 组件独立，易于修改和更新 |
| **可扩展性** | 模块化设计，支持快速扩展 |
| **可复用性** | 组件可在不同场景下复用 |
| **团队协作** | 清晰的分工和职责划分 |

---

## ⚛️ 原子组件（Atoms）

### 定义与特点

**定义**：原子组件是设计系统中最基础的UI元素，不可再分，是最小的构建单元。

**特点**：
- 最基础的UI元素
- 不可再分
- 抽象且通用
- 功能单一
- 高度可复用

### 典型原子组件清单

#### 1. 基础元素类

| 组件名称 | 描述 | 使用场景 |
| ---- | ---- | ---- |
| **Button** | 按钮组件 | 表单提交、操作触发 |
| **Input** | 输入框组件 | 数据输入、信息收集 |
| **Text** | 文本组件 | 内容展示、信息传达 |
| **Icon** | 图标组件 | 视觉引导、功能标识 |
| **Image** | 图片组件 | 内容展示、视觉装饰 |
| **Link** | 链接组件 | 页面跳转、导航 |

#### 2. 表单元素类

| 组件名称 | 描述 | 使用场景 |
| ---- | ---- | ---- |
| **Checkbox** | 复选框组件 | 多选、选项勾选 |
| **Radio** | 单选框组件 | 单选、互斥选择 |
| **Select** | 下拉选择组件 | 选项选择、数据筛选 |
| **Textarea** | 多行文本组件 | 长文本输入、内容编辑 |
| **Switch** | 开关组件 | 状态切换、功能启用 |
| **Slider** | 滑块组件 | 数值调节、范围选择 |

#### 3. 反馈元素类

| 组件名称 | 描述 | 使用场景 |
| ---- | ---- | ---- |
| **Badge** | 徽章组件 | 状态标识、数量提示 |
| **Tag** | 标签组件 | 分类标记、属性展示 |
| **Tooltip** | 提示框组件 | 辅助说明、上下文帮助 |
| **Spinner** | 加载指示器 | 加载状态、处理中 |
| **Progress** | 进度条组件 | 进度展示、完成度 |

### 原子组件设计原则

#### 1. 单一职责原则
```typescript
// ✅ 正确：单一职责
const Button = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};

// ❌ 错误：职责过多
const Button = ({ label, onClick, icon, dropdown, menu }) => {
  // 按钮不应该包含下拉菜单功能
  return <button>{label}</button>;
};
```

#### 2. 可配置性原则
```typescript
interface ButtonProps {
  // 必需属性
  label: string;
  onClick: () => void;
  
  // 可选属性
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}
```

#### 3. 无障碍性原则
```typescript
const Button = ({ label, onClick, disabled, ...props }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-disabled={disabled}
      {...props}
    >
      {label}
    </button>
  );
};
```

### 原子组件代码示例

#### Button 组件
```typescript
/**
 * @file Button.tsx
 * @description 基础按钮组件
 * @version v1.0.0
 */

import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon
}) => {
  const baseStyles = 'rounded font-medium transition-colors';
  
  const variantStyles = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    ghost: 'bg-transparent text-blue-500 hover:bg-blue-50'
  };
  
  const sizeStyles = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`}
      aria-label={label}
    >
      {loading ? 'Loading...' : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </>
      )}
    </button>
  );
};

export default Button;
```

#### Input 组件
```typescript
/**
 * @file Input.tsx
 * @description 基础输入框组件
 * @version v1.0.0
 */

import React from 'react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  error,
  label
}) => {
  return (
    <div className="flex flex-col">
      {label && (
        <label className="mb-1 text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={`px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
          error 
            ? 'border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:ring-blue-500'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        aria-invalid={!!error}
        aria-describedby={error ? 'error-message' : undefined}
      />
      {error && (
        <span id="error-message" className="mt-1 text-sm text-red-500">
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
```

---

## 🧬 分子组件（Molecules）

### 定义与特点

**定义**：分子组件由两个或多个原子组件组合而成，形成相对简单、功能明确的UI单元。

**特点**：
- 由原子组件组成
- 相对独立
- 功能明确
- 可复用性强
- 具备基本交互逻辑

### 典型分子组件清单

#### 1. 表单组合类

| 组件名称 | 组成原子 | 描述 | 使用场景 |
| ---- | ---- | ---- | ---- |
| **SearchBox** | Input + Button | 搜索框 | 内容搜索、数据筛选 |
| **FormField** | Label + Input + Error | 表单字段 | 表单输入、数据收集 |
| **CheckboxGroup** | Checkbox + Label | 复选框组 | 多选、选项勾选 |
| **RadioGroup** | Radio + Label | 单选框组 | 单选、互斥选择 |
| **DatePicker** | Input + Button + Calendar | 日期选择器 | 日期选择、时间设定 |

#### 2. 导航组合类

| 组件名称 | 组成原子 | 描述 | 使用场景 |
| ---- | ---- | ---- | ---- |
| **Breadcrumb** | Link + Separator | 面包屑导航 | 路径导航、层级展示 |
| **Pagination** | Button + Text | 分页器 | 数据分页、内容导航 |
| **TabItem** | Button + Icon + Badge | 标签页项 | 标签导航、内容切换 |
| **MenuItem** | Link + Icon + Badge | 菜单项 | 菜单导航、功能入口 |

#### 3. 信息展示类

| 组件名称 | 组成原子 | 描述 | 使用场景 |
| ---- | ---- | ---- | ---- |
| **Avatar** | Image + Badge | 头像组件 | 用户头像、状态展示 |
| **UserCard** | Avatar + Text + Badge | 用户卡片 | 用户信息、个人资料 |
| **StatusItem** | Badge + Text + Icon | 状态项 | 状态展示、信息提示 |
| **Notification** | Icon + Text + Button | 通知卡片 | 消息通知、提醒 |

### 分子组件设计原则

#### 1. 组合性原则
```typescript
// ✅ 正确：由原子组件组合
const SearchBox = ({ onSearch, placeholder }) => {
  const [value, setValue] = useState('');
  
  return (
    <div className="flex">
      <Input 
        value={value}
        onChange={setValue}
        placeholder={placeholder}
      />
      <Button 
        label="搜索" 
        onClick={() => onSearch(value)} 
      />
    </div>
  );
};
```

#### 2. 状态管理原则
```typescript
// ✅ 正确：内部状态管理
const SearchBox = ({ onSearch }) => {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async () => {
    setLoading(true);
    await onSearch(value);
    setLoading(false);
  };
  
  return (
    <div className="flex">
      <Input value={value} onChange={setValue} />
      <Button 
        label={loading ? '搜索中...' : '搜索'} 
        onClick={handleSearch}
        disabled={loading}
      />
    </div>
  );
};
```

#### 3. 可定制性原则
```typescript
interface SearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  buttonLabel?: string;
  showIcon?: boolean;
  debounceMs?: number;
}
```

### 分子组件代码示例

#### SearchBox 组件
```typescript
/**
 * @file SearchBox.tsx
 * @description 搜索框组件
 * @version v1.0.0
 */

import React, { useState, useEffect } from 'react';
import Input from './atoms/Input';
import Button from './atoms/Button';

interface SearchBoxProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  buttonLabel?: string;
  debounceMs?: number;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  onSearch,
  placeholder = '搜索...',
  buttonLabel = '搜索',
  debounceMs = 300
}) => {
  const [value, setValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs]);

  // 自动搜索
  useEffect(() => {
    if (debouncedValue) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={setValue}
        placeholder={placeholder}
      />
      <Button
        label={buttonLabel}
        onClick={() => onSearch(value)}
      />
    </div>
  );
};

export default SearchBox;
```

#### FormField 组件
```typescript
/**
 * @file FormField.tsx
 * @description 表单字段组件
 * @version v1.0.0
 */

import React from 'react';
import Input from './atoms/Input';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value?: string;
  onChange?: (name: string, value: string) => void;
  error?: string;
  required?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false
}) => {
  return (
    <div className="mb-4">
      <label className="block mb-1 text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(newValue) => onChange?.(name, newValue)}
        error={error}
      />
    </div>
  );
};

export default FormField;
```

---

## 🧬 有机体组件（Organisms）

### 定义与特点

**定义**：有机体组件由分子组件和原子组件组成，形成复杂的、功能完整的UI区块。

**特点**：
- 由分子和原子组成
- 功能完整
- 相对独立
- 复杂度高
- 业务逻辑丰富

### 典型有机体组件清单

#### 1. 导航系统类

| 组件名称 | 组成元素 | 描述 | 使用场景 |
| ---- | ---- | ---- | ---- |
| **Header** | Logo + Navigation + UserMenu | 页头导航 | 顶部导航、全局导航 |
| **Sidebar** | Menu + Navigation + Collapse | 侧边栏 | 侧边导航、功能菜单 |
| **TabBar** | TabItem + Badge + Indicator | 标签栏 | 标签导航、内容切换 |
| **BreadcrumbBar** | Breadcrumb + Separator | 面包屑栏 | 路径导航、层级展示 |

#### 2. 内容展示类

| 组件名称 | 组成元素 | 描述 | 使用场景 |
| ---- | ---- | ---- | ---- |
| **Card** | Image + Title + Description + Button | 卡片 | 内容展示、信息卡片 |
| **List** | ListItem + Avatar + Text + Action | 列表 | 数据列表、内容展示 |
| **Table** | TableHeader + TableRow + Pagination | 表格 | 数据表格、信息展示 |
| **Gallery** | Image + Caption + Overlay | 图库 | 图片展示、相册 |

#### 3. 表单系统类

| 组件名称 | 组成元素 | 描述 | 使用场景 |
| ---- | ---- | ---- | ---- |
| **Form** | FormField + Button + Validation | 表单 | 数据收集、信息提交 |
| **FilterPanel** | SearchBox + Select + Checkbox | 筛选面板 | 数据筛选、条件查询 |
| **Wizard** | Steps + Form + Navigation | 向导 | 分步表单、流程引导 |

#### 4. 反馈系统类

| 组件名称 | 组成元素 | 描述 | 使用场景 |
| ---- | ---- | ---- | ---- |
| **Modal** | Header + Content + Footer | 模态框 | 弹窗对话框、确认操作 |
| **Toast** | Icon + Text + Close | 通知提示 | 消息通知、状态反馈 |
| **Alert** | Icon + Title + Description + Action | 警告框 | 警告提示、错误提示 |
| **Drawer** | Header + Content + Close | 抽屉 | 侧边抽屉、详情展示 |

### 有机体组件设计原则

#### 1. 功能完整性原则
```typescript
// ✅ 正确：功能完整的导航栏
const Header = () => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow">
      <Logo />
      <Navigation />
      <UserMenu />
    </header>
  );
};
```

#### 2. 状态管理原则
```typescript
// ✅ 正确：复杂状态管理
const Modal = ({ isOpen, onClose, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setTimeout(() => setIsVisible(false), 300);
    }
  }, [isOpen]);
  
  if (!isVisible) return null;
  
  return (
    <div className={`modal ${isOpen ? 'modal-open' : 'modal-closing'}`}>
      {children}
    </div>
  );
};
```

#### 3. 可访问性原则
```typescript
// ✅ 正确：无障碍支持
const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // 聚焦到模态框
      const modal = document.getElementById('modal');
      modal?.focus();
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);
  
  return (
    <div
      id="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabIndex={-1}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
    </div>
  );
};
```

### 有机体组件代码示例

#### Header 组件
```typescript
/**
 * @file Header.tsx
 * @description 页头导航组件
 * @version v1.0.0
 */

import React from 'react';
import Logo from './atoms/Logo';
import Navigation from './organisms/Navigation';
import UserMenu from './organisms/UserMenu';

interface HeaderProps {
  logo?: string;
  navigationItems?: NavigationItem[];
  user?: User;
}

const Header: React.FC<HeaderProps> = ({
  logo = '/logo.svg',
  navigationItems = [],
  user
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow-md">
      <Logo src={logo} alt="Logo" />
      <Navigation items={navigationItems} />
      <UserMenu user={user} />
    </header>
  );
};

export default Header;
```

#### Modal 组件
```typescript
/**
 * @file Modal.tsx
 * @description 模态框组件
 * @version v1.0.0
 */

import React, { useEffect } from 'react';
import Button from './atoms/Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* 模态框内容 */}
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="modal-title" className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        
        {/* 内容 */}
        <div className="px-6 py-4">
          {children}
        </div>
        
        {/* 底部 */}
        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
```

---

## 📄 模板组件（Templates）

### 定义与特点

**定义**：模板组件是页面的布局结构，展示组件的排列方式，但不包含具体内容。

**特点**：
- 页面布局结构
- 内容占位符
- 布局框架
- 响应式设计
- 可复用布局

### 典型模板组件清单

#### 1. 页面布局类

| 模板名称 | 描述 | 使用场景 |
| ---- | ---- | ---- |
| **DefaultLayout** | 默认布局 | 标准页面布局 |
| **DashboardLayout** | 仪表板布局 | 数据展示页面 |
| **AuthLayout** | 认证布局 | 登录注册页面 |
| **SettingsLayout** | 设置布局 | 设置页面 |
| **EmptyLayout** | 空白布局 | 独立页面 |

#### 2. 内容布局类

| 模板名称 | 描述 | 使用场景 |
| ---- | ---- | ---- |
| **ArticleLayout** | 文章布局 | 文章详情页 |
| **ListLayout** | 列表布局 | 列表页面 |
| **GridLayout** | 网格布局 | 卡片展示页 |
| **SplitLayout** | 分栏布局 | 左右分栏页面 |

### 模板组件设计原则

#### 1. 布局灵活性原则
```typescript
// ✅ 正确：灵活的布局
const DashboardLayout = ({ sidebar, header, content }) => {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-100">{sidebar}</aside>
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white">{header}</header>
        <main className="flex-1 overflow-auto">{content}</main>
      </div>
    </div>
  );
};
```

#### 2. 响应式设计原则
```typescript
// ✅ 正确：响应式布局
const ResponsiveLayout = ({ children }) => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
};
```

#### 3. 内容占位原则
```typescript
// ✅ 正确：内容占位
const ArticleTemplate = () => {
  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-8">
        <div className="h-8 bg-gray-200 rounded mb-4" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </header>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded" />
        ))}
      </div>
    </article>
  );
};
```

### 模板组件代码示例

#### DashboardLayout 组件
```typescript
/**
 * @file DashboardLayout.tsx
 * @description 仪表板布局模板
 * @version v1.0.0
 */

import React from 'react';

interface DashboardLayoutProps {
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  sidebar,
  header,
  children
}) => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      {sidebar && (
        <aside className="w-64 bg-white shadow-lg hidden md:block">
          {sidebar}
        </aside>
      )}
      
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        {header && (
          <header className="h-16 bg-white shadow-sm">
            {header}
          </header>
        )}
        
        {/* 内容区域 */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
```

---

## 📄 页面组件（Pages）

### 定义与特点

**定义**：页面组件是高保真的、具体的、具有上下文的完整页面，由模板组件填充实际内容而成。

**特点**：
- 高保真设计
- 具体内容
- 上下文完整
- 业务逻辑完整
- 用户体验完整

### 典型页面组件清单

#### 1. 核心页面类

| 页面名称 | 描述 | 使用场景 |
| ---- | ---- | ---- |
| **HomePage** | 首页 | 网站首页、应用首页 |
| **LoginPage** | 登录页 | 用户登录 |
| **RegisterPage** | 注册页 | 用户注册 |
| **DashboardPage** | 仪表板页 | 数据仪表板 |
| **ProfilePage** | 个人资料页 | 用户资料 |

#### 2. 功能页面类

| 页面名称 | 描述 | 使用场景 |
| ---- | ---- | ---- |
| **SettingsPage** | 设置页 | 系统设置 |
| **ListPage** | 列表页 | 数据列表 |
| **DetailPage** | 详情页 | 内容详情 |
| **FormPage** | 表单页 | 数据表单 |
| **SearchPage** | 搜索页 | 搜索结果 |

### 页面组件设计原则

#### 1. 内容完整性原则
```typescript
// ✅ 正确：完整的页面内容
const HomePage = () => {
  return (
    <div>
      <HeroSection />
      <FeatureSection />
      <TestimonialSection />
      <CTASection />
      <Footer />
    </div>
  );
};
```

#### 2. 用户体验原则
```typescript
// ✅ 正确：良好的用户体验
const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError('');
    try {
      await login(values);
      // 登录成功，跳转到首页
      router.push('/dashboard');
    } catch (err) {
      setError('登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6">登录</h1>
        {error && <Alert type="error" message={error} />}
        <LoginForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
};
```

#### 3. 性能优化原则
```typescript
// ✅ 正确：性能优化
const ListPage = () => {
  const { data, loading, error } = useFetchItems();
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  
  return (
    <div>
      <h1>列表页</h1>
      <List items={data} />
      <Pagination />
    </div>
  );
};
```

### 页面组件代码示例

#### DashboardPage 组件
```typescript
/**
 * @file DashboardPage.tsx
 * @description 仪表板页面
 * @version v1.0.0
 */

import React from 'react';
import DashboardLayout from '../templates/DashboardLayout';
import Sidebar from '../organisms/Sidebar';
import Header from '../organisms/Header';
import StatCard from '../molecules/StatCard';
import Chart from '../organisms/Chart';
import RecentActivity from '../organisms/RecentActivity';

const DashboardPage: React.FC = () => {
  return (
    <DashboardLayout
      sidebar={<Sidebar />}
      header={<Header />}
    >
      <div className="space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="总用户数"
            value="1,234"
            change="+12%"
            trend="up"
          />
          <StatCard
            title="活跃用户"
            value="856"
            change="+8%"
            trend="up"
          />
          <StatCard
            title="新注册"
            value="123"
            change="+5%"
            trend="up"
          />
          <StatCard
            title="转化率"
            value="3.2%"
            change="-2%"
            trend="down"
          />
        </div>
        
        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Chart title="用户增长趋势" />
          <Chart title="活跃度分析" />
        </div>
        
        {/* 最近活动 */}
        <RecentActivity />
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
```

---

## 🌳 组件分类决策树

### 决策流程图

```
开始
  ↓
是否是最基础的UI元素？
  ↓ 是
├─→ 原子组件（Atoms）
│   - Button, Input, Text, Icon
│   - 不可再分
│   - 高度可复用
│
↓ 否
是否由2-3个原子组件简单组合？
  ↓ 是
├─→ 分子组件（Molecules）
│   - SearchBox, FormField, Avatar
│   - 相对独立
│   - 功能明确
│
↓ 否
是否是复杂的UI区块？
  ↓ 是
├─→ 有机体组件（Organisms）
│   - Header, Modal, Card
│   - 功能完整
│   - 业务逻辑丰富
│
↓ 否
是否是页面布局结构？
  ↓ 是
├─→ 模板组件（Templates）
│   - DashboardLayout, AuthLayout
│   - 内容占位
│   - 布局框架
│
↓ 否
├─→ 页面组件（Pages）
    - HomePage, LoginPage
    - 高保真
    - 上下文完整
```

### 分类检查清单

#### 原子组件检查
- [ ] 是否是最基础的UI元素？
- [ ] 是否不可再分？
- [ ] 是否功能单一？
- [ ] 是否高度可复用？

#### 分子组件检查
- [ ] 是否由2-3个原子组件组成？
- [ ] 是否相对独立？
- [ ] 是否功能明确？
- [ ] 是否具备基本交互逻辑？

#### 有机体组件检查
- [ ] 是否是复杂的UI区块？
- [ ] 是否功能完整？
- [ ] 是否业务逻辑丰富？
- [ ] 是否相对独立？

#### 模板组件检查
- [ ] 是否是页面布局结构？
- [ ] 是否包含内容占位符？
- [ ] 是否可复用？
- [ ] 是否响应式设计？

#### 页面组件检查
- [ ] 是否是高保真设计？
- [ ] 是否包含具体内容？
- [ ] 是否上下文完整？
- [ ] 是否用户体验完整？

---

## 🎯 组件层次最佳实践

### 1. 组件层次深度控制

```
推荐深度：3-5层
├─ 原子组件（第1层）
├─ 分子组件（第2层）
├─ 有机体组件（第3层）
├─ 模板组件（第4层）
└─ 页面组件（第5层）
```

### 2. 组件复用策略

| 复用级别 | 复用范围 | 示例 |
| ---- | ---- | ---- |
| 全局复用 | 整个项目 | Button, Input, Icon |
| 模块复用 | 特定模块 | SearchBox, FormField |
| 页面复用 | 特定页面 | Header, Sidebar |
| 一次性 | 单次使用 | 特定业务组件 |

### 3. 组件命名规范

```typescript
// 原子组件：简单、通用
const Button = () => {};
const Input = () => {};
const Icon = () => {};

// 分子组件：组合、功能
const SearchBox = () => {};
const FormField = () => {};
const Avatar = () => {};

// 有机体组件：复杂、完整
const Header = () => {};
const Modal = () => {};
const Card = () => {};

// 模板组件：布局、结构
const DashboardLayout = () => {};
const AuthLayout = () => {};

// 页面组件：页面、路由
const HomePage = () => {};
const LoginPage = () => {};
```

### 4. 组件文件组织

```
src/
├── components/
│   ├── atoms/           # 原子组件
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Icon.tsx
│   ├── molecules/       # 分子组件
│   │   ├── SearchBox.tsx
│   │   ├── FormField.tsx
│   │   └── Avatar.tsx
│   ├── organisms/       # 有机体组件
│   │   ├── Header.tsx
│   │   ├── Modal.tsx
│   │   └── Card.tsx
│   ├── templates/       # 模板组件
│   │   ├── DashboardLayout.tsx
│   │   └── AuthLayout.tsx
│   └── pages/           # 页面组件
│       ├── HomePage.tsx
│       └── LoginPage.tsx
```

### 5. 组件文档规范

每个组件都应该包含：
- 组件描述
- Props API
- 使用示例
- 最佳实践
- 注意事项

```typescript
/**
 * @file Button.tsx
 * @description 基础按钮组件
 * @version v1.0.0
 * 
 * @example
 * ```tsx
 * <Button label="提交" onClick={handleSubmit} variant="primary" />
 * ```
 * 
 * @best-practices
 * - 使用 primary 样式表示主要操作
 * - 使用 secondary 样式表示次要操作
 * - 为按钮提供清晰的标签文本
 * 
 * @caveats
 * - 不要在按钮内嵌套复杂组件
 * - 避免使用过长的按钮文本
 */
```

---

## 📚 总结

### 组件分类核心要点

1. **原子组件**：最基础的UI元素，不可再分
2. **分子组件**：由原子组件组成的简单组合
3. **有机体组件**：由分子组成的复杂UI区块
4. **模板组件**：页面布局结构，内容占位
5. **页面组件**：高保真的完整页面

### 设计原则

- **单一职责**：每个组件只负责一个功能
- **可复用性**：识别重复元素，提取为可复用组件
- **层次化**：建立清晰的组件层次结构
- **可维护性**：组件独立，易于修改和更新
- **可扩展性**：模块化设计，支持快速扩展

### 最佳实践

- 控制组件层次深度（3-5层）
- 遵循命名规范
- 建立清晰的文件组织
- 提供完整的组件文档
- 确保组件可访问性
- 优化组件性能

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.1.0 | 2026-11-02 | 统一标头标尾 · 品牌标语与格式规范化 · 补齐 YAML 元数据与变更历史 | YYC³ Team |
| v1.0.0 | 2026-03-27 | 初始版本，梳理原子设计五层组件分类 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
