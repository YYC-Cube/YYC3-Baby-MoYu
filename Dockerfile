# syntax=docker/dockerfile:1
# YYC³ 小语 · 生产镜像（多阶段）
# 约束：运行时必须 Node ≥ 22.13（node:sqlite），构建用 Bun（bun.lock 为准）

FROM oven/bun:1.3.11 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# 仅生产依赖（缩小运行时体积；构建阶段才需要 devDependencies）
FROM oven/bun:1.3.11 AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM node:22.13-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Next 16 的编译产物要求 Node 运行时（Bun 直接执行 next build 会报
# "Expected CommonJS module to have a function wrapper"）；因此构建阶段装 Node + 复用 Bun 装包
COPY --from=oven/bun:1.3.11 /usr/local/bin/bun /usr/local/bin/bun
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM node:22.13-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=1228 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=/app/data/yyc3.db

# standalone 已内联所需 node_modules（无需拷贝整棵依赖树）
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# next-intl 运行期读取词条：显式带入，避免被 tracing 遗漏
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/i18n ./i18n
RUN mkdir -p /app/data /app/logs && chown -R node:node /app

USER node
EXPOSE 1228

# 容器内无 curl：用 Node 内置 fetch 探活（/api/health 会检查数据库）
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:1228/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
