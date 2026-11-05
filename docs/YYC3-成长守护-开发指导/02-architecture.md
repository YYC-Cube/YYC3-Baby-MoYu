# 02 · 可视化架构体系

> 全部图表为 Mermaid，可在 GitHub / VS Code（Mermaid 插件）直接渲染。

## 1. 系统分层总览

```mermaid
flowchart TB
    subgraph Client["浏览器客户端"]
        UI["React 19 组件树<br/>app/ + components/"]
        Hooks["Hooks 层<br/>useBadges · useChildren · useAIChat …"]
        Auth["AuthProvider Context<br/>useAuth（登录态）"]
        AF["authFetch/apiClient<br/>自动附带 httpOnly Cookie 凭据 · 401→刷新→重试"]
        LS["localStorage<br/>徽章解锁态 · 主题偏好"]
    end

    subgraph Edge["Next.js 边缘层（Node 运行时）"]
        MW["middleware.ts<br/>混合路由：仅 /en|/zh 前缀进入 next-intl"]
        RSC["App Router 页面<br/>静态预渲染 + 动态路由"]
        Pages["功能页 ×17<br/>growth · homework · badges · books …"]
        I18N["[locale] 镜像路由<br/>NextIntlClientProvider"]
    end

    subgraph Server["服务端（API Routes）"]
        AIAPI["/api/ai/*<br/>认证+限流 · 作业批改 · 语音转写 · 情感分析"]
        AG["/api/agentic<br/>AgenticCore 服务端单例"]
        AuthAPI["/api/auth/*<br/>JWT 签发/刷新/登出（httpOnly Cookie）"]
        CRUD["/api/children · growth-records · homework<br/>CRUD + 认证 + 租户隔离 + 归属校验"]
        DBL["lib/db/server.ts<br/>表名白名单 · JSON 列序列化 · 种子确保"]
    end

    subgraph Data["数据层"]
        SQLite[("node:sqlite<br/>data/yyc3.db<br/>WAL · 外键约束")]
        Seed["种子数据<br/>示例家庭/作业/课程（含演示账号）"]
    end

    subgraph External["外部服务"]
        BigModel["BigModel 开放平台<br/>open.bigmodel.cn"]
    end

    UI --> Hooks --> Auth
    Hooks --> AF
    UI --> LS
    Client -->|fetch| MW --> RSC --> Pages
    RSC --> I18N
    AF -->|JSON| AIAPI & CRUD & AuthAPI & AG
    AIAPI -->|服务端持有密钥| BigModel
    CRUD --> DBL --> SQLite
    Seed --> SQLite
```

**关键约束：** AI 密钥只存在于服务端（`BIGMODEL_API_KEY`），浏览器永不接触 —— 所有 AI 调用必须走 `/api/ai/*` 代理。

## 2. 混合路由请求流（middleware）

```mermaid
flowchart LR
    Req["请求 GET /xxx"] --> MW{"middleware.ts<br/>路径前缀是 /en 或 /zh ？"}
    MW -->|"否（默认中文主应用）"| Root["直通根路由<br/>app/growth/page.tsx 等"]
    MW -->|"是"| Intl["next-intl 中间件"]
    Intl -->|"/en/growth"| LocaleR["app/[locale]/growth"]
    Intl -->|"/zh/*（默认语言）"| R307["307 去前缀重定向<br/>→ 根路由"]
    Root & LocaleR & R307 --> Resp["响应"]
```

> 历史教训：若让 next-intl 处理全部根路由，会把整个中文主应用重写进 `[locale]` 世界导致全站 404。此为当前架构的核心防御点。

## 3. 数据写入与徽章评估流

```mermaid
sequenceDiagram
    participant U as 用户
    participant M as CreateRecordModal
    participant G as /growth 页
    participant API as /api/growth-records
    participant DB as lib/db/server.ts
    participant SQL as node:sqlite
    participant B as useBadges

    U->>M: 填写记录并提交
    M->>G: onSubmit(CreateRecordPayload)
    G->>API: POST {child_id,type,title,content,tags…}
    API->>DB: createRow("growth_records", …)
    DB->>SQL: INSERT（tags JSON.stringify）
    SQL-->>API: 201 {data: 反序列化后的行}
    API-->>G: 201

    B->>API: GET /api/growth-records?childId=…
    API-->>B: 全量记录
    B->>B: computeStats() 聚合（计数/连续天数/标签集）
    B->>B: evaluateAll() 逐枚评估 30 枚徽章
    B->>B: 新解锁 → localStorage 持久化 + NEW 标记
```

## 4. AI 代理链路（安全边界）

