/**
 * @file route.ts
 * @description Prometheus 指标端点（移植自 Companion v3.0.0，Phase 3b 监控接线）
 *
 * GET /api/metrics 返回 Prometheus 文本格式指标，供抓取目标配置使用。
 * 与 /api/health 形成观测纵深：health 管存活探针，metrics 管指标抓取。
 */

import { registry } from "@/lib/monitoring/metrics"

export const dynamic = "force-dynamic"

export async function GET(): Promise<Response> {
  const metrics = await registry.metrics()
  return new Response(metrics, {
    headers: {
      "Content-Type": registry.contentType,
      "Cache-Control": "no-store, must-revalidate",
    },
  })
}
