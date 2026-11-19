/**
 * @file route.ts
 * @description Prometheus 指标端点（移植自 Companion v3.0.0，Phase 3b 监控接线）
 *
 * GET /api/metrics 返回 Prometheus 文本格式指标，供抓取目标配置使用。
 * 与 /api/health 形成观测纵深：health 管存活探针，metrics 管指标抓取。
 *
 * 访问控制（应用层兜底，不依赖反向代理）：
 * - 配置 `METRICS_TOKEN` 时，必须携带 `Authorization: Bearer <token>`（或 `x-metrics-token`），否则 401；
 * - 生产环境（NODE_ENV=production）未配置 `METRICS_TOKEN` 时直接 503，避免进程内存/事件循环信息裸奔；
 * - 开发环境未配置时放行，便于本地 `curl localhost:1228/api/metrics` 调试。
 */

import { timingSafeEqual } from "node:crypto"
import { registry } from "@/lib/monitoring/metrics"

export const dynamic = "force-dynamic"

/** 常量时间比较，避免按字符提前返回造成的时序侧信道 */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function extractToken(request: Request): string {
  const header = request.headers.get("authorization") ?? ""
  if (/^Bearer\s+/i.test(header)) return header.replace(/^Bearer\s+/i, "").trim()
  return request.headers.get("x-metrics-token") ?? ""
}

export async function GET(request: Request): Promise<Response> {
  const expected = process.env.METRICS_TOKEN

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return Response.json(
        { error: "指标端点未配置 METRICS_TOKEN，生产环境拒绝暴露运行信息" },
        { status: 503 },
      )
    }
  } else if (!safeEqual(extractToken(request), expected)) {
    return Response.json(
      { error: "未授权访问指标端点" },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="metrics"' } },
    )
  }

  const metrics = await registry.metrics()
  return new Response(metrics, {
    headers: {
      "Content-Type": registry.contentType,
      "Cache-Control": "no-store, must-revalidate",
    },
  })
}
