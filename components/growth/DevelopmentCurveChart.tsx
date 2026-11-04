"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"

interface DataPoint {
  age: number // 月龄
  value: number
  date: string
}

interface DevelopmentCurveChartProps {
  dataPoints?: DataPoint[] // 兼容新的props
  metricName?: string // 兼容新的props
  childName?: string // 兼容新的props
  childData?: DataPoint[] // 原props
  standardData?: {
    p5: DataPoint[] // 5th percentile
    p25: DataPoint[] // 25th percentile
    p50: DataPoint[] // 50th percentile (median)
    p75: DataPoint[] // 75th percentile
    p95: DataPoint[] // 95th percentile
  } // 原props
  dimension?: string // 原props
  title?: string // 原props
  unit?: string // 原props
}

export default function DevelopmentCurveChart({
  dataPoints,
  metricName = "身高",
  childName: _childName = "宝宝",
  childData,
  standardData,
  dimension,
  title,
  unit,
}: DevelopmentCurveChartProps) {
  // 兼容新旧props
  const t = useTranslations("growth.devCurve")
  const actualChildData = childData || dataPoints || []
  const actualTitle = title || t("titleOf", { metric: metricName })
  const actualUnit = unit || "cm"
  const _actualDimension = dimension || metricName
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null)
  const [showPercentiles, setShowPercentiles] = useState(true)

  // 图表尺寸
  const width = 600
  const height = 300
  const padding = { top: 20, right: 30, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // 数据验证和清理
  const validChildData = (actualChildData || []).filter(point =>
    point &&
    typeof point.age === 'number' && !isNaN(point.age) && point.age >= 0 &&
    typeof point.value === 'number' && !isNaN(point.value) && point.value >= 0
  )

  // 计算数据范围
  const allValues = [
    ...validChildData.map((d) => d.value),
    ...(showPercentiles && standardData ?
      [...(standardData.p5 || []).filter(point => point && typeof point.value === 'number' && !isNaN(point.value)).map((d) => d.value),
       ...(standardData?.p95 || []).filter(point => point && typeof point.value === 'number' && !isNaN(point.value)).map((d) => d.value)]
      : []),
  ].filter(value => typeof value === 'number' && !isNaN(value) && value >= 0)

  // 确保有有效数据，如果没有则使用默认范围
  const minValue = allValues.length > 0 ? Math.min(...allValues) * 0.9 : 0
  const maxValue = allValues.length > 0 ? Math.max(...allValues) * 1.1 : 100
  const maxAge = validChildData.length > 0 ? Math.max(...validChildData.map((d) => d.age), 36) : 36

  // 坐标转换函数
  const xScale = (age: number) => {
    if (typeof age !== 'number' || isNaN(age) || age < 0) return padding.left
    if (maxAge <= 0 || chartWidth <= 0) return padding.left
    const scaledValue = (age / maxAge) * chartWidth + padding.left
    return isNaN(scaledValue) ? padding.left : scaledValue
  }
  const yScale = (value: number) => {
    if (typeof value !== 'number' || isNaN(value) || value < 0) return height - padding.bottom
    if (chartHeight <= 0 || maxValue <= minValue) return height - padding.bottom
    const scaledValue = chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight + padding.top
    return isNaN(scaledValue) ? height - padding.bottom : scaledValue
  }

  // 生成路径
  const generatePath = (data: DataPoint[]) => {
    const validData = data.filter(point =>
      point &&
      typeof point.age === 'number' && !isNaN(point.age) && point.age >= 0 &&
      typeof point.value === 'number' && !isNaN(point.value) && point.value >= 0
    )

    if (validData.length === 0) return ""

    return validData
      .map((point, i) => {
        const x = xScale(point.age)
        const y = yScale(point.value)
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(" ")
  }

  // 生成区域路径 (用于百分位区间)
  const generateAreaPath = (upper: DataPoint[], lower: DataPoint[]) => {
    if (upper.length === 0 || lower.length === 0) return ""
    const upperPath = upper
      .map((point, i) => {
        const x = xScale(point.age)
        const y = yScale(point.value)
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
      })
      .join(" ")
    const lowerPath = [...lower]
      .reverse()
      .map((point) => {
        const x = xScale(point.age)
        const y = yScale(point.value)
        return `L ${x} ${y}`
      })
      .join(" ")
    return `${upperPath} ${lowerPath} Z`
  }

  // 计算孩子在同龄人中的百分位
  const getPercentileRank = (childValue: number, age: number): number => {
    if (!standardData) return 50 // 默认返回中位数

    const p5 = standardData.p5?.find((d) => d.age === age)?.value || 0
    const p50 = standardData.p50?.find((d) => d.age === age)?.value || 0
    const p95 = standardData.p95?.find((d) => d.age === age)?.value || 0

    if (childValue <= p5) return 5
    if (childValue >= p95) return 95
    if (childValue <= p50) {
      return 5 + ((childValue - p5) / (p50 - p5)) * 45
    }
    return 50 + ((childValue - p50) / (p95 - p50)) * 45
  }

  const latestPoint = validChildData && validChildData.length > 0 ? validChildData[validChildData.length - 1] : null
  const percentileRank = latestPoint ? Math.round(getPercentileRank(latestPoint.value, latestPoint.age)) : null

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{actualTitle}</h3>
          <p className="text-sm text-slate-500">{t("unitLabel", { unit: actualUnit })}</p>
        </div>

        <div className="flex items-center gap-4">
          {/* 百分位显示开关 */}
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showPercentiles}
              onChange={(e) => { setShowPercentiles(e.target.checked); }}
              className="rounded border-slate-300"
            />
            {t("showReference")}
          </label>

          {/* 当前百分位 */}
          {percentileRank !== null && (
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                percentileRank >= 25 && percentileRank <= 75
                  ? "bg-green-100 text-green-700"
                  : percentileRank >= 10 && percentileRank <= 90
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {t("percentile", { rank: percentileRank })}
            </div>
          )}
        </div>
      </div>

      {/* 图表 */}
      <div className="relative">
        <svg width={width} height={height} className="overflow-visible">
          {/* 网格线 */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={padding.top + chartHeight * ratio}
                x2={padding.left + chartWidth}
                y2={padding.top + chartHeight * ratio}
                stroke="#e2e8f0"
                strokeDasharray="4"
              />
              <text
                x={padding.left - 10}
                y={padding.top + chartHeight * ratio}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-xs fill-slate-400"
              >
                {Math.round(maxValue - (maxValue - minValue) * ratio)}
              </text>
            </g>
          ))}

          {/* X轴标签 */}
          {[0, 6, 12, 18, 24, 30, 36]
            .filter((m) => m <= maxAge)
            .map((month) => (
              <text
                key={month}
                x={xScale(month)}
                y={height - 10}
                textAnchor="middle"
                className="text-xs fill-slate-400"
              >
                {t("monthAxis", { month })}
              </text>
            ))}

          {/* 百分位区间 (底层) */}
          {showPercentiles && (
            <>
              {/* 5-95 百分位区间 */}
              {standardData?.p95 && standardData?.p5 && (
                <motion.path
                  d={generateAreaPath(standardData.p95, standardData.p5)}
                  fill="#e0f2fe"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                />
              )}

              {/* 25-75 百分位区间 */}
              {standardData?.p75 && standardData?.p25 && (
                <motion.path
                  d={generateAreaPath(standardData.p75, standardData.p25)}
                  fill="#bae6fd"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                />
              )}

              {/* 中位线 (50%) */}
              {standardData?.p50 && (
                <motion.path
                  d={generatePath(standardData.p50)}
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1 }}
                />
              )}
            </>
          )}

          {/* 孩子的发展曲线 */}
          <motion.path
            d={generatePath(validChildData)}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5 }}
          />

          {/* 数据点 */}
          {validChildData.map((point, i) => (
            <motion.g key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.1 }}>
              <circle
                cx={xScale(point.age)}
                cy={yScale(point.value)}
                r={hoveredPoint === point ? 8 : 6}
                fill="#8b5cf6"
                stroke="white"
                strokeWidth={2}
                className="cursor-pointer transition-all"
                onMouseEnter={() => { setHoveredPoint(point); }}
                onMouseLeave={() => { setHoveredPoint(null); }}
              />
            </motion.g>
          ))}

          {/* 悬浮提示 */}
          {hoveredPoint && (
            <g>
              <rect
                x={xScale(hoveredPoint.age) - 50}
                y={yScale(hoveredPoint.value) - 50}
                width={100}
                height={40}
                rx={8}
                fill="white"
                stroke="#e2e8f0"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
              />
              <text
                x={xScale(hoveredPoint.age)}
                y={yScale(hoveredPoint.value) - 35}
                textAnchor="middle"
                className="text-sm font-medium fill-slate-700"
              >
                {hoveredPoint.value} {actualUnit}
              </text>
              <text
                x={xScale(hoveredPoint.age)}
                y={yScale(hoveredPoint.value) - 18}
                textAnchor="middle"
                className="text-xs fill-slate-400"
              >
                {hoveredPoint.date}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-purple-500 rounded"></div>
          <span className="text-slate-600">{t("legendChild")}</span>
        </div>
        {showPercentiles && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-sky-400 rounded border-dashed"></div>
              <span className="text-slate-600">{t("legendMedian")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-sky-200 rounded"></div>
              <span className="text-slate-600">{t("legendRange")}</span>
            </div>
          </>
        )}
      </div>

      {/* 解读说明 */}
      <div className="mt-4 p-4 bg-slate-50 rounded-xl">
        <h4 className="text-sm font-medium text-slate-700 mb-2">{t("interpTitle")}</h4>
        <p className="text-sm text-slate-500">
          {percentileRank !== null &&
            percentileRank >= 25 &&
            percentileRank <= 75 &&
            t("interp.normal")}
          {percentileRank !== null &&
            (percentileRank < 25 || percentileRank > 75) &&
            (percentileRank < 25 ? t("interp.below") : t("interp.above"))}
          {percentileRank === null && t("interp.noData")}
        </p>
      </div>
    </div>
  )
}
