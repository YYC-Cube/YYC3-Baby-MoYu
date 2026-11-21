"use client"

/**
 * @file GrowthTrendPrediction.tsx
 * @description 成长趋势预测卡片：把已落库的发展评估总分（overall_score）交给服务端
 *   prediction 引擎（TimeSeriesEngine）做统计外推，前端以 SVG 呈现「历史实线 + 预测虚线 + 置信区间」。
 *
 *   数据来源：/api/growth-assessments（真实库内评估记录，按时间升序）。
 *   诚实边界：不足 5 次评估不画预测，只给引导空态；预测结果仅为趋势参考，
 *   卡片内固定展示免责声明，不做医学/发育诊断表述。
 */

import { authFetch } from "@/lib/api/auth-fetch"
import { useTranslations } from "next-intl"
import { useCallback, useEffect, useState } from "react"

interface AssessmentRow {
  id: string
  overall_score: number
  created_at: string
}

interface ForecastPoint {
  timestamp: number
  value: number
  lower: number | null
  upper: number | null
}

interface PredictionPayload {
  history: Array<{ timestamp: number; value: number }>
  forecast: ForecastPoint[]
  confidence: number
  disclaimer?: string
}

const MIN_POINTS = 5
const HORIZON = 5
const CHART_W = 620
const CHART_H = 200
const PAD = { top: 16, right: 16, bottom: 24, left: 36 }

export default function GrowthTrendPrediction({ childId }: { childId?: string }) {
  const t = useTranslations("growth.charts")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pointCount, setPointCount] = useState(0)
  const [payload, setPayload] = useState<PredictionPayload | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ limit: "100" })
      if (childId) qs.set("childId", childId)
      const res = await authFetch(`/api/growth-assessments?${qs.toString()}`)
      if (res.status === 401) {
        setPointCount(0)
        return
      }
      const body = (await res.json()) as { success?: boolean; data?: AssessmentRow[] }
      if (!res.ok || !body.success) throw new Error(`加载评估记录失败 (${res.status})`)

      const rows = (body.data ?? [])
        .filter((r) => typeof r.overall_score === "number")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      const points = rows.map((r) => ({
        timestamp: new Date(r.created_at).getTime(),
        value: r.overall_score,
      }))
      // 同一天多次评估会让时间轴重叠加倍，此处按天取均值。
      // 门槛与文案都必须按「天数」而非「记录条数」计：否则同一天连测 6 次会显示
      // 「已有 6 次评估，满 5 次即可」，但实际只聚合出 1 个点，永远画不出曲线。
      const byDay = new Map<number, { sum: number; n: number }>()
      for (const p of points) {
        const day = Math.floor(p.timestamp / 86_400_000) * 86_400_000
        const cur = byDay.get(day) ?? { sum: 0, n: 0 }
        byDay.set(day, { sum: cur.sum + p.value, n: cur.n + 1 })
      }
      const series = [...byDay.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([timestamp, { sum, n }]) => ({ timestamp, value: Math.round((sum / n) * 10) / 10 }))

      setPointCount(series.length)
      if (series.length < MIN_POINTS) {
        setPayload(null)
        return
      }

      const predRes = await authFetch("/api/ai/prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: "overall_score", points: series, horizon: HORIZON }),
      })
      const predBody = (await predRes.json()) as {
        success?: boolean
        data?: PredictionPayload
        message?: string
      }
      if (!predRes.ok || !predBody.success || !predBody.data) {
        throw new Error(predBody.message ?? `预测失败 (${predRes.status})`)
      }
      setPayload(predBody.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "趋势预测加载失败")
    } finally {
      setLoading(false)
    }
  }, [childId])

  // 挂载即拉取：load 内 setState 均在 await 之后（异步回调），非同步 effect 体内调用；
  // 编译器对间接引用保守告警，此处安全豁免
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="bg-surface rounded-2xl p-5 shadow-soft">
        <div className="h-5 w-40 bg-surface-soft rounded animate-pulse mb-4" />
        <div className="h-40 bg-surface-soft rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface rounded-2xl p-5 shadow-soft">
        <h3 className="font-bold text-adaptive mb-2">{t("trend.title")}</h3>
        <p className="text-sm text-adaptive-muted">{error}</p>
        <button
          type="button"
          onClick={() => { void load(); }}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          {t("trend.retry")}
        </button>
      </div>
    )
  }

  if (!payload) {
    return (
      <div className="bg-surface rounded-2xl p-5 shadow-soft">
        <h3 className="font-bold text-adaptive mb-2">{t("trend.title")}</h3>
        <p className="text-sm text-adaptive-muted">
          {t("trend.needMore", { current: pointCount, need: MIN_POINTS })}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-2xl p-5 shadow-soft">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-bold text-adaptive">{t("trend.title")}</h3>
        <span className="text-xs text-adaptive-muted">
          {t("trend.confidence", { percent: Math.round(payload.confidence * 100) })}
        </span>
      </div>
      <TrendChart payload={payload} />
      <p className="mt-3 text-xs text-adaptive-muted leading-relaxed">{payload.disclaimer ?? t("trend.disclaimer")}</p>
    </div>
  )
}

