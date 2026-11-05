"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useState } from "react"

interface TimelineEvent {
  id: string
  type: "milestone" | "observation" | "emotion" | "learning" | "health"
  title: string
  description: string
  date: string
  age: string
  icon: string
  color: string
  media?: string[]
  tags?: string[]
  aiInsight?: string
}

interface GrowthTimelineProps {
  events?: TimelineEvent[]
  childName?: string
}

const defaultEvents: TimelineEvent[] = [
  {
    id: "1",
    type: "milestone",
    title: "第一次独立完成数学作业",
    description: "今天小云不需要任何帮助，独立完成了所有数学题！这标志着学习自主性的重要进步。",
    date: "2025-01-15",
    age: "6岁3个月",
    icon: "ri-medal-line",
    color: "yellow",
    tags: ["学习", "独立性", "数学"],
    aiInsight: "这是一个重要的学习里程碑！独立完成作业表明孩子的专注力和问题解决能力正在快速发展。",
  },
  {
    id: "2",
    type: "observation",
    title: "社交能力显著提升",
    description: "在公园主动邀请其他小朋友一起玩耍，并能够协调游戏规则，表现出良好的社交领导力。",
    date: "2025-01-10",
    age: "6岁3个月",
    icon: "ri-user-heart-line",
    color: "purple",
    tags: ["社交", "友谊", "领导力"],
    aiInsight: "主动社交是情商发展的重要标志，建议多创造同龄互动机会。",
  },
  {
    id: "3",
    type: "emotion",
    title: "情绪表达进步",
    description: "收到老师表扬后，能够用语言清晰表达开心的感受，并主动与家人分享这份喜悦。",
    date: "2025-01-08",
    age: "6岁2个月",
    icon: "ri-emotion-happy-line",
    color: "pink",
    tags: ["情绪", "表达", "分享"],
    aiInsight: "用语言表达情绪是情商发展的关键能力，可以鼓励孩子日常多进行情感分享。",
  },
  {
    id: "4",
    type: "learning",
    title: "阅读兴趣萌芽",
    description: "主动要求阅读《西游记》绘本，并能复述孙悟空大闹天宫的故事情节。",
    date: "2025-01-05",
    age: "6岁2个月",
    icon: "ri-book-open-line",
    color: "blue",
    tags: ["阅读", "文化", "表达"],
    aiInsight: "阅读兴趣是终身学习的基础，可以适当增加国学经典的启蒙内容。",
  },
  {
    id: "5",
    type: "health",
    title: "体能测试达标",
    description: "完成幼儿园体能测试，跑跳投掷各项指标均达到优秀标准。",
    date: "2025-01-02",
    age: "6岁2个月",
    icon: "ri-run-line",
    color: "green",
    tags: ["健康", "运动", "体能"],
    aiInsight: "体能发展良好，建议保持每天1小时户外运动时间。",
  },
]

// 类型标签走 growth.timeline.types 词条（bgColor/borderColor/textColor 为纯视觉属性保留）
const typeConfig = {
  milestone: {
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-400",
    textColor: "text-yellow-700",
  },
  observation: {
    bgColor: "bg-purple-100",
    borderColor: "border-purple-400",
    textColor: "text-purple-700",
  },
  emotion: { bgColor: "bg-pink-100", borderColor: "border-pink-400", textColor: "text-pink-700" },
  learning: { bgColor: "bg-blue-100", borderColor: "border-blue-400", textColor: "text-blue-700" },
  health: { bgColor: "bg-green-100", borderColor: "border-green-400", textColor: "text-green-700" },
}

