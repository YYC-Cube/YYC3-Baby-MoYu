"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useTranslations } from "next-intl"

interface MediaUploaderProps {
  files: File[]
  onChange: (files: File[]) => void
  maxFiles?: number
  accept?: string
}

export function MediaUploader({ files, onChange, maxFiles = 9, accept = "image/*,video/*" }: MediaUploaderProps) {
  const t = useTranslations("growth.media")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const totalFiles = files.length + selectedFiles.length

    if (totalFiles > maxFiles) {
      alert(t("maxFiles", { count: maxFiles }))
      return
    }

    const newPreviews = selectedFiles.map((file) => URL.createObjectURL(file))
    setPreviews([...previews, ...newPreviews])
    onChange([...files, ...selectedFiles])
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)
    URL.revokeObjectURL(previews[index]) // 释放内存
    setPreviews(newPreviews)
    onChange(newFiles)
  }

  const getFileType = (file: File) => {
    if (file.type.startsWith("image/")) return "image"
    if (file.type.startsWith("video/")) return "video"
    return "file"
  }

  return (
    <div>
      <input ref={fileInputRef} type="file" accept={accept} multiple onChange={handleFileSelect} className="hidden" />

      <div className="grid grid-cols-3 gap-3">
        {/* 已上传的文件预览 */}
        <AnimatePresence>
          {files.map((file, index) => (
            <motion.div
              key={index}
              className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {getFileType(file) === "image" && (
                <Image
                  src={previews[index] || "/placeholder.svg"}
                  alt={`Preview ${index}`}
                  fill
                  className="object-cover"
                />
              )}
              {getFileType(file) === "video" && (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <i className="ri-video-line text-4xl text-white" />
                </div>
              )}

              {/* 删除按钮 */}
              <button
                onClick={() => { removeFile(index); }}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white"
              >
                <i className="ri-close-line text-sm" />
              </button>

              {/* 文件类型标识 */}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                {getFileType(file)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* 添加按钮 */}
        {files.length < maxFiles && (
          <motion.button
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <i className="ri-add-line text-3xl text-slate-400" />
            <span className="text-xs text-slate-500">{t("addFile")}</span>
          </motion.button>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-2">
        {t("uploaded", { count: files.length, max: maxFiles })}
      </p>
    </div>
  )
}
