"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"

interface TagSelectorProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

// 预设标签键 → growth.tagSelector.presets 词条（zh 与原硬编码逐字一致）
const PRESET_TAG_KEYS = [
  "study",
  "life",
  "emotion",
  "social",
  "sports",
  "art",
  "reading",
  "play",
  "independence",
  "creativity",
  "focus",
  "friendship",
  "joy",
  "achievement",
  "progress",
  "breakthrough",
] as const

export function TagSelector({ tags, onChange }: TagSelectorProps) {
  const t = useTranslations("growth.tagSelector")
  const [inputValue, setInputValue] = useState("")

  const addTag = (tag: string) => {
    if (!tags.includes(tag) && tag.trim()) {
      onChange([...tags, tag.trim()])
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault()
      addTag(inputValue)
      setInputValue("")
    }
  }

  return (
    <div className="space-y-3">
      {/* 已选标签 */}
      {tags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {tags.map((tag) => (
            <motion.div
              key={tag}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <span className="text-sm font-medium">#{tag}</span>
              <button
                onClick={() => { removeTag(tag); }}
                className="w-4 h-4 bg-blue-200 hover:bg-blue-300 rounded-full flex items-center justify-center"
              >
                <i className="ri-close-line text-xs" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* 自定义标签输入 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder={t("inputPlaceholder")}
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={() => {
            addTag(inputValue)
            setInputValue("")
          }}
          disabled={!inputValue}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("add")}
        </button>
      </div>

      {/* 预设标签 */}
      <div>
        <p className="text-xs text-slate-500 mb-2">{t("quickPick")}</p>
        <div className="flex gap-2 flex-wrap">
          {PRESET_TAG_KEYS.filter((key) => !tags.includes(t(`presets.${key}`))).map((key) => (
            <motion.button
              key={key}
              onClick={() => { addTag(t(`presets.${key}`)); }}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              #{t(`presets.${key}`)}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
