# 04 · API 参考

> Base URL：`http://localhost:1228`。数据接口统一返回 `{ data, success }` 包裹；错误返回 `{ error, success: false }` + 4xx/5xx。
>
> **认证（2026-08 安全强化后）**：除 `/api/auth/*` 与 `/api/error-report` 外，**全部端点需认证**。
> 凭据双通道：httpOnly Cookie（浏览器，登录后自动携带）或 `Authorization: Bearer <accessToken>`（API 客户端）。
> 数据端点按用户**租户隔离**（只见自己的数据）；AI 端点带**按用户限流**。

## 数据 CRUD（全部需认证 + 租户隔离）

### GET /api/children

列出**当前用户**的宝宝档案（不可见他人与种子归属数据）。401 未认证。

### POST /api/children

```json
// 请求（必填 name、birth_date）
{ "name": "小语", "birth_date": "2026-01-01", "gender": "female" }
// 201 → { data: Child }（user_id 一律取自认证令牌，传入的 user_id 被忽略）
// 400 → name/birth_date 缺失
```

字段白名单：name / nickname / birth_date / gender / avatar_url / current_stage；其余字段（含恶意键）静默丢弃。

### PATCH /api/children/[id]

部分更新（白名单同上；id/user_id 不可变更）。404 不存在 / 403 非本人。

### DELETE /api/children/[id]

删除档案，**外键级联删除**其成长记录/作业/里程碑/评估。404 不存在 / 403 非本人。

### GET /api/growth-records

| Query | 说明 |
|-------|------|
| `childId` | 按宝宝过滤（须属于当前用户，否则 **403**） |
| `type` | milestone / observation / emotion / learning |
| `limit` | 默认 200，上限 500（超出即夹取） |
| `offset` | 默认 0（负数夹取为 0） |

仅返回当前用户孩子集合的记录，按 `recorded_at` 倒序；跨孩子聚合为**单条 `IN` 查询**（库内排序分页）；
响应含 `meta: { total, limit, offset }`；`media_urls`、`tags` 已是结构化数组。

### POST /api/growth-records

```json
// 必填 child_id、title、content；recorded_at 缺省为当前时间
{ "child_id": "<uuid>", "type": "observation", "title": "公园社交",
  "content": "主动邀请小朋友玩耍", "media_urls": [], "tags": ["社交"] }
// 403 → child_id 不属于当前用户（防 IDOR 探测）
```

### DELETE /api/growth-records/[id]

删除记录。404 不存在 / 403 非本人（记录 → 孩子 → 用户归属校验）。

### GET /api/stats

当前用户聚合统计：`data: { children, records, milestones, assessments }`（首页卡片数据源）。

### GET /api/homework

Query：`childId`、`status`（pending/in_progress/completed/overdue）。租户隔离同上。

### POST /api/homework

必填 `child_id`、`subject`、`title`；`status` 默认 pending、`priority` 默认 normal。child 归属校验同上（403）。

### PATCH /api/homework/[id]

部分更新；`status → completed` 时自动补 `completed_at`。404 = 任务不存在；**403 = 任务属于其他用户**。
`id` / `child_id` / `created_at` 不接受变更。

### DELETE /api/homework/[id]

删除任务，`{ success: true }`；404 不存在 / 403 非本人。

## 客户端集合持久化（`/api/user-documents`，全部需认证）

> 承载课表 / 日程 / 互动 / 视频 / 评估等「客户端整组维护」的数据，表结构见 [03 · 数据模型](./03-data-model.md)。

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/api/user-documents?kind=<kind>` | 返回 `data: [{ id, data, updatedAt }]`；`kind` 不在白名单 → 400 |
| PUT | `/api/user-documents` | body `{ kind, items: [{ id, data }] }`；**replace-all**（事务内先删后插）；返回 `{ kind, count }` |
| DELETE | `/api/user-documents?kind=<kind>` | 清空该 kind 的集合 |

`kind` 白名单：`schedule` / `curriculum` / `interaction` / `video` / `assessment`。

**约束（超限即拒绝）**

| 约束 | 值 | 状态码 |
| ---- | ---- | ---- |
| 单组条数 | ≤ 500 | 400 |
| 单条 payload | ≤ 64 KB | 413 |
| 单组总字节 | ≤ 1 MB | 413 |
| 同组内 `id` 重复 | 不允许 | 400 |
| 未登录 | — | 401（跨用户数据互不可见） |

```bash
# 示例：整组写入课表（浏览器用 Cookie，API 客户端用 Bearer）
curl -X PUT http://localhost:1228/api/user-documents \
  -H 'content-type: application/json' \
  --cookie-jar cookies.txt \
  -d '{"kind":"schedule","items":[{"id":"s1","data":{"title":"起床","type":"rest"}}]}'
```

## 发展评估结果（`/api/growth-assessments`，全部需认证）

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/api/growth-assessments?childId=&limit=&offset=` | 按孩子（可省略=全部自己的孩子）读取；`limit` 默认 50 / 上限 200；返回 `data + meta.total` |
| POST | `/api/growth-assessments` | body：`child_id`、`stage_id`、`dimensions[{id,name,score}]`、`overall_score(0-100)`、`recommendations[]`；201 返回落库记录 |

`child_id` 非本人 → **403**；入参非法 → 400；写入后刷新/换设备仍可读（对应 `growth_assessments` 表）。

## 健康检查（`/api/health`，匿名）

