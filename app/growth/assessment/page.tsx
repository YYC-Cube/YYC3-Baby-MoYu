"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import PageHeader from "@/components/headers/PageHeader"
import Navigation from "@/components/Navigation"
import { useChildren } from "@/hooks/useChildren"
import { authFetch } from "@/lib/api/auth-fetch"
import {
  STAGE_ASSESSMENTS,
  getApplicableQuestions,
  calculateDimensionScore,
  generateRecommendations,
  type AssessmentDimension,
  type AssessmentQuestion,
} from "@/lib/assessment_questions"

export default function AssessmentPage() {
  const [currentStage] = useState("3-6")
  const [ageInMonths] = useState(48) // 4岁
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [showReport, setShowReport] = useState(false)
  // 获取当前阶段的适用评估
  const stageAssessment = STAGE_ASSESSMENTS[currentStage]
  const applicableDimensions = useMemo(
    () => stageAssessment ? getApplicableQuestions(stageAssessment, ageInMonths) : [],
    [stageAssessment, ageInMonths],
  )

  const currentDimension = applicableDimensions[currentDimensionIndex]
  const progress = ((currentDimensionIndex + 1) / applicableDimensions.length) * 100

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers({ ...answers, [questionId]: value })
  }

  const canProceed = currentDimension?.questions.every((q) => answers[q.id] !== undefined) ?? false

  const handleNext = () => {
    if (currentDimensionIndex < applicableDimensions.length - 1) {
      setCurrentDimensionIndex(currentDimensionIndex + 1)
    } else {
      setShowReport(true)
    }
  }

  const handlePrevious = () => {
    if (currentDimensionIndex > 0) {
      setCurrentDimensionIndex(currentDimensionIndex - 1)
    }
  }

  if (showReport) {
    return (
      <AssessmentReport
        answers={answers}
        dimensions={applicableDimensions}
        stageId={currentStage}
        onRestart={() => {
          setShowReport(false)
          setCurrentDimensionIndex(0)
          setAnswers({})
        }}
      />
    )
  }

  if (!currentDimension) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <p>当前年龄段暂无适用的评估问题</p>
      </div>
    )
  }

  const colorClasses: Record<string, { bg: string; text: string; fill: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-500", fill: "bg-blue-400" },
    green: { bg: "bg-green-50", text: "text-green-500", fill: "bg-green-400" },
    orange: { bg: "bg-orange-50", text: "text-orange-500", fill: "bg-orange-400" },
    purple: { bg: "bg-purple-50", text: "text-purple-500", fill: "bg-purple-400" },
    pink: { bg: "bg-pink-50", text: "text-pink-500", fill: "bg-pink-400" },
    teal: { bg: "bg-teal-50", text: "text-teal-500", fill: "bg-teal-400" },
    yellow: { bg: "bg-yellow-50", text: "text-yellow-600", fill: "bg-yellow-400" },
  }

  const currentColor = colorClasses[currentDimension.color] || colorClasses['blue']

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      <PageHeader icon="ri-pulse-line" title="发展评估" />

      {/* 进度条 */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">
              {stageAssessment?.stageName} · 第 {currentDimensionIndex + 1} / {applicableDimensions.length} 维度
            </span>
            <span className="text-sm font-medium text-blue-500">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-linear-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentDimensionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* 维度标题 */}
              <div className={`${currentColor?.bg || 'bg-blue-50'} rounded-2xl p-5`}>
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 ${currentColor?.fill || 'bg-blue-400'} rounded-xl flex items-center justify-center text-white text-2xl`}
                  >
                    <i className={currentDimension.icon} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{currentDimension.name}</h2>
                    <p className="text-slate-600 text-sm">{currentDimension.description}</p>
                  </div>
                </div>
              </div>

              {/* 问题列表 */}
              <div className="space-y-3">
                {currentDimension.questions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    answer={answers[question.id]}
                    onAnswer={(value) => { handleAnswer(question.id, value); }}
                    color={currentDimension.color}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* 导航按钮 */}
          <div className="flex gap-3 mt-6 pb-24">
            {currentDimensionIndex > 0 && (
              <motion.button
                onClick={handlePrevious}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                上一步
              </motion.button>
            )}

            <motion.button
              onClick={handleNext}
              disabled={!canProceed}
              className="flex-1 px-5 py-3 bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: canProceed ? 1.02 : 1 }}
              whileTap={{ scale: canProceed ? 0.98 : 1 }}
            >
              {currentDimensionIndex < applicableDimensions.length - 1 ? "下一步" : "完成评估"}
            </motion.button>
          </div>
        </div>
      </main>

      <Navigation />
    </div>
  )
}

// 问题卡片组件
function QuestionCard({
  question,
  index,
  answer,
  onAnswer,
  color,
}: {
  question: AssessmentQuestion
  index: number
  answer: number | undefined
  onAnswer: (value: number) => void
  color: string
}) {
  const scaleLabels = ["完全不符合", "基本不符合", "一般", "比较符合", "完全符合"]

  const colorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-500", text: "text-blue-500" },
    green: { bg: "bg-green-500", text: "text-green-500" },
    orange: { bg: "bg-orange-500", text: "text-orange-500" },
    purple: { bg: "bg-purple-500", text: "text-purple-500" },
    pink: { bg: "bg-pink-500", text: "text-pink-500" },
    teal: { bg: "bg-teal-500", text: "text-teal-500" },
    yellow: { bg: "bg-yellow-500", text: "text-yellow-600" },
  }

  const currentColor = colorClasses[color] || colorClasses['blue']

  return (
    <motion.div
      className="bg-white rounded-xl p-4 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-slate-600">
          {index + 1}
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-800 mb-3 text-sm leading-relaxed">{question.text}</p>

          {question.standardRef && <p className="text-xs text-slate-400 mb-2">参考标准: {question.standardRef}</p>}

          {question.type === "scale" && (
            <div className="space-y-2">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <motion.button
                    key={value}
                    onClick={() => { onAnswer(value); }}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm ${
                      answer === value ? `${currentColor?.bg || 'bg-blue-500'} text-white` : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {value}
                  </motion.button>
                ))}
              </div>
              {answer !== undefined && <p className="text-xs text-slate-500 text-center">{scaleLabels[answer - 1]}</p>}
            </div>
          )}

          {question.type === "yesno" && (
            <div className="flex gap-2">
              <motion.button
                onClick={() => { onAnswer(5); }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm ${
                  answer === 5 ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                是
              </motion.button>
              <motion.button
                onClick={() => { onAnswer(1); }}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm ${
                  answer === 1 ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                否
              </motion.button>
            </div>
          )}

          {question.type === "frequency" && (
            <div className="flex gap-1.5">
              {["从不", "偶尔", "有时", "经常", "总是"].map((label, i) => (
                <motion.button
                  key={i}
                  onClick={() => { onAnswer(i + 1); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                    answer === i + 1 ? `${currentColor?.bg || 'bg-blue-500'} text-white` : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {label}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// 评估报告组件
function AssessmentReport({
  answers,
  dimensions,
  stageId,
  onRestart,
}: {
  answers: Record<string, number>
  dimensions: AssessmentDimension[]
  stageId: string
  onRestart: () => void
}) {
  const dimensionScores = dimensions.map((dimension) => ({
    ...dimension,
    score: calculateDimensionScore(answers, dimension.questions),
  }))

  const overallScore = dimensionScores.length > 0
    ? Math.round(dimensionScores.reduce((sum, d) => sum + d.score, 0) / dimensionScores.length)
    : 0

  const scoreMap = Object.fromEntries(dimensionScores.map((d) => [d.id, d.score]))
  const recommendations = generateRecommendations(scoreMap, stageId)

  // 落库：评估结果写入 growth_assessments（此前仅前端展示，刷新即丢）
  const { currentChild, isLoading: childrenLoading } = useChildren()
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [saveMessage, setSaveMessage] = useState("")

  const handleSave = async () => {
    if (saveState === "saving") return
    if (!currentChild) {
      setSaveState("error")
      setSaveMessage("请先在「宝宝档案」创建并选择宝宝，评估结果才能保存")
      return
    }
    setSaveState("saving")
    setSaveMessage("")

    try {
      const res = await authFetch("/api/growth-assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: currentChild.id,
          stage_id: stageId,
          dimensions: dimensionScores.map((d) => ({ id: d.id, name: d.name, score: d.score })),
          overall_score: overallScore,
          recommendations,
        }),
      })
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string }
      if (res.status === 401) {
        setSaveState("error")
        setSaveMessage("请先登录后再保存报告")
        return
      }
      if (!res.ok || !result.success) {
        setSaveState("error")
        setSaveMessage(result.message ?? `保存失败（HTTP ${res.status}）`)
        return
      }
      setSaveState("saved")
      setSaveMessage(`已保存到 ${currentChild.name} 的成长档案`)
    } catch (err) {
      setSaveState("error")
      setSaveMessage(err instanceof Error ? err.message : "保存失败，请稍后重试")
    }
  }

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 text-blue-500",
    green: "bg-green-100 text-green-500",
    orange: "bg-orange-100 text-orange-500",
    purple: "bg-purple-100 text-purple-500",
    pink: "bg-pink-100 text-pink-500",
    teal: "bg-teal-100 text-teal-500",
    yellow: "bg-yellow-100 text-yellow-600",
  }

  const barColors: Record<string, string> = {
    blue: "bg-blue-400",
    green: "bg-green-400",
    orange: "bg-orange-400",
    purple: "bg-purple-400",
    pink: "bg-pink-400",
    teal: "bg-teal-400",
    yellow: "bg-yellow-400",
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      <PageHeader icon="ri-file-chart-line" title="评估报告" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* 综合得分 */}
            <div className="bg-linear-to-br from-blue-500 to-purple-500 rounded-2xl p-6 text-white text-center">
              <h2 className="text-lg mb-3">综合发展评估得分</h2>
              <motion.div
                className="text-6xl font-bold mb-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              >
                {overallScore}
              </motion.div>
              <p className="text-white/90 text-sm">
                {overallScore >= 85 && "发展优秀，继续保持！"}
                {overallScore >= 70 && overallScore < 85 && "发展良好，稳步前进！"}
                {overallScore >= 50 && overallScore < 70 && "发展正常，可加强薄弱项"}
                {overallScore < 50 && "建议关注发展情况，必要时咨询专业人士"}
              </p>
            </div>

            {/* 各维度得分 */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">各维度发展情况</h3>
              <div className="space-y-3">
                {dimensionScores.map((dimension, i) => (
                  <motion.div
                    key={dimension.id}
                    className="bg-white rounded-xl p-4 shadow-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${colorClasses[dimension.color]}`}
                      >
                        <i className={dimension.icon} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800 text-sm">{dimension.name}</span>
                          <span
                            className={`font-bold text-lg ${dimension.score >= 70 ? "text-green-500" : dimension.score >= 50 ? "text-yellow-500" : "text-red-500"}`}
                          >
                            {dimension.score}分
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${barColors[dimension.color]}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${dimension.score}%` }}
                            transition={{ duration: 1, delay: i * 0.1 + 0.3 }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* AI建议 */}
            <div className="bg-blue-50 rounded-xl p-5">
              <h3 className="text-base font-bold text-blue-700 mb-3 flex items-center gap-2">
                <i className="ri-lightbulb-flash-line" />
                AI小语的专业建议
              </h3>
              <div className="space-y-2">
                {recommendations.slice(0, 4).map((rec, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <i className="ri-arrow-right-line text-white text-xs" />
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <motion.button
                onClick={onRestart}
                className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                重新评估
              </motion.button>
              <motion.button
                onClick={handleSave}
                disabled={saveState === "saving"}
                className="flex-1 px-5 py-3 bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                whileHover={{ scale: saveState === "saving" ? 1 : 1.02 }}
                whileTap={{ scale: saveState === "saving" ? 1 : 0.98 }}
              >
                {saveState === "saving" ? "保存中…" : saveState === "saved" ? "已保存" : "保存报告"}
              </motion.button>
            </div>

            {/* 保存反馈：明确告知「存到哪、为什么没存」 */}
            {saveMessage && (
              <p
                className={`text-sm ${saveState === "error" ? "text-red-600" : "text-green-600"}`}
                role="status"
              >
                {saveMessage}
              </p>
            )}
            {!childrenLoading && !currentChild && saveState === "idle" && (
              <p className="text-sm text-slate-500">当前未选择宝宝档案，保存前请先创建档案。</p>
            )}
          </motion.div>
        </div>
      </main>

      <Navigation />
    </div>
  )
}
