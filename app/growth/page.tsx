"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { authFetch } from "@/lib/api/auth-fetch"
import type { AgeStageConfig } from "@/types/growth"
import PageHeader from "@/components/headers/PageHeader"
import Navigation from "@/components/Navigation"
import CreateRecordModal, { type CreateRecordPayload } from "@/components/growth/CreateRecordModal"
import GrowthTimeline from "@/components/growth/GrowthTimeline"
import StageIndicator from "@/components/growth/StageIndicator"
import DevelopmentCurveChart from "@/components/growth/DevelopmentCurveChart"
import GrowthCharts from "@/components/growth/GrowthCharts"
import AssessmentReport from "@/components/growth/AssessmentReport"
import ChildSelector from "@/components/ChildSelector"
import { useGrowthStage } from "@/hooks/useGrowthStage"
import { useChildren } from "@/hooks/useChildren"
import { ChildQVersionAvatar } from "@/components/ui/QVersionCharacter"
import { useTranslations } from "next-intl"

type TabType = "overview" | "timeline" | "records" | "assessment"

// 模拟发展数据点
const mockDevelopmentData = [
  { age: 72, value: 115, date: "2023-01-15", percentile: 55 },
  { age: 73, value: 116.5, date: "2023-02-15", percentile: 58 },
  { age: 74, value: 117.2, date: "2023-03-15", percentile: 60 },
  { age: 75, value: 118.5, date: "2023-04-15", percentile: 62 },
  { age: 76, value: 119.8, date: "2023-05-15", percentile: 65 },
  { age: 77, value: 120.5, date: "2023-06-15", percentile: 63 },
]

// 模拟评估结果
const mockAssessmentResult = {
  id: "assessment-001",
  childId: "child-001",
  childName: "小云",
  childAge: 6,
  stageId: "stage_6_9",
  stageName: "学术奠基期",
  assessmentDate: new Date().toISOString(),
  overallScore: 87,
  overallLevel: "良好",
  dimensionScores: {
    academic: { score: 85, level: "良好", percentile: 75, description: "学业基础发展良好" },
    learning_habits: { score: 82, level: "良好", percentile: 70, description: "学习习惯基本养成" },
    logical_thinking: { score: 90, level: "优秀", percentile: 85, description: "逻辑思维能力突出" },
    self_management: { score: 78, level: "良好", percentile: 65, description: "自我管理能力有待提升" },
    social_skills: { score: 92, level: "优秀", percentile: 88, description: "社交能力优秀" },
  },
  strengths: ["逻辑思维能力突出，善于发现规律", "社交能力强，与同伴相处融洽", "对学习保持较高兴趣"],
  improvements: ["时间管理能力有待提升", "需要加强独立完成作业的习惯"],
  recommendations: [
    "继续培养阅读习惯，每天保持30分钟阅读时间",
    "可以尝试数学思维游戏，如数独、七巧板等",
    "建立固定的作业时间表，培养时间观念",
    "鼓励参与团队活动，发挥社交优势",
  ],
  aiAnalysis: "小云整体发展良好，在逻辑思维和社交能力方面表现突出。建议重点关注时间管理和自主学习能力的培养，通过游戏化方式激发学习兴趣。",
  nextSteps: [
    "建立每日学习计划表",
    "增加户外运动时间",
    "参与团队协作活动",
    "培养独立思考能力",
  ],
}

