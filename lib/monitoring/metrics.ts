/**
 * @file metrics.ts
 * @description Prometheus 指标注册中心（移植自 Companion v3.0.0，Phase 3b 监控接线）
 *
 * 业务计数器在 API 路由中递增；默认指标（CPU/内存/事件循环）自动采集。
 * 端点：GET /api/metrics 返回 Prometheus 文本格式。
 */

import { Registry, collectDefaultMetrics, Counter } from "prom-client"

export const registry = new Registry()

collectDefaultMetrics({ register: registry })

/** AI 聊天请求计数（含降级标记：source=openai/gateway/mock） */
export const aiChatRequestsTotal = new Counter({
  name: "yyc3_ai_chat_requests_total",
  help: "Total AI chat requests",
  labelNames: ["role", "source"] as const,
  registers: [registry],
})

/** AI 通用请求计数（orchestrate/continue-story/assessment-report 等共用，按路由区分） */
export const aiRouteRequestsTotal = new Counter({
  name: "yyc3_ai_route_requests_total",
  help: "Total AI route requests by route",
  labelNames: ["route", "outcome"] as const,
  registers: [registry],
})

/** 业务 API 请求计数（children/growth/homework 等业务面） */
export const businessRequestsTotal = new Counter({
  name: "yyc3_business_requests_total",
  help: "Total business API requests by route",
  labelNames: ["route", "status"] as const,
  registers: [registry],
})
