"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations, useLocale } from "next-intl"
import Navigation from "@/components/Navigation"
import PageHeader from "@/components/headers/PageHeader"
import { useSchedule } from "@/hooks/useSchedule"
import { useChildren } from "@/hooks/useChildren"
import ChildSelector from "@/components/ChildSelector"
import {
  type Schedule,
  type ScheduleType,
  type ScheduleFormData,
  SCHEDULE_TYPE_CONFIG,
  getScheduleColor,
  getScheduleIcon,
  getScheduleLabel,
} from "@/types/schedule"

type ViewMode = "day" | "week" | "timeline"

export default function SchedulePage() {
  const t = useTranslations("schedule")
  const locale = useLocale()
  const [viewMode, setViewMode] = useState<ViewMode>("day")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showEditor, setShowEditor] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [showAIGenerator, setShowAIGenerator] = useState(false)

  const { currentChild } = useChildren()
  const {
    schedules: _schedules,
    isLoading: _isLoading,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    toggleComplete,
    getSchedulesByDate,
    generateAISchedule,
  } = useSchedule()

  const todaySchedules = useMemo(() => {
    return getSchedulesByDate(selectedDate).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )
  }, [getSchedulesByDate, selectedDate])

  const completedCount = todaySchedules.filter((s) => s.completed).length
  const totalCount = todaySchedules.length

  const handleAddSchedule = () => {
    setEditingSchedule(null)
    setShowEditor(true)
  }

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setShowEditor(true)
  }

  const handleSaveSchedule = async (data: ScheduleFormData) => {
    if (editingSchedule) {
      await updateSchedule(editingSchedule.id, data)
    } else {
      await addSchedule(data, currentChild?.id || "default")
    }
    setShowEditor(false)
    setEditingSchedule(null)
  }

  const handleGenerateAI = async () => {
    if (!currentChild) return

    await generateAISchedule(currentChild.id, {
      wakeUpTime: "07:00",
      sleepTime: "21:30",
      studyFocus: ["语文", "数学", "英语"],
      breakFrequency: 15,
    })

    setShowAIGenerator(false)
  }

  const formatDate = (date: Date) => {
    const d = new Date(date)
    return t("dateFmt", {
      month: d.getMonth() + 1,
      day: d.getDate(),
      weekday: t(`weekdayNames.${d.getDay()}`),
    })
  }

  const navigateDate = (delta: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + delta)
    setSelectedDate(newDate)
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white pb-24">
      <PageHeader title={t("pageTitle")} showBack />

      <div className="px-4 py-4 space-y-4">
        {currentChild && (
          <motion.div
            className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                  {currentChild.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{t("scheduleOf", { name: currentChild.name })}</h3>
                  <p className="text-xs text-slate-500">
                    {t("todayProgress", { done: completedCount, total: totalCount })}
                  </p>
                </div>
              </div>
              <ChildSelector />
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.button
              className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50"
              onClick={() => { navigateDate(-1); }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <i className="ri-arrow-left-s-line" />
            </motion.button>
            <span className="font-bold text-slate-800 min-w-[140px] text-center">{formatDate(selectedDate)}</span>
            <motion.button
              className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50"
              onClick={() => { navigateDate(1); }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <i className="ri-arrow-right-s-line" />
            </motion.button>
          </div>

          <div className="flex gap-1 bg-white rounded-full p-1 shadow-sm">
            {[
              { id: "day" as ViewMode, icon: "ri-calendar-line", labelKey: "viewModes.day" },
              { id: "week" as ViewMode, icon: "ri-calendar-2-line", labelKey: "viewModes.week" },
              { id: "timeline" as ViewMode, icon: "ri-time-line", labelKey: "viewModes.timeline" },
            ].map((mode) => (
              <motion.button
                key={mode.id}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  viewMode === mode.id ? "bg-blue-500 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => { setViewMode(mode.id); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {t(mode.labelKey)}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <motion.button
            className="flex-1 py-3 bg-linear-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            onClick={handleAddSchedule}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <i className="ri-add-line" />
            {t("addSchedule")}
          </motion.button>
          <motion.button
            className="px-4 py-3 bg-linear-to-r from-green-500 to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            onClick={() => { setShowAIGenerator(true); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <i className="ri-magic-line" />
            {t("aiSchedule")}
          </motion.button>
        </div>

        {_isLoading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
          </div>
        ) : viewMode === "timeline" ? (
          <TimelineView
            schedules={todaySchedules}
            onEdit={handleEditSchedule}
          />
        ) : (
          <DayView
            schedules={todaySchedules}
            onToggleComplete={toggleComplete}
            onEdit={handleEditSchedule}
            onDelete={deleteSchedule}
          />
        )}
      </div>

      <AnimatePresence>
        {showEditor && (
          <ScheduleEditorModal
            schedule={editingSchedule}
            onSave={handleSaveSchedule}
            onClose={() => {
              setShowEditor(false)
              setEditingSchedule(null)
            }}
          />
        )}

        {showAIGenerator && (
          <AIScheduleGeneratorModal onGenerate={handleGenerateAI} onClose={() => { setShowAIGenerator(false); }} />
        )}
      </AnimatePresence>

      <Navigation />
    </div>
  )
}

function DayView({
  schedules,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  schedules: Schedule[]
  onToggleComplete: (id: string) => void
  onEdit: (schedule: Schedule) => void
  onDelete: (id: string) => void
}) {
  const t = useTranslations("schedule")
  const locale = useLocale()
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString(locale === "en" ? "en-US" : "zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (schedules.length === 0) {
    return (
      <motion.div className="text-center py-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-5xl mb-4">📅</div>
        <h3 className="font-bold text-slate-700 mb-2">{t("empty")}</h3>
        <p className="text-sm text-slate-500">{t("emptyHint")}</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-3">
      {schedules.map((schedule, index) => (
        <motion.div
          key={schedule.id}
          className={`bg-white rounded-2xl p-4 shadow-sm border-l-4 ${schedule.completed ? "opacity-60" : ""}`}
          style={{ borderLeftColor: schedule.color }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="flex items-start gap-3">
            <motion.button
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                schedule.completed ? "bg-green-500 border-green-500 text-white" : "border-slate-300"
              }`}
              onClick={() => { onToggleComplete(schedule.id); }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {schedule.completed && <i className="ri-check-line text-sm" />}
            </motion.button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                  style={{ backgroundColor: schedule.color }}
                >
                  <i className={getScheduleIcon(schedule.type)} />
                </span>
                <span className="text-xs text-slate-500">{t(`typeNames.${schedule.type}`)}</span>
                {schedule.aiGenerated && (
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-xs rounded">AI</span>
                )}
              </div>

              <h4 className={`font-bold text-slate-800 ${schedule.completed ? "line-through" : ""}`}>
                {schedule.title}
              </h4>

              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <i className="ri-time-line" />
                <span>
                  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                </span>
              </div>

              {schedule.description && <p className="text-xs text-slate-500 mt-1">{schedule.description}</p>}
            </div>

            <div className="flex gap-1">
              <motion.button
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                onClick={() => { onEdit(schedule); }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <i className="ri-edit-line text-sm" />
              </motion.button>
              <motion.button
                className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100"
                onClick={() => { onDelete(schedule.id); }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <i className="ri-delete-bin-line text-sm" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

function TimelineView({
  schedules,
  onEdit,
}: {
  schedules: Schedule[]
  onEdit: (schedule: Schedule) => void
}) {
  const locale = useLocale()
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString(locale === "en" ? "en-US" : "zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const hours = Array.from({ length: 17 }, (_, i) => i + 6)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="relative">
        {hours.map((hour) => (
          <div key={hour} className="flex items-start h-16 border-b border-slate-100 last:border-0">
            <span className="w-12 text-xs text-slate-400 shrink-0">{hour}:00</span>
            <div className="flex-1 relative">
              {schedules
                .filter((s) => new Date(s.startTime).getHours() === hour)
                .map((schedule) => (
                  <motion.div
                    key={schedule.id}
                    className="absolute left-0 right-0 mx-1 px-2 py-1 rounded-lg text-white text-xs cursor-pointer"
                    style={{
                      backgroundColor: schedule.color,
                      opacity: schedule.completed ? 0.6 : 1,
                    }}
                    onClick={() => { onEdit(schedule); }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-1">
                      <i className={getScheduleIcon(schedule.type)} />
                      <span className="font-medium truncate">{schedule.title}</span>
                    </div>
                    <span className="text-white/80">
                      {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                    </span>
                  </motion.div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScheduleEditorModal({
  schedule,
  onSave,
  onClose,
}: {
  schedule: Schedule | null
  onSave: (data: ScheduleFormData) => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState<ScheduleFormData>(() => {
    const baseData: ScheduleFormData = {
      title: schedule?.title || "",
      description: schedule?.description || "",
      type: schedule?.type || "other",
      startTime: schedule ? new Date(schedule.startTime).toISOString().slice(0, 16) : "",
      endTime: schedule ? new Date(schedule.endTime).toISOString().slice(0, 16) : "",
      color: schedule?.color || getScheduleColor("other"),
    }

    if (schedule?.repeat !== undefined) {
      baseData.repeat = schedule.repeat
    }

    if (schedule?.reminder !== undefined) {
      baseData.reminder = schedule.reminder
    }

    return baseData
  })
  const t = useTranslations("schedule.editor")
  const tRoot = useTranslations("schedule")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white w-full max-w-lg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => { e.stopPropagation(); }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{schedule ? t("editTitle") : t("addTitle")}</h2>
          <motion.button
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <i className="ri-close-line" />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("titleLabel")}</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => { setFormData({ ...formData, title: e.target.value }); }}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-400"
              placeholder={t("titlePlaceholder")}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("typeLabel")}</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(SCHEDULE_TYPE_CONFIG).map(([type, config]) => {
                const typedConfig = config
                return (
                  <motion.button
                    key={type}
                    type="button"
                    className={`p-2 rounded-xl text-center transition ${
                      formData.type === type ? "ring-2 ring-blue-500" : "bg-slate-50"
                    }`}
                    style={{
                      backgroundColor: formData.type === type ? `${typedConfig.color}20` : undefined,
                    }}
                    onClick={() => { setFormData({ ...formData, type: type as ScheduleType, color: typedConfig.color }); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <i className={`${typedConfig.icon} text-lg`} style={{ color: typedConfig.color }} />
                    <p className="text-xs mt-1">{tRoot(`typeNames.${type}`)}</p>
                  </motion.button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("startTimeLabel")}</label>
              <input
                type="datetime-local"
                value={typeof formData.startTime === 'string' ? formData.startTime : new Date(formData.startTime).toISOString().slice(0, 16)}
                onChange={(e) => { setFormData({ ...formData, startTime: e.target.value }); }}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("endTimeLabel")}</label>
              <input
                type="datetime-local"
                value={typeof formData.endTime === 'string' ? formData.endTime : new Date(formData.endTime).toISOString().slice(0, 16)}
                onChange={(e) => { setFormData({ ...formData, endTime: e.target.value }); }}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("descLabel")}</label>
            <textarea
              value={formData.description}
              onChange={(e) => { setFormData({ ...formData, description: e.target.value }); }}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-400 resize-none"
              rows={2}
              placeholder={t("descPlaceholder")}
            />
          </div>

          <motion.button
            type="submit"
            className="w-full py-4 bg-linear-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {schedule ? t("saveChanges") : t("createTitle")}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  )
}

function AIScheduleGeneratorModal({
  onGenerate,
  onClose,
}: {
  onGenerate: () => void
  onClose: () => void
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const t = useTranslations("schedule.aiModal")

  const handleGenerate = () => {
    setIsGenerating(true)
    onGenerate()
    setIsGenerating(false)
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white w-full max-w-md rounded-3xl p-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => { e.stopPropagation(); }}
      >
        <div className="text-center mb-6">
          <motion.div
            className="w-16 h-16 mx-auto bg-linear-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl mb-4"
            animate={{ rotate: isGenerating ? 360 : 0 }}
            transition={{ duration: 2, repeat: isGenerating ? Number.POSITIVE_INFINITY : 0, ease: "linear" }}
          >
            <i className="ri-magic-line" />
          </motion.div>
          <h2 className="text-xl font-bold text-slate-800">{t("title")}</h2>
          <p className="text-sm text-slate-500 mt-2">{t("desc")}</p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <h4 className="font-medium text-slate-700 mb-3">{t("includes")}</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              { icon: "ri-sun-line", labelKey: "items.wake" },
              { icon: "ri-book-open-line", labelKey: "items.study" },
              { icon: "ri-restaurant-line", labelKey: "items.meal" },
              { icon: "ri-run-line", labelKey: "items.exercise" },
              { icon: "ri-gamepad-line", labelKey: "items.play" },
              { icon: "ri-moon-line", labelKey: "items.sleep" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-600">
                <i className={`${item.icon} text-blue-500`} />
                <span>{t(item.labelKey)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <motion.button
            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium"
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {t("cancel")}
          </motion.button>
          <motion.button
            className="flex-1 py-3 bg-linear-to-r from-green-500 to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            onClick={handleGenerate}
            disabled={isGenerating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isGenerating ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                />
                {t("generating")}
              </>
            ) : (
              <>
                <i className="ri-magic-line" />
                {t("start")}
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