export default function GrowthPage() {
  const t = useTranslations("growth")
  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const { currentChild } = useChildren()

  const childBirthDate = currentChild?.birth_date ? new Date(currentChild.birth_date) : new Date("2018-09-15")
  // 示例人名「小云」为演示角色名，暂保留原文（P2 随子组件示例数据一并词条化）
  const childName = currentChild?.name || "小云"

  const growthStageData = useGrowthStage(childBirthDate)
  const { currentStage: stage, exactAge, milestoneProgress, approachingNextStage: stageTransition, recommendations } = growthStageData

  const tabs = [
    { id: "overview" as const, labelKey: "tabOverview", icon: "ri-dashboard-line" },
    { id: "timeline" as const, labelKey: "tabTimeline", icon: "ri-time-line" },
    { id: "records" as const, labelKey: "tabRecords", icon: "ri-file-list-3-line" },
    { id: "assessment" as const, labelKey: "tabAssessment", icon: "ri-bar-chart-box-line" },
  ] as const

  const handleCreateRecord = async (record: CreateRecordPayload) => {
    setIsCreateModalOpen(false)
    try {
      await authFetch("/api/growth-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: currentChild?.id ?? "default",
          type: record.type,
          title: record.title,
          content: record.content,
          media_urls: record.mediaUrls,
          tags: record.tags,
          recorded_at: record.createdAt,
        }),
      })
    } catch (error) {
      console.error("保存成长记录失败:", error)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 via-purple-50 to-pink-50 pb-24">
      <PageHeader title={t("title")} showBack />

      <main className="px-4 py-4 space-y-6">
        {currentChild && (
          <div className="bg-white/70 rounded-2xl p-4 flex items-center gap-4">
            <ChildQVersionAvatar child={currentChild} size="md" />
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">{t("childHeader", { name: currentChild.name })}</h3>
              <p className="text-sm text-slate-500">
                {t("ageStage", { stage: stage?.name ?? "", years: exactAge?.years ?? 0, months: exactAge?.months ?? 0 })}
              </p>
            </div>
            <ChildSelector />
          </div>
        )}

        {!currentChild && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-center">
            <p className="text-amber-700">{t("noChild")}</p>
            <Link href="/children" className="text-blue-600 underline text-sm mt-2 inline-block">
              {t("goAdd")}
            </Link>
          </div>
        )}

        {/* Tab导航 */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap ${
                activeTab === tab.id ? "bg-blue-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => { setActiveTab(tab.id); }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <i className={tab.icon} />
              <span>{t(tab.labelKey)}</span>
            </motion.button>
          ))}
        </div>

        {/* Tab内容 */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <OverviewTab
              key="overview"
              stage={stage}
              milestoneProgress={milestoneProgress}
              stageTransition={stageTransition}
              recommendations={recommendations}
              childName={childName}
              childBirthDate={childBirthDate}
            />
          )}
          {activeTab === "timeline" && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GrowthTimeline childName={childName} />
            </motion.div>
          )}
          {activeTab === "records" && <RecordsTab key="records" onOpenCreateModal={() => { setIsCreateModalOpen(true); }} />}
          {activeTab === "assessment" && <AssessmentTab key="assessment" childName={childName} />}
        </AnimatePresence>
      </main>

      <Navigation />

      <CreateRecordModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); }}
        onSubmit={handleCreateRecord}
      />
    </div>
  )
}

interface OverviewTabProps {
  stage: AgeStageConfig | null
  milestoneProgress: { completed: number; total: number; upcoming: string[] }
  stageTransition: { approaching: boolean; daysUntil: number; nextStage: string | null }
  recommendations: { activities: string[]; books: string[]; skills: string[]; warnings: string[] }
  childName: string
  childBirthDate: Date
}