`GET /api/health` → `{ status: "ok" | "degraded", checks: { database }, version, uptimeSec, timestamp }`。
数据库只读探针失败返回 **503**，供容器/K8s 探活与摘流；不返回连接串、路径等内部信息。

## 自治核心（服务端单例）

| 端点 | 限流 | 说明 |
| ------ | ------ | ------ |
| GET /api/agentic | 60/min | 引擎系统状态（state / 任务计数 / 成功率） |
| POST /api/agentic | 20/min | `{ text, sessionId? }` → AgentResponse（身份取自令牌） |

AgenticCore 及 prediction 服务栈仅存在于服务端，客户端经此 HTTP 入口调用。

## AI 代理（全部需认证 + 按用户限流，超限 429 带 `Retry-After`）

| 端点 | 限流 | 说明 |
| ------ | ------ | ------ |
| POST /api/ai/homework-correction | 10/min | base64 data URL 图片（≤10MB）→ 批改结果；413 超限 |
| POST /api/ai/speech-to-text | 10/min | multipart `audio`（≤25MB）→ `{ text }` |
| POST /api/ai/generate-image | 6/min | 文生图（fal.ai 计费端点，从严） |
| POST /api/ai/orchestrate · continue-story · assessment-report | 10/min | 真实模型调用 |
| POST /api/ai/chat | 20/min | 预设回复集 + 角色路由 |
| POST /api/ai/emotion · enhanced-emotion · analyze-record | 30/min | 规则/轻实现 |

通用响应：**401** 未认证；**429** 超限（body 含重试秒数，头含 `Retry-After`）；**413** 体积超限。

## 鉴权（JWT + httpOnly Cookie）

JWT（access/refresh 携带 `type` 声明，不可互换）+ bcrypt。**令牌主通道为 httpOnly Cookie**：
登录/刷新成功时 `Set-Cookie`（`yyc3_at` path=/；`yyc3_rt` path=/api/auth；HttpOnly + SameSite=Lax，生产含 Secure），
浏览器请求自动携带；API 客户端可继续用 Bearer 头与 body `refreshToken`（兼容保留）。

| 端点 | 限流 | 说明 |
| ------ | ------ | ------ |
| POST /api/auth/register | 5/min/IP | **防枚举**：重复邮箱静默 no-op，响应与新注册一致且**永不返回令牌/用户数据**；前端注册后自动登录 |
| POST /api/auth/login | 10/min/IP + 5/min/邮箱 | 错误密码与不存在邮箱返回**相同的** `邮箱或密码错误`；成功同时下发 Cookie 与 body tokens |
| POST /api/auth/refresh | 15/min/IP | refreshToken 来源：body 或 `yyc3_rt` Cookie；仅接受 refresh 类型；成功轮换 `yyc3_at` |
| POST /api/auth/logout | - | 清除令牌 Cookie（无状态 JWT 无服务端吊销） |
| GET/PUT /api/auth/profile | - | 当前用户信息（需认证） |

**CSRF**：Cookie 认证的非 GET 请求校验 Origin 同源（跨源 → 403）；Bearer 头不受影响。

```bash
# 浏览器路径：登录后 Cookie 自动携带，无需手动处理
# API 客户端路径：
TOKEN=$(curl -s -X POST /api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"a@b.c","password":"password123"}' | jq -r .data.tokens.accessToken)
curl /api/children -H "Authorization: Bearer $TOKEN"

# curl Cookie 路径：
curl -c jar -X POST /api/auth/login ... && curl -b jar /api/children
```

**配置**：`JWT_SECRET`（生产必设，`openssl rand -hex 32`；开发缺省时自动生成安装级随机密钥 `data/.jwt-dev-secret`）、
`JWT_EXPIRES_IN`（默认 2h，泄露窗口收窄；前端 401 自动刷新无感）、`JWT_REFRESH_EXPIRES_IN`（默认 30d）。
**演示账号**（仅开发/预览环境种子，**生产自动跳过种入**）：`parent@yyc3.com` / `demo123456`。

## 日志体系（Winston，P0-2 融合）

服务端日志基于 Winston + 每日轮转（移植自 YYC3-AI-Growth-Companion）：

| 模块 | 职责 |
| ------ | ------ |
| `lib/logger/server.ts` | 服务端日志：控制台 + `logs/error-%DATE%.log`（错误，30 天）+ `logs/combined-%DATE%.log`（全量，14 天），20MB 轮转 |

**用法**：服务端路由 `import { error, info } from "@/lib/logger/server"`；已接入 auth 全部端点与 error-report。`LOG_DIR`（默认 `logs/`）、`LOG_LEVEL`（默认 dev=debug / prod=info）可配置；`logs/` 已 gitignore。

## 错误码约定

| 状态 | 含义 |
| ------ | ------ |
| 400 | 参数缺失/格式错误/外键引用不存在（附中文说明） |
| 401 | 未认证 / 令牌无效、过期或类型不符 |
| 403 | 数据不属于当前用户（租户隔离）/ Cookie 跨源写（CSRF 防护）/ 账号停用 |
| 404 | 资源不存在 |
| 409 | 资源冲突（注册已不再返回 409——防枚举下重复邮箱与新注册响应一致） |
| 413 | 上传体积超限 |
| 429 | 限流触发（头含 `Retry-After` 秒数） |
| 500 | 服务端/上游异常（日志含 `[api]` 前缀可检索） |
