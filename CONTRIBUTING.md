# 贡献指南 · CONTRIBUTING

感谢关注 YYC³ 小语智能成长守护系统！本文说明如何高效、可追溯地参与贡献。
动手前请先阅读 [团队通用标准规范（SSOT）](./docs/YYC3-团队通用-标规文档/README.md)、
[README](./README.md)、[开发者文档](./docs/developer/README.md) 与 [行为准则](./CODE_OF_CONDUCT.md)。

## 1. 环境准备

| 依赖 | 版本要求 |
| ---- | ---- |
| Node.js | ≥ 22.13（`node:sqlite` 需要） |
| Bun | ≥ 1.1（推荐 1.3.x，与本仓库 `bun.lock` 对齐） |
| Git | ≥ 2.40 |

```bash
git clone https://github.com/YYC-Cube/YYC3-Baby-MoYu.git
cd YYC3-Baby-MoYu
bun install --registry https://registry.npmmirror.com
cp .env.example .env.local        # 仅本地使用，禁止提交
bun run dev                       # http://localhost:1228
```

> 国内网络建议使用镜像；`data/`、`.env*` 已被忽略，切勿提交数据库或密钥。

## 2. 分支模型

| 分支 | 用途 | 保护策略 |
| ---- | ---- | ---- |
| `main` | 稳定线，可发布 | 受保护，仅经 PR + CI 合并 |
| `feat/<主题>` | 新功能 | 从 `main` 切出，短生命周期 |
| `fix/<主题>` | 缺陷修复 | 关联 Issue |
| `docs/<主题>` | 文档 | 可小步提交 |
| `chore/<主题>` | 构建/依赖/杂务 | 说明影响范围 |
| `dependabot/*` | 依赖机器人 | 由 Dependabot 创建 |

分支命名使用小写英文与连字符，例如 `feat/growth-timeline-a11y`。

## 3. 提交规范（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

| type | 用途 |
| ---- | ---- |
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 文档 |
| `style` | 格式（不影响逻辑） |
| `refactor` | 重构 |
| `perf` | 性能 |
| `test` | 测试 |
| `build` | 构建/依赖 |
| `ci` | CI/CD |
| `chore` | 杂务 |
| `revert` | 回滚 |

示例：

```text
feat(growth): 成长时间线支持按年龄段筛选

- 新增 AgeFilter 组件与 useGrowthTimeline 查询参数
- 空态/加载态/错误态齐备
- 影响范围：/growth 页面与 growth API 查询

Closes #123
```

要求：

- 一次提交只做一件事；禁止把格式化与逻辑改动混在一起。
- 提交信息中文优先；subject ≤ 72 字符，动词开头，不使用句号。
- 破坏性变更使用 `feat!:` 或 `BREAKING CHANGE:` footer，并在 PR 中说明迁移方式。

## 4. 代码规范

### 4.1 通用

- TypeScript `strict`；禁止新增 `any`（确需使用时附理由）。
- 组件与函数保持单一职责；复杂逻辑抽 `lib/` 并补测试。
- 不在组件内硬编码颜色：使用语义令牌与 Tailwind 语义类（见 [10 · 可视化交互体系](./docs/developer/10-visual-interaction-system.md)）。
- 服务端代码不得被客户端组件直接引用；密钥只读取服务端环境变量。
- 新增依赖需说明必要性、体积影响与许可证；优先复用现有生态。

### 4.2 React / Next.js

- 默认服务端组件；需要状态/副作用时才 `'use client'`。
- 页面级组件使用路由分段；大组件按职责拆分。
- 异步操作必须处理加载/错误/空态；禁止吞错。
- 表单使用单一提交入口（`onSubmit`），禁止 `type=submit` 与 `onClick` 双绑定。
- 图片提供 `alt`；装饰性图片 `alt=""`；图标按钮提供 `aria-label`。

### 4.3 可访问性（强制）

- 遵循 WCAG 2.2 AA：正文对比度 ≥ 4.5:1，焦点可见，键盘可完成主流程。
- Dialog 必须有标题与描述；错误提示使用 `role="alert"` 或 `aria-live`。
- 新增/修改交互需通过 axe 扫描（组件层 `vitest-axe`，路由层 Playwright axe）。
- 动效尊重 `prefers-reduced-motion`。