function OverviewTab({
  stage,
  milestoneProgress,
  stageTransition,
  recommendations,
  childName,
  childBirthDate,
}: OverviewTabProps) {
  const t = useTranslations("growth")
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* 阶段指示器 */}
      <StageIndicator birthDate={childBirthDate} childName={childName} showMilestones showRecommendations />

      {/* 成长概览卡片 */}
      <div className="bg-linear-to-r from-blue-500 to-purple-500 rounded-3xl p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
            {stage?.icon || "👧"}
          </div>
          <div>
            <h2 className="text-xl font-bold">{childName}</h2>
            <p className="text-white/80">
              {stage?.name || t("growing")} · {stage?.ageRange || ""}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">156</div>
            <div className="text-xs text-white/70">{t("statRecords")}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{milestoneProgress?.completed || 0}</div>
            <div className="text-xs text-white/70">{t("statMilestones")}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">89%</div>
            <div className="text-xs text-white/70">{t("statProgress")}</div>
          </div>
        </div>
      </div>

      {/* 阶段转换提醒 */}
      {stageTransition?.approaching && stageTransition.daysUntil <= 90 && (
        <div className="bg-linear-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200">
          <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <i className="ri-calendar-event-line" />
            {t("transitionTitle")}
          </h3>
          <p className="text-sm text-amber-700">
            {t("transitionPre")}<span className="font-bold">{stageTransition.daysUntil}</span>{t("transitionMid")}
            <span className="font-bold">{stageTransition.nextStage ?? t("transitionNext")}</span>
            {t("transitionPost")}
          </p>
        </div>
      )}

      {/* 发展曲线预览 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i className="ri-line-chart-line text-blue-500" />
          {t("curveTitle")}
        </h3>
        <DevelopmentCurveChart dataPoints={mockDevelopmentData} metricName={t("heightMetric")} unit="cm" childName={childName} />
      </div>

      {/* 最近里程碑 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i className="ri-trophy-line text-yellow-500" />
          {t("milestonesTitle")}
        </h3>
        <div className="space-y-3">
          {([
            { icon: "📚", titleKey: "m1Title", dateKey: "m1Date", color: "bg-blue-50" },
            { icon: "🎨", titleKey: "m2Title", dateKey: "m2Date", color: "bg-pink-50" },
            { icon: "🤝", titleKey: "m3Title", dateKey: "m3Date", color: "bg-green-50" },
          ] as const).map((item, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 ${item.color} rounded-xl`}>
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <h4 className="font-medium text-slate-800">{t(item.titleKey)}</h4>
                <p className="text-xs text-slate-500">{t(item.dateKey)}</p>
              </div>
              <i className="ri-arrow-right-s-line text-slate-400" />
            </div>
          ))}
        </div>
      </div>

      {/* 本周发展建议 */}
      {recommendations && (
        <div className="bg-linear-to-r from-green-50 to-blue-50 rounded-2xl p-5 border border-green-100">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <i className="ri-lightbulb-line text-green-500" />
            {t("recTitle")}
          </h3>
          <div className="space-y-4">
            {recommendations.activities.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">{t("recActivities")}</h4>
                <ul className="space-y-1">
                  {recommendations.activities.slice(0, 3).map((activity: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <i className="ri-play-circle-line text-green-500 mt-0.5" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recommendations.books.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">{t("recBooks")}</h4>
                <ul className="space-y-1">
                  {recommendations.books.slice(0, 2).map((book: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <i className="ri-book-line text-blue-500 mt-0.5" />
                      {book}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

interface RecordsTabProps {
  onOpenCreateModal: () => void
}

function RecordsTab({ onOpenCreateModal }: RecordsTabProps) {
  const t = useTranslations("growth")
  const [recordType, setRecordType] = useState<"all" | "milestone" | "observation" | "emotion">("all")

  // 示例记录以词条键驱动（P1 约定：数据不写死语言文案）
  const records = [
    {
      type: "milestone" as const,
      titleKey: "r1Title", contentKey: "r1Content", tagKeys: ["r1Tag1", "r1Tag2"],
      date: "2025-01-15", emoji: "🎯", color: "yellow",
    },
    {
      type: "observation" as const,
      titleKey: "r2Title", contentKey: "r2Content", tagKeys: ["r2Tag1", "r2Tag2"],
      date: "2025-01-10", emoji: "👥", color: "purple",
    },
    {
      type: "emotion" as const,
      titleKey: "r3Title", contentKey: "r3Content", tagKeys: ["r3Tag1", "r3Tag2"],
      date: "2025-01-08", emoji: "😊", color: "pink",
    },
  ]

  const filteredRecords = recordType === "all" ? records : records.filter((r) => r.type === recordType)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* 筛选器 */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: "all", labelKey: "filterAll", icon: "ri-list-check" },
          { id: "milestone", labelKey: "filterMilestone", icon: "ri-flag-line" },
          { id: "observation", labelKey: "filterObservation", icon: "ri-eye-line" },
          { id: "emotion", labelKey: "filterEmotion", icon: "ri-heart-line" },
        ] as const).map((filter) => (
          <motion.button
            key={filter.id}
            className={`px-4 py-2 rounded-full flex items-center gap-2 ${
              recordType === filter.id ? "bg-blue-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => { setRecordType(filter.id); }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <i className={filter.icon} />
            <span>{t(filter.labelKey)}</span>
          </motion.button>
        ))}
      </div>

      {/* 添加记录按钮 */}
      <motion.button
        className="w-full bg-linear-to-r from-blue-500 to-purple-500 text-white rounded-2xl p-4 flex items-center justify-center gap-2 font-bold"
        onClick={onOpenCreateModal}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <i className="ri-add-circle-line text-2xl" />
        <span>{t("addNewRecord")}</span>
      </motion.button>

      {/* 记录列表 */}
      <div className="space-y-4">
        {filteredRecords.map((record, i) => (
          <motion.div
            key={i}
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.02, x: 5 }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                {record.emoji}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 mb-1">{t(record.titleKey as "r1Title")}</h4>
                <p className="text-slate-600 text-sm mb-2">{t(record.contentKey as "r1Content")}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {record.tagKeys.map((tagKey, j) => (
                    <span key={j} className="px-2 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                      #{t(tagKey as "r1Tag1")}
                    </span>
                  ))}
                  <span className="text-xs text-slate-400 ml-auto">{record.date}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function AssessmentTab({ childName }: { childName: string }) {
  const t = useTranslations("growth")
  const [showFullReport, setShowFullReport] = useState(false)

  const dimensions = [
    { nameKey: "dimCognitive", score: 85, icon: "ri-brain-line", color: "text-blue-500", bgColor: "bg-blue-400" },
    { nameKey: "dimLanguage", score: 92, icon: "ri-chat-1-line", color: "text-green-500", bgColor: "bg-green-400" },
    { nameKey: "dimMotor", score: 78, icon: "ri-run-line", color: "text-orange-500", bgColor: "bg-orange-400" },
    { nameKey: "dimSocial", score: 88, icon: "ri-heart-line", color: "text-pink-500", bgColor: "bg-pink-400" },
    { nameKey: "dimSelfCare", score: 90, icon: "ri-user-line", color: "text-purple-500", bgColor: "bg-purple-400" },
  ] as const

  // 图表数据
  // 图表维度标签同样走词条（图表组件按字符串渲染）
  const chartData = [
    { date: "2023-01-15", dimension: t("dimCognitive"), score: 85 },
    { date: "2023-01-15", dimension: t("dimLanguage"), score: 92 },
    { date: "2023-01-15", dimension: t("dimMotor"), score: 78 },
    { date: "2023-01-15", dimension: t("dimSocial"), score: 88 },
    { date: "2023-01-15", dimension: t("dimSelfCare"), score: 90 },
  ]

  const mockAssessmentResultWithName = {
    ...mockAssessmentResult,
    childName: childName,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* 综合评估卡片 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i className="ri-bar-chart-box-line text-blue-500" />
          {t("assessTitle")}
        </h3>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-r from-green-400 to-blue-500 text-white">
            <div>
              <div className="text-3xl font-bold">87</div>
              <div className="text-xs">{t("overallScore")}</div>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-2">{t("goodStatus")}</p>
        </div>

        <div className="space-y-4">
          {dimensions.map((dim, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <i className={`${dim.icon} ${dim.color}`} />
                  {t(dim.nameKey)}
                </span>
                <span className="font-medium">{t("scorePoints", { score: dim.score })}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${dim.bgColor} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${dim.score}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 数据图表 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <i className="ri-pie-chart-line text-purple-500" />
          {t("chartTitle")}
        </h3>
        <GrowthCharts data={chartData} />
      </div>

      {/* 查看完整报告按钮 */}
      <motion.button
        className="w-full bg-white border-2 border-blue-500 text-blue-500 rounded-2xl p-4 font-bold flex items-center justify-center gap-2"
        onClick={() => { setShowFullReport(!showFullReport); }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <i className={showFullReport ? "ri-eye-off-line" : "ri-eye-line"} />
        {showFullReport ? t("hideFull") : t("showFull")}
      </motion.button>

      {/* 完整评估报告 */}
      <AnimatePresence>
        {showFullReport && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <AssessmentReport result={mockAssessmentResultWithName} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 开始评估按钮 */}
      <motion.a
        href="/growth/assessment"
        className="block w-full bg-linear-to-r from-blue-500 to-purple-500 text-white rounded-2xl p-4 text-center font-bold"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <i className="ri-file-list-3-line mr-2" />
        {t("startAssess")}
      </motion.a>

      {/* AI洞察 */}
      <div className="bg-linear-to-r from-purple-50 to-blue-50 rounded-2xl p-5 border border-purple-100">
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <i className="ri-sparkling-line text-purple-500" />
          {t("insightTitle")}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          {t("insightText", { name: childName })}
        </p>
      </div>
    </motion.div>
  )
}
