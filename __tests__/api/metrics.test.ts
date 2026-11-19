/**
 * Prometheus 指标端点与计数器测试
 * 覆盖：文本格式输出、默认指标存在、业务计数器递增可见
 */

import { describe, expect, test } from "bun:test"
import { GET } from "../../app/api/metrics/route"
import { aiChatRequestsTotal, aiRouteRequestsTotal, businessRequestsTotal, registry } from "@/lib/monitoring/metrics"

describe("GET /api/metrics", () => {
  test("返回 Prometheus 文本格式且含默认进程指标", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/plain")
    expect(res.headers.get("Cache-Control")).toContain("no-store")
    const body = await res.text()
    expect(body).toContain("process_cpu_user_seconds_total")
    expect(body).toContain("# HELP")
  })

  test("业务计数器递增后可在输出中读到", async () => {
    aiChatRequestsTotal.inc({ role: "advisor", source: "mock" })
    aiRouteRequestsTotal.inc({ route: "orchestrate", outcome: "success:openai" })
    businessRequestsTotal.inc({ route: "children", status: "200" })

    const body = await (await GET()).text()
    expect(body).toContain("yyc3_ai_chat_requests_total")
    expect(body).toContain('yyc3_ai_chat_requests_total{role="advisor",source="mock"}')
    expect(body).toContain('yyc3_ai_route_requests_total{route="orchestrate",outcome="success:openai"}')
    expect(body).toContain('yyc3_business_requests_total{route="children",status="200"}')
  })

  test("注册中心 contentType 为 Prometheus 标准文本类型", () => {
    expect(registry.contentType).toContain("text/plain")
  })
})
