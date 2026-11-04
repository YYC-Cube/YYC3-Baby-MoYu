"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"

interface GrowthData {
  date: string
  dimension: string
  score: number
}

interface GrowthChartsProps {
  data: GrowthData[]
  childName?: string
}

const DIMENSION_COLORS: Record<string, string> = {
  cognitive: "#3b82f6",
  language: "#22c55e",
  motor: "#f97316",
  social: "#a855f7",
  emotional: "#ec4899",
  selfcare: "#eab308",
}

// 维度中文名走 growth.charts.dims 词条；DIMENSION_COLORS 为纯视觉属性保留
const DIMENSION_NAMES: Record<string, string> = {
  cognitive: "cognitive",
  language: "language",
  motor: "motor",
  social: "social",
  emotional: "emotional",
  selfcare: "selfcare",
}

export default function GrowthCharts({ data, childName = "宝宝" }: GrowthChartsProps) {
  const t = useTranslations("growth.charts")
  const [chartType, setChartType] = useState<"radar" | "line" | "bar">("radar")
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null)

  // 计算最新的各维度得分
  const latestScores = useMemo(() => {
    const scoreMap: Record<string, number> = {}
    const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    sortedData.forEach((item) => {
      if (!scoreMap[item.dimension]) {
        scoreMap[item.dimension] = item.score
      }
    })

    return scoreMap
  }, [data])

  // 计算总体得分
  const overallScore = useMemo(() => {
    const scores = Object.values(latestScores)
    if (scores.length === 0) return 0
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }, [latestScores])

  // 生成历史趋势数据
  const trendData = useMemo(() => {
    const grouped: Record<string, Record<string, number>> = {}

    data.forEach((item) => {
      const month = item.date.slice(0, 7)
      if (!grouped[month]) grouped[month] = {}
      grouped[month][item.dimension] = item.score
    })

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, scores]) => ({ month, ...scores }))
  }, [data])

  return (
    <div className="space-y-6">
      {/* 图表类型切换 */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        {[
          { id: "radar", icon: "ri-radar-line" },
          { id: "line", icon: "ri-line-chart-line" },
          { id: "bar", icon: "ri-bar-chart-grouped-line" },
        ].map((type) => (
          <button
            key={type.id}
            onClick={() => { setChartType(type.id as typeof chartType); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              chartType === type.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <i className={type.icon} />
            {t(`chartTypes.${type.id}`)}
          </button>
        ))}
      </div>

      {/* 总体得分卡片 */}
      <motion.div
        className="bg-linear-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">{t("overallScoreOf", { name: childName })}</p>
            <motion.p
              className="text-5xl font-bold mt-2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              {overallScore}
            </motion.p>
            <p className="text-white/80 text-sm mt-1">
              {overallScore >= 85 ? t("overall.excellent") : overallScore >= 70 ? t("overall.good") : t("overall.improving")}
            </p>
          </div>
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <i className="ri-star-smile-line text-4xl" />
          </div>
        </div>
      </motion.div>

      {/* 图表区域 */}
      <AnimatePresence mode="wait">
        {chartType === "radar" && (
          <motion.div
            key="radar"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h3 className="font-bold text-slate-800 mb-4">{t("radarTitle")}</h3>
            <RadarChart scores={latestScores} />
          </motion.div>
        )}

        {chartType === "line" && (
          <motion.div
            key="line"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h3 className="font-bold text-slate-800 mb-4">{t("trendTitle")}</h3>
            <LineChart data={trendData} selectedDimension={selectedDimension} />
            <DimensionLegend selected={selectedDimension} onSelect={setSelectedDimension} />
          </motion.div>
        )}

        {chartType === "bar" && (
          <motion.div
            key="bar"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h3 className="font-bold text-slate-800 mb-4">{t("barTitle")}</h3>
            <BarChart scores={latestScores} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 维度详情卡片 */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(latestScores).map(([dim, score], index) => (
          <motion.div
            key={dim}
            className="bg-white rounded-xl p-4 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DIMENSION_COLORS[dim] }} />
              <span className="text-sm font-medium text-slate-700">{t(`dims.${dim}`)}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-slate-800">{score}</span>
              <span className="text-xs text-slate-500">
                {score >= 85 ? t("levels.excellent") : score >= 70 ? t("levels.good") : score >= 50 ? t("levels.fair") : t("levels.attention")}
              </span>
            </div>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: DIMENSION_COLORS[dim] }}
                initial={{ width: 0 }}
                animate={{ width: `${score}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// 雷达图组件
function RadarChart({ scores }: { scores: Record<string, number> }) {
  const t = useTranslations("growth.charts")
  const dimensions = Object.keys(scores)
  const center = 100
  const radius = 80

  const points = dimensions.map((dim, i) => {
    const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2
    const value = scores[dim] / 100
    return {
      x: center + Math.cos(angle) * radius * value,
      y: center + Math.sin(angle) * radius * value,
      labelX: center + Math.cos(angle) * (radius + 25),
      labelY: center + Math.sin(angle) * (radius + 25),
      dim,
    }
  })

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-xs mx-auto">
      {/* 背景网格 */}
      {[0.2, 0.4, 0.6, 0.8, 1].map((scale) => (
        <polygon
          key={scale}
          points={dimensions
            .map((_, i) => {
              const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2
              return `${center + Math.cos(angle) * radius * scale},${center + Math.sin(angle) * radius * scale}`
            })
            .join(" ")}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}

      {/* 轴线 */}
      {dimensions.map((_, i) => {
        const angle = (Math.PI * 2 * i) / dimensions.length - Math.PI / 2
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={center + Math.cos(angle) * radius}
            y2={center + Math.sin(angle) * radius}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        )
      })}

      {/* 数据区域 */}
      <motion.path
        d={pathD}
        fill="rgba(59, 130, 246, 0.2)"
        stroke="#3b82f6"
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ transformOrigin: "center" }}
      />

      {/* 数据点 */}
      {points.map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="#3b82f6"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
        />
      ))}

      {/* 标签 */}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.labelX}
          y={p.labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs fill-slate-600"
        >
          {t(`dims.${p.dim}`)}
        </text>
      ))}
    </svg>
  )
}

// 折线图组件
function LineChart({
  data,
  selectedDimension,
}: {
  data: Array<Record<string, unknown>>
  selectedDimension: string | null
}) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400">
        <NoHistoryText />
      </div>
    )
  }

  const dimensions = Object.keys(DIMENSION_NAMES)
  const maxValue = 100
  const height = 180
  const width = 300
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Y轴 */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="#e2e8f0"
        strokeWidth="1"
      />

      {/* X轴 */}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="#e2e8f0"
        strokeWidth="1"
      />

      {/* Y轴刻度 */}
      {[0, 25, 50, 75, 100].map((val) => (
        <g key={val}>
          <line
            x1={padding.left - 5}
            y1={padding.top + chartHeight * (1 - val / maxValue)}
            x2={padding.left}
            y2={padding.top + chartHeight * (1 - val / maxValue)}
            stroke="#cbd5e1"
            strokeWidth="1"
          />
          <text
            x={padding.left - 10}
            y={padding.top + chartHeight * (1 - val / maxValue)}
            textAnchor="end"
            dominantBaseline="middle"
            className="text-xs fill-slate-400"
          >
            {val}
          </text>
        </g>
      ))}

      {/* 数据线 */}
      {dimensions.map((dim) => {
        if (selectedDimension && selectedDimension !== dim) return null

        const linePoints = data
          .map((d, i) => {
            const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth
            const y = padding.top + chartHeight * (1 - ((d[dim] as number) || 0) / maxValue)
            return `${x},${y}`
          })
          .join(" ")

        return (
          <motion.polyline
            key={dim}
            points={linePoints}
            fill="none"
            stroke={DIMENSION_COLORS[dim]}
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1 }}
          />
        )
      })}

      {/* X轴标签 */}
      {data.map((d, i) => (
        <text
          key={i}
          x={padding.left + (i / (data.length - 1 || 1)) * chartWidth}
          y={height - 10}
          textAnchor="middle"
          className="text-xs fill-slate-400"
        >
          {(d.month as string)?.slice(5)}
        </text>
      ))}
    </svg>
  )
}

// 柱状图组件
function BarChart({ scores }: { scores: Record<string, number> }) {
  const t = useTranslations("growth.charts")
  const dimensions = Object.entries(scores)
  const maxValue = 100

  return (
    <div className="space-y-3">
      {dimensions.map(([dim, score], index) => (
        <div key={dim} className="flex items-center gap-3">
          <div className="w-16 text-sm text-slate-600 truncate">{t(`dims.${dim}`)}</div>
          <div className="flex-1 h-8 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full flex items-center justify-end pr-3"
              style={{ backgroundColor: DIMENSION_COLORS[dim] }}
              initial={{ width: 0 }}
              animate={{ width: `${(score / maxValue) * 100}%` }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
            >
              <span className="text-white text-sm font-bold">{score}</span>
            </motion.div>
          </div>
        </div>
      ))}
    </div>
  )
}

// 维度图例
function DimensionLegend({
  selected,
  onSelect,
}: {
  selected: string | null
  onSelect: (dim: string | null) => void
}) {
  const t = useTranslations("growth.charts")
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <button
        onClick={() => { onSelect(null); }}
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          selected === null ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"
        }`}
      >
        {t("all")}
      </button>
      {Object.entries(DIMENSION_NAMES).map(([dim]) => (
        <button
          key={dim}
          onClick={() => { onSelect(selected === dim ? null : dim); }}
          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            selected === dim ? "text-white" : "bg-slate-100 text-slate-600"
          }`}
          style={{
            backgroundColor: selected === dim ? DIMENSION_COLORS[dim] : undefined,
          }}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIMENSION_COLORS[dim] }} />
          {t(`dims.${dim}`)}
        </button>
      ))}
    </div>
  )
}

// 空态文案（无数据子图表共用）
function NoHistoryText() {
  const t = useTranslations("growth.charts")
  return <>{t("noHistory")}</>
}