```mermaid
flowchart LR
    subgraph Browser["浏览器"]
        C1["SmartHomeworkHelper"]
        C2["语音答题组件"]
    end
    subgraph ServerRoutes["服务端 API"]
        R1["/api/ai/homework-correction<br/>base64 图片 ≤10MB"]
        R2["/api/ai/speech-to-text<br/>multipart audio ≤25MB"]
    end
    subgraph Lib["服务端服务层"]
        S1["HomeworkCorrectionService<br/>lib/api/homework-correction.ts"]
        S2["VoiceService.uploadAndTranscribe<br/>lib/api/voice-services.ts"]
    end
    BM["BigModel API<br/>Bearer BIGMODEL_API_KEY"]

    C1 -->|"fetch JSON（无密钥）"| R1 --> S1 --> BM
    C2 -->|"fetch FormData（无密钥）"| R2 --> S2 --> BM
    BM -->|"结果"| S1 & S2 --> R1 & R2 --> C1 & C2
```

## 5. 目录拓扑（核心模块依赖方向）

```mermaid
flowchart TD
    APP["app/"] --> COMP["components/"]
    APP --> HOOKS["hooks/"]
    COMP --> UILIB["components/ui/<br/>shadcn 65+"]
    HOOKS --> LIB["lib/"]
    LIB --> DB["lib/db/<br/>server.ts → sqlite-client.ts"]
    LIB --> AI["lib/ai/<br/>情感/语音/多模态引擎 ×14"]
    LIB --> PRED["lib/prediction/ + services/prediction/<br/>base-predictor 富基类"]
    CORE["core/AgenticCore.ts<br/>自治核心"] --> PRED
    COMP --> CORE
    TYPES["types/"] --> LIB & COMP & HOOKS
    BADGES["lib/badges/<br/>definitions ×30 + engine"] --> HOOKS
    DB --> SQL[(data/yyc3.db)]
```

依赖铁律：`app → components/hooks → lib → 数据与外部服务`，禁止反向依赖；`types/` 为全局叶子。

## 6. 国际化与静态资产

```mermaid
flowchart LR
    subgraph Routing["i18n/"]
        RT["routing.ts<br/>zh 默认 · en · as-needed"]
        NAV["navigation.ts<br/>Link/router 封装"]
        REQ["request.ts<br/>messages/{zh,en}.json"]
    end
    MW2["middleware.ts"] --> RT
    LT["app/[locale]/layout.tsx<br/>纯 Provider（不嵌 html）"] --> REQ
    SW["LanguageSwitcher 组件"] --> NAV
    subgraph Public["public/"]
        ICON["icon.svg · yyc3-pwa-icon.png"]
        MANI["manifest.json（PWA）"]
        ROLES["role-photos/"]
    end
    Layout["app/layout.tsx 元数据"] --> ICON & MANI
```

## 7. 部署形态

```mermaid
flowchart LR
    subgraph Dev["开发"]
        D1["bun run dev<br/>next dev :1228"]
    end
    subgraph Prod["生产（Node 进程）"]
        B1["bun run build<br/>Turbopack + 全类型检查"] --> S1["next start :1228"]
        S1 --> FS[("data/yyc3.db<br/>进程外持久化文件")]
    end
    subgraph Alt["备选"]
        DOC["scripts/deploy-docker.sh"]
        BAK["VACUUM INTO 备份"]
    end
```

> ⚠️ 服务进程必须跑 Node（`node:sqlite` 需要 Node ≥ 22.13）。`bun --bun next start` 与 Next 16 Turbopack 产物不兼容，仅用 Bun 跑测试。

## 8. 徽章系统架构（30 枚 · 声明式评估）

```mermaid
flowchart TB
    subgraph Data["真实行为数据"]
        API["/api/growth-records · /api/children · /api/homework<br/>/api/user-documents（课表/互动/视频集合）<br/>SQLite 十表"]
    end
    subgraph Engine["客户端评估引擎"]
        useB["useBadges<br/>hooks/useBadges.ts"]
        CS["computeStats()<br/>计数 / 连续天数 / 标签集 / 里程碑 / AI 分析"]
        EV["evaluateAll()<br/>逐枚评估 → 进度 0-100 / null=未解锁"]
        PER["localStorage 持久化<br/>解锁态 + NEW 标记（幂等）"]
    end
    subgraph Defs["声明式定义库（页面零改动）"]
        DEF["lib/badges/definitions.ts<br/>countBadge / compoundBadge 工厂 × 30"]
        LVL["BADGE_LEVELS<br/>铜10 · 银30 · 金80 · 钻石200"]
    end
    subgraph UI["展示层"]
        PAGE["/badges 页面"]
        CARD["BadgeCard<br/>进度条 · 解锁动画 · 分类筛选"]
    end

    API --> useB --> CS --> EV --> PER
    EV --> DEF
    EV --> LVL
    EV --> UI
    UI --> PAGE --> CARD
```

**设计要点：**
- **完全声明式**：新增徽章 = `definitions.ts` 加一行 `countBadge(...)`，评估/展示零改动
- **真实数据驱动**：不依赖手点解锁，进度与条件由用户行为记录实时计算
- **幂等持久化**：解锁态写入 localStorage，`evaluateAll()` 重复执行不产生重复标记
- **测试覆盖**：`__tests__/lib/badges.test.ts` 17 用例验证聚合/评估/持久化/定义完整性
