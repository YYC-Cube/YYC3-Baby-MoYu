"use client"

import type React from "react"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { motion, AnimatePresence } from "framer-motion"
import Navigation from "@/components/Navigation"
import PageHeader from "@/components/headers/PageHeader"
import { useChildren } from "@/hooks/useChildren"
import type { Child } from "@/lib/db/types"
import { authFetch } from "@/lib/api/auth-fetch"
import { ChildQVersionAvatar, GenderSelector } from "@/components/ui/QVersionCharacter"

export default function ChildrenPage() {
  // 数据统一：经服务端 API（httpOnly Cookie 认证 + 租户隔离）
  const t = useTranslations("children")
  const { children, isLoading, error, refreshChildren, deleteChild } = useChildren()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingChild, setEditingChild] = useState<Child | null>(null)

  const handleDelete = async (id: string) => {
    if (confirm(t("deleteConfirm"))) {
      try {
        await deleteChild(id)
      } catch (err) {
        alert(err instanceof Error ? err.message : t("deleteFailed"))
      }
    }
  }

  const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate)
    const today = new Date()
    const years = today.getFullYear() - birth.getFullYear()
    const months = today.getMonth() - birth.getMonth()

    if (years < 1) {
      return `${Math.max(0, years * 12 + months)}${t("monthUnit")}`
    }
    return `${years}${t("yearUnit")}${months > 0 ? Math.max(0, months) + t("monthUnit") : ""}`
  }

  const getStageColor = (stage?: string): string => {
    const colors: Record<string, string> = {
      "0-3岁感官启蒙期": "bg-pink-100 text-pink-600",
      "3-6岁游戏学习期": "bg-purple-100 text-purple-600",
      "6-9岁学术奠基期": "bg-blue-100 text-blue-600",
      "9-12岁思维建构期": "bg-cyan-100 text-cyan-600",
      "12-15岁青春转型期": "bg-orange-100 text-orange-600",
      "15-18岁生涯定位期": "bg-amber-100 text-amber-600",
      "18-22岁成人成才期": "bg-green-100 text-green-600",
    }
    return colors[stage || ""] || "bg-slate-100 text-slate-600"
  }

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-sky-50 to-white">
      <PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} showBack />

      {error && (
        <div className="mx-4 mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          {error}{t("errorSuffix")}
        </div>
      )}
      <main className="flex-1 px-4 pb-24 pt-4">
        <div className="max-w-4xl mx-auto">
          {/* 添加按钮 */}
          <motion.button
            onClick={() => { setShowAddModal(true); }}
            className="w-full mb-6 p-4 border-2 border-dashed border-blue-300 rounded-2xl text-blue-500 hover:bg-blue-50 transition flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <i className="ri-add-circle-line text-2xl" />
            <span className="font-medium">{t("addChild")}</span>
          </motion.button>

          {/* 儿童列表 */}
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">
              <i className="ri-loader-4-line animate-spin text-3xl" />
              <p className="mt-2">{t("loading")}</p>
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <i className="ri-user-smile-line text-6xl mb-4" />
              <p>{t("emptyTitle")}</p>
              <p className="text-sm mt-1">{t("emptyHint")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {children.map((child) => (
                <motion.div
                  key={child.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-start gap-4">
                    {/* Q版角色头像 */}
                    <ChildQVersionAvatar
                      child={child}
                      size="lg"
                    />

                    {/* 信息 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-800">{child.name}</h3>
                        {child.nickname && <span className="text-sm text-slate-400">({child.nickname})</span>}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${child.gender === "male" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"}`}
                        >
                          {child.gender === "male" ? t("male") : t("female")}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-sm text-slate-500 mb-2">
                        <span className="flex items-center gap-1">
                          <i className="ri-cake-2-line" />
                          {calculateAge(child.birth_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <i className="ri-calendar-line" />
                          {child.birth_date}
                        </span>
                      </div>

                      {child.current_stage && (
                        <span className={`text-xs px-2 py-1 rounded-lg ${getStageColor(child.current_stage)}`}>
                          {child.current_stage}
                        </span>
                      )}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingChild(child); }}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition"
                      >
                        <i className="ri-edit-line text-xl" />
                      </button>
                      <button
                        onClick={() => handleDelete(child.id)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition"
                      >
                        <i className="ri-delete-bin-line text-xl" />
                      </button>
                    </div>
                  </div>

                  {/* 快捷操作 */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                    <a
                      href={`/growth?child=${child.id}`}
                      className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg text-center text-sm hover:bg-blue-100 transition"
                    >
                      <i className="ri-line-chart-line mr-1" />
                      {t("quickGrowth")}
                    </a>
                    <a
                      href={`/growth/assessment?child=${child.id}`}
                      className="flex-1 py-2 px-3 bg-purple-50 text-purple-600 rounded-lg text-center text-sm hover:bg-purple-100 transition"
                    >
                      <i className="ri-file-list-3-line mr-1" />
                      {t("quickAssessment")}
                    </a>
                    <a
                      href={`/homework?child=${child.id}`}
                      className="flex-1 py-2 px-3 bg-orange-50 text-orange-600 rounded-lg text-center text-sm hover:bg-orange-100 transition"
                    >
                      <i className="ri-book-open-line mr-1" />
                      {t("quickHomework")}
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 添加/编辑弹窗 */}
      <AnimatePresence>
        {(showAddModal || editingChild) && (
          <ChildFormModal
            child={editingChild}
            onClose={() => {
              setShowAddModal(false)
              setEditingChild(null)
            }}
            onSave={async (data) => {
              try {
                const res = editingChild
                  ? await authFetch(`/api/children/${editingChild.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(data),
                    })
                  : await authFetch("/api/children", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      // user_id 由服务端从认证令牌取，客户端不传
                      body: JSON.stringify({
                        name: data.name || "",
                        birth_date: data.birth_date || new Date().toISOString(),
                        gender: data.gender || "male",
                        nickname: data.nickname,
                        avatar_url: data.avatar_url,
                        current_stage: data.current_stage,
                      }),
                    })
                if (!res.ok) {
                  const result = (await res.json().catch(() => ({}))) as { message?: string }
                  throw new Error(result.message ?? t("saveFailed"))
                }
              } catch (err) {
                alert(err instanceof Error ? err.message : t("saveFailedShort"))
                return // 保留弹窗，用户可重试
              }
              refreshChildren()
              setShowAddModal(false)
              setEditingChild(null)
            }}
          />
        )}
      </AnimatePresence>

      <Navigation />
    </div>
  )
}

function ChildFormModal({
  child,
  onClose,
  onSave,
}: {
  child: Child | null
  onClose: () => void
  onSave: (data: Partial<Child>) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    name: child?.name || "",
    nickname: child?.nickname || "",
    birth_date: child?.birth_date || "",
    gender: child?.gender || ("male"),
  })
  const [isSaving, setIsSaving] = useState(false)
  const t = useTranslations("children")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave(formData)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl p-6 w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => { e.stopPropagation(); }}
      >
        <h2 className="text-xl font-bold text-slate-800 mb-4">{child ? t("editTitle") : t("addTitle")}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              {t("labelName")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => { setFormData({ ...formData, name: e.target.value }); }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t("labelNickname")}</label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => { setFormData({ ...formData, nickname: e.target.value }); }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("optional")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              {t("labelBirth")} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.birth_date}
              onChange={(e) => { setFormData({ ...formData, birth_date: e.target.value }); }}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">
              {t("labelGender")} <span className="text-red-500">*</span>
            </label>
            <GenderSelector
              value={formData.gender}
              onChange={(gender) => { setFormData({ ...formData, gender }); }}
              size="md"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              {isSaving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
