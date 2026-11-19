/**
 * Prometheus 指标端点与计数器测试
 * 覆盖：文本格式输出、默认指标存在、业务计数器递增可见、令牌门禁（401/200/503）
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { GET } from "../../app/api/metrics/route"
import { aiChatRequestsTotal, aiRouteRequestsTotal, businessRequestsTotal, registry } from "@/lib/monitoring/metrics"

const URL = "http://localhost:1228/api/metrics"

function req(headers: Record<string, string> = {}): Request {
  return new Request(URL, { headers })
}

describe("GET /api/metrics", () => {
  const originalToken = process.env.METRICS_TOKEN
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    delete process.env.METRICS_TOKEN
    process.env.NODE_ENV = "test"
  })

  afterEach(() => {
    if (originalToken === undefined) delete process.env.METRICS_TOKEN
    else process.env.METRICS_TOKEN = originalToken
    if (originalEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalEnv
  })

  test("返回 Prometheus 文本格式且含默认进程指标", async () => {
    const res = await GET(req())
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

    const body = await (await GET(req())).text()
    expect(body).toContain("yyc3_ai_chat_requests_total")
    expect(body).toContain('yyc3_ai_chat_requests_total{role="advisor",source="mock"}')
    expect(body).toContain('yyc3_ai_route_requests_total{route="orchestrate",outcome="success:openai"}')
    expect(body).toContain('yyc3_business_requests_total{route="children",status="200"}')
  })

  test("注册中心 contentType 为 Prometheus 标准文本类型", () => {
    expect(registry.contentType).toContain("text/plain")
  })

  test("配置令牌后无凭据返回 401 且带 WWW-Authenticate", async () => {
    process.env.METRICS_TOKEN = "metrics-test-token"
    const res = await GET(req())
    expect(res.status).toBe(401)
    expect(res.headers.get("WWW-Authenticate")).toContain("Bearer")
  })

  test("配置令牌后错误凭据返回 401", async () => {
    process.env.METRICS_TOKEN = "metrics-test-token"
    expect((await GET(req({ authorization: "Bearer wrong-token" }))).status).toBe(401)
    expect((await GET(req({ "x-metrics-token": "wrong-token" }))).status).toBe(401)
  })

  test("配置令牌后 Bearer 与 x-metrics-token 均可通过", async () => {
    process.env.METRICS_TOKEN = "metrics-test-token"
    const viaBearer = await GET(req({ authorization: "Bearer metrics-test-token" }))
    expect(viaBearer.status).toBe(200)
    expect(await viaBearer.text()).toContain("process_cpu_user_seconds_total")

    const viaHeader = await GET(req({ "x-metrics-token": "metrics-test-token" }))
    expect(viaHeader.status).toBe(200)
  })

  test("生产环境未配置令牌返回 503（避免运行信息裸奔）", async () => {
    process.env.NODE_ENV = "production"
    const res = await GET(req())
    expect(res.status).toBe(503)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toContain("METRICS_TOKEN")
  })
})