### 4.4 数据与安全

- SQL 一律参数化；表名/列名走白名单校验。
- API 必须认证 + 授权 + 租户隔离；写操作校验资源归属。
- 错误响应不返回堆栈、SQL、内部路径。
- 不在日志中打印令牌、Cookie、手机号、完整邮箱等敏感信息。

## 5. 质量门禁（提交前必须全绿）

```bash
bun run type-check     # tsc --noEmit，0 error
bun run lint           # ESLint，0 error（warning 需说明）
bun run test            # 单元测试，258+ 全绿
bun run test:node      # node:sqlite 直测，7/7
bun run build          # Next.js 生产构建
bun run test:e2e       # Playwright 冒烟（需先 build）
```

补充：

- 改动涉及 `docs/` 归档工程时，使用工作区自带门禁：
  `docs/YYC3-小语/YYC3-XY-WORKSPACE` 下 `pnpm typecheck && pnpm test:coverage && pnpm verify && pnpm build`。
- 修改视觉/主题需重生成对应平台基线（macOS/Linux），禁止只在本机通过。
- 覆盖率不得低于阈值；新增代码应补充对应测试。

## 6. PR 流程与检查清单

1. 先开 Issue（缺陷需复现步骤；功能需目标与非目标）。
2. Fork 或在本仓库切分支，保持与 `main` 同步（rebase）。
3. 完成实现与自测，补充/更新文档。
4. 发起 PR，填写模板：变更摘要、影响范围、验证证据、风险与回滚。
5. CI 全绿 + 至少 1 名维护者批准后合并（squash merge）。

### PR 检查清单

- [ ] 关联 Issue，描述「为什么」而不只是「改了什么」
- [ ] 变更范围最小，无无关格式化/重排
- [ ] 新增/修改逻辑有测试，边界与错误路径覆盖
- [ ] `type-check` / `lint` / `test` / `build` / `e2e` 全绿
- [ ] 无障碍：键盘、焦点、对比度、axe 0 违规
- [ ] 四主题（暖阳/液态/赛博/极光）视觉正常
- [ ] 无硬编码密钥、无调试日志、无临时文件
- [ ] 文档已同步（README / developer / API / 数据模型）
- [ ] 破坏性变更已说明迁移与回滚方案

## 7. 文档贡献

- 现行文档统一写入 `docs/developer/`；历史资料放 `docs/archive/`（只读）。
- 文档头部保留 YAML Front Matter（file/description/author/version/created/updated/status/tags/category）。
- 图表优先 Mermaid；截图需说明来源与时间。
- 文末保留 YYC³ 四行署名尾。
- 新增文档需在 `docs/README.md` 与 `docs/developer/README.md` 索引中登记。

## 8. 测试编写约定

- 单元测试与源码同域放置：`__tests__/` 或包内 `src/__tests__/`。
- 命名：`<模块>.test.ts(x)`；契约测试：`<domain>.contract.test.ts`。
- 使用 Testing Library 查询可访问角色/名称，避免依赖实现细节的 CSS 选择器。
- 异步一律 `await`/`waitFor`，禁止固定 `sleep` 掩盖竞态。
- 视觉测试必须固定随机源（如粒子随机种子），否则视为测试缺陷。

## 9. 发布流程（维护者）

1. 确认 `main` CI 全绿、e2e 通过、依赖审计无新增高危。
2. 更新 `CHANGELOG.md` 与版本号（遵循 SemVer）。
3. 打标签 `vX.Y.Z` 并推送；GitHub Release 附变更摘要与升级说明。
4. 部署验证：生产健康检查、关键路径冒烟、回滚预案确认。
5. 发布后 24h 观察错误率与关键指标。

## 10. 安全与许可

- 漏洞请按 [SECURITY.md](./SECURITY.md) 私密报告，禁止公开披露未修复细节。
- 贡献即同意以 [MIT](./LICENSE) 许可授权；请确保你有权提交相关内容与素材。
- 提交前请确认未引入不兼容许可证的依赖或素材。

## 11. 沟通约定

- Issue/PR 讨论就事论事，提供可复现证据与环境信息。
- 评审意见需可执行；作者应在合理时间内回应或说明。
- 长期无响应的 PR 可能被关闭，可随时重新开启。

---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元*
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***