function TrendChart({ payload }: { payload: PredictionPayload }) {
  const t = useTranslations("growth.charts")
  const history = payload.history
  const forecast = payload.forecast
  const all = [
    ...history.map((p) => ({ ...p, kind: "h" as const })),
    ...forecast.map((p) => ({ ...p, kind: "f" as const })),
  ]
  const values = all.flatMap((p) => [p.value, ...(p.kind === "f" && p.lower !== null ? [p.lower] : []), ...(p.kind === "f" && p.upper !== null ? [p.upper] : [])])
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const spanV = maxV - minV || 1
  const minT = all[0].timestamp
  const maxT = all[all.length - 1].timestamp
  const spanT = maxT - minT || 1

  const x = (ts: number) => PAD.left + ((ts - minT) / spanT) * (CHART_W - PAD.left - PAD.right)
  const y = (v: number) => CHART_H - PAD.bottom - ((v - minV) / spanV) * (CHART_H - PAD.top - PAD.bottom)

  const line = (pts: Array<{ timestamp: number; value: number }>) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.timestamp).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")

  const bridge = history.length > 0 && forecast.length > 0 ? [history[history.length - 1], forecast[0]] : []
  const band = forecast.filter((p) => p.lower !== null && p.upper !== null)

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full" role="img" aria-label={t("trend.chartAria")}>
      {/* 网格基线 */}
      {[0, 0.5, 1].map((r) => {
        const gy = PAD.top + r * (CHART_H - PAD.top - PAD.bottom)
        return <line key={r} x1={PAD.left} x2={CHART_W - PAD.right} y1={gy} y2={gy} stroke="#e2e8f0" strokeWidth="1" />
      })}

      {/* 置信区间带状 */}
      {band.length > 1 && (
        <path
          d={`${line([...band].reverse().map((p) => ({ timestamp: p.timestamp, value: p.upper! })))} L${x(band[band.length - 1].timestamp).toFixed(1)},${y(band[band.length - 1].lower!).toFixed(1)} ${[...band].reverse().map((p) => `L${x(p.timestamp).toFixed(1)},${y(p.lower!).toFixed(1)}`).join(" ")} Z`}
          fill="rgba(59,130,246,0.12)"
          stroke="none"
        />
      )}

      {/* 历史实线 */}
      <path d={line(history)} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

      {/* 预测虚线（含历史末点衔接，视觉连续） */}
      {bridge.length > 0 && (
        <path
          d={line(bridge)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeDasharray="6 5"
          strokeLinecap="round"
        />
      )}
      {forecast.length > 1 && (
        <path
          d={line(forecast)}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeDasharray="6 5"
          strokeLinecap="round"
        />
      )}

      {/* 历史末点 */}
      {history.length > 0 && (
        <circle cx={x(history[history.length - 1].timestamp)} cy={y(history[history.length - 1].value)} r="3.5" fill="#3b82f6" />
      )}

      {/* 图例 */}
      <g fontSize="11" fill="#64748b">
        <line x1={PAD.left} x2={PAD.left + 18} y1={CHART_H - 8} y2={CHART_H - 8} stroke="#3b82f6" strokeWidth="2.5" />
        <text x={PAD.left + 24} y={CHART_H - 5}>{t("trend.legendHistory")}</text>
        <line x1={PAD.left + 96} x2={PAD.left + 114} y1={CHART_H - 8} y2={CHART_H - 8} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 5" />
        <text x={PAD.left + 120} y={CHART_H - 5}>{t("trend.legendForecast")}</text>
        <text x={CHART_W - PAD.right} y={CHART_H - 5} textAnchor="end">{t("trend.legendUnit")}</text>
      </g>
    </svg>
  )
}
