# YYC³ 开发者文档套

> 面向开发者的完整技术文档。配套用户向导见[项目 README](../../README.md)，文档中心主索引见 [docs/README.md](../README.md)。

| 文档 | 内容 |
| ------ | ------ |
| [01 · 快速上手](./01-getting-started.md) | 环境要求、安装、启动、常见问题 |
| [02 · 可视化架构体系](./02-architecture.md) | 系统分层 / 混合路由 / 数据流 / AI 链路 / 目录拓扑 / 徽章评估流水线（Mermaid 八图） |
| [03 · 数据模型](./03-data-model.md) | SQLite 十张表（含客户端集合 `user_documents`）、JSON 列约定、种子数据、迁移与备份 |
| [04 · API 参考](./04-api-reference.md) | 全部 REST 端点：请求/响应/错误码约定 |
| [05 · 前端组件体系](./05-frontend.md) | 目录组织、UI 基建（shadcn/Radix）、状态管理、主题与角色系统 |
| [06 · AI 引擎与安全](./06-ai-engine.md) | 服务端代理模式、密钥管理、AI 引擎模块清单 |
| [07 · 测试与质量门禁](./07-testing-quality.md) | tsc/lint/test/audit 四道门禁与债务清单（lint 0/0 · 459 用例 · 覆盖率 92.1%） |
| [08 · 部署](./08-deployment.md) | 本地生产、脚本、Docker 注意事项 |
| [09 · 贡献指南](./09-contributing.md) | 分支模型、提交规范、徽章系统扩展指南（4 等级 × 8 分类） |
| [10 · 可视化交互体系设计](./10-visual-interaction-system.md) | 设计令牌 / 四主题 / 交互状态机 / 数据可视化 / 动效 / WCAG 2.2 AA / 视觉回归 |
| [11 · 国际化边界与治理](./11-i18n-boundary.md) | i18n 全量闭环（16/16 页双语 · 词条 977/977 · strict CI 阻断）· 单组件复用强约定 · 残留清单 |
| [12 · 部署承载分析](./12-hosting-profile.md) | 本机/单机/托管对比 · 反代/PG/备份/密钥配置清单 · 上线验收项 |

## 一分钟导览

```bash
bun install --registry https://registry.npmmirror.com
cp .env.example .env.local   # 填入 BIGMODEL_API_KEY
bun run dev                   # http://localhost:1228
bun run test                  # 459 个用例
```

## 技术栈速览

Next.js 16（App Router · Turbopack）· React 19 · TypeScript 5.9（strict）· Tailwind CSS 4 ·
shadcn/ui（Radix）· React state + AuthProvider Context + authFetch · node:sqlite · next-intl v4 · Bun（测试运行时）
