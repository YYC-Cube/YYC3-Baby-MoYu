/**
 * @fileoverview 成长趋势预测端点（prediction 引擎对外消费面）
 * @description 此前 lib/prediction（时序/异常/因果/自适应集成）仅在服务端 agentic
 *   内部可达，无任何 HTTP 消费面。本端点将其开放给前端可视化：
 *   入参为一串数值时间序列（成长记录里的身高/体重/评分等），返回未来 N 点预测与置信区间。
 *
 *   引擎选择：TimeSeriesEngine（指数平滑 + 季节性），train → predict 一次性完成。
 *   预测属统计外推，仅供趋势参考，不构成医疗/发育诊断建议（响应中显式声明）。
 */

import { requireAuth } from "@/lib/auth/guard"
import { checkRateLimit } from "@/lib/rate-limit"
import { TimeSeriesEngine } from "@/lib/prediction/specialized-engines"
import { NextResponse } from "next/server"
import { z } from "zod"

/** 最少点数：低于 5 点无法估计趋势 */
const MIN_POINTS = 5
/** 最多点数：防止超长序列拖垮训练 */
const MAX_POINTS = 500
/** 预测步数上限 */
const MAX_HORIZON = 30

const bodySchema = z.object({
  metric: z.string().max(32).optional(),
  points: z
    .array(
      z.object({
        timestamp: z.number().int().nonnegative(),
        value: z.number().finite(),
      }),
    )
    .min(MIN_POINTS, `至少需要 ${MIN_POINTS} 个数据点`)
    .max(MAX_POINTS, `数据点过多（上限 ${MAX_POINTS}）`),
  horizon: z.number().int().min(1).max(MAX_HORIZON).optional(),
})

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const rl = checkRateLimit(`ai:prediction:${auth.user.id}`, 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate Limit", message: `请求过于频繁，请 ${rl.retryAfterSec} 秒后再试` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Bad Request", message: "请求体必须是 JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation Error", message: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    )
  }

  const { points, metric = "value", horizon = 7 } = parsed.data

  try {
    const engine = new TimeSeriesEngine({
      name: `growth-trend-${metric}`,
      algorithm: "time_series_exponential_smoothing",
      parameters: { windowSize: 12, alpha: 0.3, beta: 0.1, gamma: 0.1 },
    })

    const data = {
      data: points,
      dataType: "timeseries" as const,
      target: metric,
      frequency: "irregular",
    }

    const training = await engine.train(data)
    const result = await engine.predict(data, horizon)

    const forecastValues = Array.isArray(result.prediction) ? result.prediction : [result.prediction]
    // 时间步长取历史点平均间隔，缺失或异常时回落为 1 天
    const span = points[points.length - 1].timestamp - points[0].timestamp
    const step = points.length > 1 && span > 0 ? Math.round(span / (points.length - 1)) : 86_400_000
    const lastTs = points[points.length - 1].timestamp

    return NextResponse.json({
      success: true,
      data: {
        metric,
        history: points,
        forecast: forecastValues.map((value, i) => ({
          timestamp: lastTs + step * (i + 1),
          value,
          lower: result.confidenceInterval?.[i]?.lower ?? null,
          upper: result.confidenceInterval?.[i]?.upper ?? null,
        })),
        confidence: result.confidence,
        methodology: result.methodology,
        modelId: result.modelId,
        trainingScore: training.trainingScore,
        disclaimer: "统计外推结果，仅供趋势参考，不构成医疗或发育评估结论",
      },
      meta: { timestamp: new Date().toISOString() },
    })
  } catch (error) {
    console.error("[api] 趋势预测失败:", error)
    return NextResponse.json({ success: false, error: "Server Error", message: "趋势预测失败" }, { status: 500 })
  }
}
