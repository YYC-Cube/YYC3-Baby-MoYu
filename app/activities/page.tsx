"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import Navigation from "@/components/Navigation"
import PageHeader from "@/components/headers/PageHeader"

type ActivityTab = "ongoing" | "history"
type OngoingActivityId = "act-1" | "act-2"
type HistoryActivityId = "hist-1" | "hist-2"

interface Activity {
  id: OngoingActivityId
  theme: "plant" | "story"
  icon: string
  iconBg: string
  bgColor: string
  buttonColor: string
}

interface HistoryActivity {
  id: HistoryActivityId
}

const ongoingActivities: Activity[] = [
  {
    id: "act-1",
    theme: "plant",
    icon: "ri-plant-line",
    iconBg: "from-green-300 to-green-200",
    bgColor: "bg-macaron-green",
    buttonColor: "bg-green-500 hover:bg-green-600",
  },
  {
    id: "act-2",
    theme: "story",
    icon: "ri-book-read-fill",
    iconBg: "from-blue-300 to-blue-200",
    bgColor: "bg-macaron-blue",
    buttonColor: "bg-blue-400 hover:bg-blue-500",
  },
]

const historyActivities: HistoryActivity[] = [{ id: "hist-1" }, { id: "hist-2" }]

export default function ActivitiesPage() {
  const t = useTranslations("activities")
  const [activeTab, setActiveTab] = useState<ActivityTab>("ongoing")

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-sky-100">
      <PageHeader
        icon="ri-heart-2-fill"
        title={t("pageTitle")}
        actions={[{ icon: "ri-user-heart-fill", label: t("myParticipation") }]}
      />

      <main className="flex-1 overflow-y-auto w-full">
        <section className="max-w-7xl mx-auto w-full px-8 pb-28 pt-4">
          {/* Tab切换 */}
          <div className="w-full bg-blue-100/50 p-1.5 rounded-full flex gap-1 mb-8 max-w-lg mx-auto">
            <motion.button
              className={`flex-1 py-2 rounded-full text-slate-600 transition-all ${
                activeTab === "ongoing" ? "bg-white shadow-sm font-bold" : "hover:bg-white/50"
              }`}
              onClick={() => { setActiveTab("ongoing"); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t("tabOngoing", { count: ongoingActivities.length })}
            </motion.button>
            <motion.button
              className={`flex-1 py-2 rounded-full text-slate-600 transition-all ${
                activeTab === "history" ? "bg-white shadow-sm font-bold" : "hover:bg-white/50"
              }`}
              onClick={() => { setActiveTab("history"); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* TODO(P3): 历史计数 5 与 historyActivities 数据条数（2）未对齐，保留原视觉基线 */}
              {t("tabHistory")}
            </motion.button>
          </div>

          {/* 活动列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTab === "ongoing"
              ? ongoingActivities.map((activity, index) => (
                  <OngoingActivityCard key={activity.id} activity={activity} index={index} />
                ))
              : historyActivities.map((activity, index) => (
                  <HistoryActivityCard key={activity.id} activity={activity} index={index} />
                ))}
          </div>
        </section>
      </main>

      <Navigation />
    </div>
  )
}

function OngoingActivityCard({ activity, index }: { activity: Activity; index: number }) {
  const t = useTranslations("activities")
  return (
    <motion.article
      className={`${activity.bgColor} rounded-3xl p-4 shadow-soft hover:shadow-lg transition-all cursor-pointer flex flex-col gap-4`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
      whileHover={{ scale: 1.02, y: -5 }}
    >
      <div
        className={`h-40 bg-linear-to-r ${activity.iconBg} rounded-2xl flex items-center justify-center relative overflow-hidden`}
      >
        <i className={`${activity.icon} absolute left-4 bottom-4 text-9xl text-white/50`} />
        <span className="text-xl font-bold text-slate-800 z-10">
          {t(`ongoing.${activity.id}.banner`)}
        </span>
      </div>

      <div className="space-y-2">
        <h4 className="text-2xl font-bold text-slate-800">{t(`ongoing.${activity.id}.title`)}</h4>
        <p className="text-slate-600 text-sm">{t(`ongoing.${activity.id}.description`)}</p>
      </div>

      <div className="flex justify-between items-center text-sm font-medium mb-2">
        <span
          className={`flex items-center gap-1 ${activity.theme === "plant" ? "text-green-600" : "text-blue-600"}`}
        >
          <i className="ri-group-line" />
          {t(`ongoing.${activity.id}.participants`)}
        </span>
        <span
          className={`flex items-center gap-1 ${activity.theme === "plant" ? "text-red-500" : "text-blue-500"}`}
        >
          <i className="ri-time-line" />
          {t(`ongoing.${activity.id}.deadline`)}
        </span>
      </div>

      <motion.button
        className={`w-full py-3 rounded-full font-extrabold text-lg text-white transition shadow-md ${activity.buttonColor}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
      >
        {t(`ongoing.${activity.id}.button`)}
      </motion.button>
    </motion.article>
  )
}

function HistoryActivityCard({ activity, index }: { activity: HistoryActivity; index: number }) {
  const t = useTranslations("activities")
  return (
    <motion.article
      className="bg-white rounded-3xl p-4 shadow-soft hover:shadow-lg transition-all cursor-pointer flex flex-col gap-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
    >
      <h4 className="text-lg font-bold text-slate-800">{t(`history.${activity.id}.title`)}</h4>
      <p className="text-sm text-slate-500">{t(`history.${activity.id}.description`)}</p>
      <span className="text-xs text-slate-400">{t(`history.${activity.id}.status`)}</span>
    </motion.article>
  )
}
