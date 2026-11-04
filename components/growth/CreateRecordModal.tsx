/**
 * @fileoverview YYC³ AI小语智能成长守护系统 - 创建记录模态框组件
 * @description 提供创建成长记录的模态框界面，支持AI辅助分析和媒体上传
 * @author YYC³
 * @version 1.0.0
 * @created 2025-01-30
 * @modified 2025-01-30
 * @copyright Copyright (c) 2025 YYC³
 * @license MIT
 */

"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { authFetch } from "@/lib/api/auth-fetch"
import { MediaUploader } from "./MediaUploader"
import { TagSelector } from "./TagSelector"

interface AIAnalysisResult {
  analysis: string
  suggestedTitle?: string
  suggestedTags?: string[]
  isMilestone?: boolean
}

export interface CreateRecordPayload {
  type: 'milestone' | 'observation' | 'emotion' | 'learning'
  title: string
  description: string
  content: string
  mediaUrls: string[]
  tags: string[]
  emotion: string
  aiAnalysis?: string
  isMilestone?: boolean
  createdAt: string
}

interface CreateRecordModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (record: CreateRecordPayload) => void
}

export default function CreateRecordModal({ isOpen, onClose, onSubmit }: CreateRecordModalProps) {
  const t = useTranslations("growth.createModal")
  const [recordType, setRecordType] = useState<"milestone" | "observation" | "emotion" | "learning">("milestone")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [emotion, setEmotion] = useState<string>("")
  const [aiSuggestions, setAiSuggestions] = useState<AIAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const analyzeContent = async () => {
    if (content.length < 10) return

    setIsAnalyzing(true)
    try {
      const response = await authFetch("/api/ai/analyze-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, recordType }),
      })
      const data = (await response.json()) as AIAnalysisResult
      setAiSuggestions(data)

      if (data.suggestedTitle && !title) {
        setTitle(data.suggestedTitle)
      }
      if (data.suggestedTags) {
        setTags([...new Set([...tags, ...data.suggestedTags])])
      }
    } catch (error) {
      console.error("AI分析失败:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSubmit = () => {
    const mediaUrls: string[] = []

    for (const file of mediaFiles) {
      mediaUrls.push(URL.createObjectURL(file))
    }

    const record = {
      type: recordType,
      title: title || content.slice(0, 30),
      description: content,
      content,
      mediaUrls,
      tags,
      emotion,
      aiAnalysis: aiSuggestions?.analysis,
      isMilestone: aiSuggestions?.isMilestone,
      createdAt: new Date().toISOString(),
    }

    onSubmit(record)
    onClose()

    setTitle("")
    setContent("")
    setMediaFiles([])
    setTags([])
    setEmotion("")
    setAiSuggestions(null)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] bg-white rounded-3xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <h2 className="text-xl font-bold text-slate-800">{t("title")}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center"
              >
                <i className="ri-close-line" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">{t("typeLabel")}</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: "milestone", icon: "ri-flag-line", color: "yellow" },
                    { id: "observation", icon: "ri-eye-line", color: "purple" },
                    { id: "emotion", icon: "ri-heart-line", color: "pink" },
                    { id: "learning", icon: "ri-book-line", color: "blue" },
                  ].map((type) => (
                    <motion.button
                      key={type.id}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 ${
                        recordType === type.id
                          ? `border-${type.color}-400 bg-${type.color}-50`
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                      onClick={() => { setRecordType(type.id as "milestone" | "observation" | "emotion" | "learning"); }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <i className={`${type.icon} text-2xl`} />
                      <span className="text-xs font-medium">{t(`types.${type.id}`)}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t("titleLabel")}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); }}
                  placeholder={t("titlePlaceholder")}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t("contentLabel")}</label>
                <textarea
                  value={content}
                  onChange={(e) => { setContent(e.target.value); }}
                  onBlur={analyzeContent}
                  placeholder={t("contentPlaceholder")}
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
                {isAnalyzing && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-blue-500">
                    <i className="ri-loader-4-line animate-spin" />
                    <span>{t("analyzing")}</span>
                  </div>
                )}
              </div>

              {aiSuggestions && (
                <motion.div
                  className="bg-blue-50 rounded-xl p-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <i className="ri-lightbulb-flash-line text-blue-500" />
                    <span className="font-bold text-blue-700">{t("aiSuggestionTitle")}</span>
                  </div>
                  <p className="text-sm text-slate-700">{aiSuggestions.analysis}</p>
                  {aiSuggestions.isMilestone && (
                    <div className="mt-2 px-3 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full inline-flex items-center gap-1">
                      <i className="ri-trophy-line" />
                      <span>{t("milestoneFlag")}</span>
                    </div>
                  )}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t("mediaLabel")}</label>
                <MediaUploader files={mediaFiles} onChange={setMediaFiles} maxFiles={9} />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">{t("tagsLabel")}</label>
                <TagSelector tags={tags} onChange={setTags} />
              </div>

              {recordType === "emotion" && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">{t("moodLabel")}</label>
                  <div className="flex gap-2 flex-wrap">
                    {(["happy", "sad", "angry", "excited", "calm", "nervous"] as const).map((em) => (
                      <motion.button
                        key={em}
                        className={`px-4 py-2 rounded-full ${
                          emotion === t(`moods.${em}`) ? "bg-pink-400 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                        onClick={() => { setEmotion(t(`moods.${em}`)); }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {t(`moods.${em}`)}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!content}
                  className="flex-1 px-6 py-3 bg-linear-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("submit")}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
