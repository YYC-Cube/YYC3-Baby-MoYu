"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { useGrowthStage } from "@/hooks/useGrowthStage"
import { AGE_STAGES } from "@/lib/growth_stages"

interface StageIndicatorProps {
  birthDate?: Date
  childName?: string
  compact?: boolean
  showMilestones?: boolean
  showRecommendations?: boolean
}

export default function StageIndicator({
  birthDate,
  childName: _childName,
  compact = false,
  showMilestones: _showMilestones = false,
  showRecommendations = false,
}: StageIndicatorProps) {
  const t = useTranslations("growth.stage")
  const {
    currentStage,
    exactAge: _exactAge,
    formatAge,
    milestoneProgress,
    approachingNextStage,
    recommendations,
    setChildBirthDate,
  } = useGrowthStage(birthDate)

  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (birthDate) {
      setChildBirthDate(birthDate)
    }
  }, [birthDate, setChildBirthDate])

  if (!currentStage) {
    return (
      <div className="bg-slate-100 rounded-2xl p-4 text-center text-slate-500">
        <i className="ri-calendar-line text-2xl mb-2" />
        <p>{t("setBirthdate")}</p>
      </div>
    )
  }

  const stageColors: Record<string, string> = {
    blue: "from-blue-400 to-blue-600",
    green: "from-green-400 to-green-600",
    orange: "from-orange-400 to-orange-600",
    purple: "from-purple-400 to-purple-600",
    pink: "from-pink-400 to-pink-600",
    red: "from-red-400 to-red-600",
    indigo: "from-indigo-400 to-indigo-600",
  }

  if (compact) {
    return (
      <motion.div
        className={`bg-linear-to-r ${stageColors[currentStage.color]} rounded-xl p-3 text-white cursor-pointer`}
        onClick={() => { setShowDetails(true); }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <i className={`${currentStage.icon} text-xl`} />
          </div>
          <div>
            <h4 className="font-bold">{currentStage.name}</h4>
            <p className="text-sm text-white/80">{formatAge()}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <>
      <motion.div
        className={`bg-linear-to-br ${stageColors[currentStage.color]} rounded-3xl p-6 text-white`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* 阶段头部 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
            >
              <i className={`${currentStage.icon} text-3xl`} />
            </motion.div>
            <div>
              <h3 className="text-2xl font-bold">{currentStage.name}</h3>
              <p className="text-white/80">{currentStage.subtitle}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{formatAge()}</p>
            <p className="text-sm text-white/70">{currentStage.ageRange}</p>
          </div>
        </div>

        {/* 阶段描述 */}
        <p className="text-white/90 mb-4">{currentStage.description}</p>

        {/* 里程碑进度 */}
        <div className="bg-white/10 rounded-2xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">{t("milestoneProgress")}</span>
            <span className="text-sm">
              {milestoneProgress.completed}/{milestoneProgress.total}
            </span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${(milestoneProgress.completed / milestoneProgress.total) * 100}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
          {milestoneProgress.upcoming.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-white/70 mb-1">{t("upcoming")}</p>
              <div className="flex flex-wrap gap-2">
                {milestoneProgress.upcoming.map((m, i) => (
                  <span key={i} className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 阶段转换提醒 */}
        {approachingNextStage.approaching && approachingNextStage.nextStage && (
          <motion.div
            className="bg-yellow-400/20 border border-yellow-400/30 rounded-xl p-3 mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-2">
              <i className="ri-notification-3-line text-yellow-300" />
              <span className="text-sm">
                {t("approaching", { days: approachingNextStage.daysUntil, stage: AGE_STAGES[approachingNextStage.nextStage]?.name })}
              </span>
            </div>
          </motion.div>
        )}

        {/* 重点发展领域 */}
        <div className="flex flex-wrap gap-2">
          {currentStage.focusAreas?.slice(0, 5).map((area: string, i: number) => (
            <motion.span
              key={i}
              className="bg-white/20 px-3 py-1 rounded-full text-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              {area}
            </motion.span>
          ))}
        </div>

        {/* 展开详情按钮 */}
        {showRecommendations && (
          <button
            className="w-full mt-4 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition"
            onClick={() => { setShowDetails(true); }}
          >
            {t("viewAdvice")}
          </button>
        )}
      </motion.div>

      {/* 详情弹窗 */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowDetails(false); }}
          >
            <motion.div
              className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => { e.stopPropagation(); }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{t("adviceTitle", { stage: currentStage.name })}</h3>
                <button
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
                  onClick={() => { setShowDetails(false); }}
                >
                  <i className="ri-close-line" />
                </button>
              </div>

              {/* 推荐活动 */}
              <div className="mb-6">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <i className="ri-gamepad-line text-green-500" />
                  {t("recActivities")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {recommendations.activities.map((activity, i) => (
                    <span key={i} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                      {activity}
                    </span>
                  ))}
                </div>
              </div>

              {/* 推荐书籍 */}
              <div className="mb-6">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <i className="ri-book-open-line text-blue-500" />
                  {t("recBooks")}
                </h4>
                <div className="space-y-2">
                  {recommendations.books.map((book, i) => (
                    <div key={i} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-sm">
                      {book}
                    </div>
                  ))}
                </div>
              </div>

              {/* 重点技能 */}
              <div className="mb-6">
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <i className="ri-star-line text-yellow-500" />
                  {t("keySkills")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {recommendations.skills.map((skill, i) => (
                    <span key={i} className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* 注意事项 */}
              <div>
                <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <i className="ri-alert-line text-red-500" />
                  {t("warnings")}
                </h4>
                <div className="space-y-2">
                  {recommendations.warnings.map((warning, i) => (
                    <div key={i} className="bg-red-50 text-red-700 px-3 py-2 rounded-xl text-sm flex items-start gap-2">
                      <i className="ri-error-warning-line mt-0.5" />
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