export default function GrowthTimeline({ events = defaultEvents, childName = "小云" }: GrowthTimelineProps) {
  const t = useTranslations("growth.timeline")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"timeline" | "grid">("timeline")

  const filteredEvents = selectedType === "all" ? events : events.filter((e) => e.type === selectedType)

  const groupedByMonth = filteredEvents.reduce<Record<string, TimelineEvent[]>>(
    (acc, event) => {
      const month = event.date.substring(0, 7)
      if (!acc[month]) acc[month] = []
      acc[month].push(event)
      return acc
    },
    {},
  )

  return (
    <div className="space-y-6">
      {/* 头部统计 */}
      <div className="bg-linear-to-r from-blue-500 to-purple-500 rounded-2xl p-5 text-white">
        <h3 className="text-lg font-bold mb-2">
          <i className="ri-time-line mr-2" />
          {t("titleOf", { name: childName })}
        </h3>
        <div className="grid grid-cols-5 gap-2 mt-4">
          {Object.entries(typeConfig).map(([type]) => {
            const count = events.filter((e) => e.type === type).length
            return (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs opacity-80">{t(`types.${type}`)}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 筛选器 */}
      <div className="flex gap-2 flex-wrap">
        <motion.button
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedType === "all" ? "bg-slate-800 text-white" : "bg-surface text-adaptive-muted hover:bg-surface-soft"
            }`}
          onClick={() => { setSelectedType("all"); }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {t("filterAll")}
        </motion.button>
        {Object.entries(typeConfig).map(([type, config]) => (
          <motion.button
            key={type}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedType === type
              ? `${config.bgColor} ${config.textColor}`
              : "bg-surface text-adaptive-muted hover:bg-surface-soft"
              }`}
            onClick={() => { setSelectedType(type); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t(`types.${type}`)}
          </motion.button>
        ))}
      </div>

      {/* 视图切换 */}
      <div className="flex justify-end gap-2">
        <button
          className={`p-2 rounded-lg ${viewMode === "timeline" ? "bg-blue-100 text-blue-600" : "bg-surface text-adaptive-muted"}`}
          onClick={() => { setViewMode("timeline"); }}
        >
          <i className="ri-time-line text-xl" />
        </button>
        <button
          className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-blue-100 text-blue-600" : "bg-surface text-adaptive-muted"}`}
          onClick={() => { setViewMode("grid"); }}
        >
          <i className="ri-grid-line text-xl" />
        </button>
      </div>

      {/* 时间线视图 */}
      {viewMode === "timeline" && (
        <div className="relative">
          {/* 时间线轴 */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-linear-to-b from-blue-300 via-purple-300 to-pink-300" />

          {Object.entries(groupedByMonth).map(([month, monthEvents], _monthIndex) => (
            <div key={month} className="mb-8">
              {/* 月份标签 */}
              <div className="relative flex items-center mb-4">
                <div className="w-12 h-12 bg-surface rounded-full border-4 border-blue-400 flex items-center justify-center z-10">
                  <span className="text-xs font-bold text-blue-600">{t("monthLabel", { year: month.split("-")[0], month: month.split("-")[1] })}</span>
                </div>
                <span className="ml-4 text-lg font-bold text-adaptive">
                  {t("monthLabel", { year: month.split("-")[0], month: month.split("-")[1] })}
                </span>
              </div>

              {/* 事件列表 */}
              <div className="ml-16 space-y-4">
                <AnimatePresence>
                  {monthEvents.map((event, index) => {
                    const config = typeConfig[event.type]
                    const isExpanded = expandedId === event.id

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className={`relative ${config.bgColor} rounded-2xl p-4 border-l-4 ${config.borderColor} cursor-pointer`}
                        onClick={() => { setExpandedId(isExpanded ? null : event.id); }}
                      >
                        {/* 连接点 */}
                        <div
                          className={`absolute -left-[2.85rem] top-4 w-4 h-4 rounded-full ${config.bgColor} border-2 ${config.borderColor}`}
                        />

                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 ${config.bgColor} rounded-xl flex items-center justify-center ${config.textColor}`}
                          >
                            <i className={`${event.icon} text-xl`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-adaptive">{event.title}</h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${config.bgColor} ${config.textColor}`}>
                                {t(`types.${event.type}`)}
                              </span>
                            </div>
                            <p className="text-sm text-adaptive-muted mt-1">
                              {event.age} · {event.date}
                            </p>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="mt-3 overflow-hidden"
                                >
                                  <p className="text-adaptive-muted text-sm mb-3">{event.description}</p>

                                  {event.tags && (
                                    <div className="flex gap-2 flex-wrap mb-3">
                                      {event.tags.map((tag, i) => (
                                        <span
                                          key={i}
                                          className="px-2 py-1 bg-white/60 dark:bg-gray-800/60 rounded-full text-xs text-adaptive-muted"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {event.aiInsight && (
                                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 mt-2">
                                      <div className="flex items-center gap-2 text-xs text-adaptive-muted mb-1">
                                        <i className="ri-sparkling-line" />
                                        {t("aiInsightLabel")}
                                      </div>
                                      <p className="text-sm text-adaptive-muted">{event.aiInsight}</p>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          <i className={`ri-arrow-${isExpanded ? "up" : "down"}-s-line text-adaptive-muted`} />
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 网格视图 */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((event, index) => {
            const config = typeConfig[event.type]
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`${config.bgColor} rounded-2xl p-4 border ${config.borderColor}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.textColor} bg-white/50 dark:bg-gray-800/50`}
                  >
                    <i className={`${event.icon} text-xl`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-adaptive text-sm">{event.title}</h4>
                    <p className="text-xs text-slate-500">
                      {event.age} · {event.date}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{event.description}</p>
                {event.tags && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {event.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white/60 rounded-full text-xs text-slate-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {filteredEvents.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <i className="ri-inbox-line text-4xl mb-2" />
          <p>{selectedType !== "all" ? t("empty", { label: t(`types.${selectedType}`) }) : t("emptyAll")}</p>
        </div>
      )}
    </div>
  )
}
