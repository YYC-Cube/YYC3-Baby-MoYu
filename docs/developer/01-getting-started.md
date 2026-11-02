# 01 · 快速上手

## 环境要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | **≥ 22.13** | 服务运行时（`node:sqlite` 依赖此版本） |
| Bun | ≥ 1.1 | 包管理 + 测试运行时（不用来跑 next 服务） |
| Git | 任意 | 版本控制 |

## 安装

```bash
# 国内网络必须走镜像（官方源在本环境会卡死在 resolving）
bun install --registry https://registry.npmmirror.com
```

## 环境变量

```bash
cp .env.example .env.local
```

必填项只有一项：

```ini
BIGMODEL_API_KEY=你的密钥        # BigModel 开放平台（open.bigmodel.cn）→ 右上角 API Keys
```

其余 `NEXT_PUBLIC_*` 均有合理默认值。**密钥只放服务端变量，禁止加 `NEXT_PUBLIC_` 前缀**（会打进浏览器包）。

## 启动

```bash
bun run dev        # 开发模式 http://localhost:1228
bun run build && bun run start   # 生产模式
```

首次访问任意数据接口时自动建表并写入种子数据（示例家庭「张女士/小语」、作业、课程），库文件落盘 `data/yyc3.db`。

## 常用命令

| 命令 | 说明 |
|------|------|
| `bun run dev` | 开发服务器（:1228，热更新） |
| `bun run build` | 生产构建（含完整 TypeScript 检查） |
| `bun run start` | 生产启动 |
| `bun run test` | 全部单元测试（257 用例，<1s） |
| `bun run type-check` | 全量类型检查 |
| `bun run lint` / `lint:fix` | ESLint 检查 / 自动修复 |

## 常见问题

**Q：`bun install` 卡在 resolving？**
官方 npm 源网络不通。务必加 `--registry https://registry.npmmirror.com`。

**Q：`next start` 报 `node:sqlite` 不存在？**
Node 版本低于 22.13。升级：`brew upgrade node@22` 或使用 nvm 安装 ≥22.13。

**Q：`bun --bun next dev` 报运行时错误？**
Bun 1.x 无法加载 Next 16 Turbopack 编译产物。开发/生产一律用 Node 跑 next，Bun 只用于 `install` 与 `test`。

**Q：想重置演示数据？**
删除 `data/yyc3.db*` 三个文件后重启，种子数据会重建：

```bash
rm -f data/yyc3.db data/yyc3.db-shm data/yyc3.db-wal
```

**Q：审计依赖？**
镜像源无 audit 端点，用官方源查：

```bash
npm install --package-lock-only --legacy-peer-deps --registry https://registry.npmmirror.com --no-audit
npm audit --package-lock-only --registry=https://registry.npmjs.org
```
