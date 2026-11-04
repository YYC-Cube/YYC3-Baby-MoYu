"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import {
  type VideoStyle,
} from "@/types/ai-video"
import { useAIVideo } from "@/hooks/useAIVideo"

// 本地类型定义
type VideoType = "slideshow" | "story-animation" | "cinema" | "image-to-video" | "memory-recap"
type VideoTemplate = {
  id: string
  name: string
  description: string
  thumbnail: string
  duration: number
  suitableFor: string[]
}
type MusicStyle = "happy" | "gentle" | "energetic" | "calm"

// 配置常量（name/description 属展示文案，渲染时走 videoGen 词条；此处仅保留 icon/color 等视觉属性）
const VIDEO_STYLE_CONFIG: Record<VideoStyle, { name: string; description: string; thumbnail: string; icon: string; color: string }> = {
  warm: { name: "warm", description: "warm", thumbnail: "/placeholder.svg", icon: "🎨", color: "text-pink-500" },
  playful: { name: "playful", description: "playful", thumbnail: "/placeholder.svg", icon: "📷", color: "text-blue-500" },
  elegant: { name: "elegant", description: "elegant", thumbnail: "/placeholder.svg", icon: "⭐", color: "text-purple-500" },
  adventure: { name: "adventure", description: "adventure", thumbnail: "/placeholder.svg", icon: "🎭", color: "text-cyan-500" },
  dreamy: { name: "dreamy", description: "dreamy", thumbnail: "/placeholder.svg", icon: "🎬", color: "text-orange-500" },
  nature: { name: "nature", description: "nature", thumbnail: "/placeholder.svg", icon: "🧱", color: "text-yellow-500" },
}

const MUSIC_STYLE_CONFIG: Record<MusicStyle, { name: string; description: string; icon: string }> = {
  happy: { name: "happy", description: "happy", icon: "🎵" },
  gentle: { name: "gentle", description: "gentle", icon: "🎶" },
  energetic: { name: "energetic", description: "energetic", icon: "🎸" },
  calm: { name: "calm", description: "calm", icon: "🎹" },
}

const VOICE_CONFIG = {
  xiaoyu: { name: "xiaoyu", description: "xiaoyu" },
  xiaoming: { name: "xiaoming", description: "xiaoming" },
  narrator: { name: "narrator", description: "narrator" },
  child: { name: "child", description: "child" },
}

const VIDEO_TEMPLATES: VideoTemplate[] = [
  { id: "template1", name: "template1", description: "template1", thumbnail: "/placeholder.svg", duration: 30, suitableFor: ["all"] },
  { id: "template2", name: "template2", description: "template2", thumbnail: "/placeholder.svg", duration: 45, suitableFor: ["birthday"] },
  { id: "template3", name: "template3", description: "template3", thumbnail: "/placeholder.svg", duration: 30, suitableFor: ["daily"] },
]

interface VideoGeneratorProps {
  childId?: string
  onComplete: () => void
  onCancel: () => void
}

type GeneratorStep = "type" | "content" | "style" | "options" | "generating"

export default function VideoGenerator({ childId: _childId, onComplete, onCancel }: VideoGeneratorProps) {
  const t = useTranslations("videoGen")
  const [step, setStep] = useState<GeneratorStep>("type")
  const [videoType, setVideoType] = useState<VideoType>("slideshow")
  const [title, setTitle] = useState("")
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [storyText, setStoryText] = useState("")
  const [selectedStyle, setSelectedStyle] = useState<VideoStyle>("warm")
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null)
  const [duration, setDuration] = useState(30)
  const [enableVoiceover, setEnableVoiceover] = useState(true)
  const [voiceType, setVoiceType] = useState<"xiaoyu" | "xiaoming" | "narrator" | "child">("xiaoyu")
  const [enableMusic, setEnableMusic] = useState(true)
  const [musicStyle, setMusicStyle] = useState<MusicStyle>("happy")
  const [musicVolume, setMusicVolume] = useState(40)

  const { generateVideo, generationProgress, currentTask } = useAIVideo()

  // 模拟图片库
  const imageLibrary = [
    "/placeholder.svg?height=200&width=200",
    "/placeholder.svg?height=200&width=200",
    "/placeholder.svg?height=200&width=200",
    "/placeholder.svg?height=200&width=200",
    "/placeholder.svg?height=200&width=200",
    "/placeholder.svg?height=200&width=200",
    "/placeholder.svg?height=200&width=200",
    "/placeholder.svg?height=200&width=200",
    "/placeholder.svg?height=200&width=200",
    "/placeholder.svg?height=200&width=200",
    "/placeholder.svg?height=200&width=200",
    "/placeholder.svg?height=200&width=200",
  ]

  const toggleImage = (img: string) => {
    setSelectedImages((prev) => (prev.includes(img) ? prev.filter((i) => i !== img) : [...prev, img]))
  }

  const handleGenerate = async () => {
    setStep("generating")

    try {
      await generateVideo({
        type: videoType as any,
        title: title || t("defaultTitle"),
        sourceImages: selectedImages,
        storyText: videoType === "story-animation" ? storyText : undefined,
        duration,
        templateId: selectedTemplate?.id,
        style: selectedStyle,
        voiceover: enableVoiceover
          ? {
              enabled: true,
              text: storyText || title,
              voice: voiceType,
              language: "zh-CN",
              emotion: "cheerful",
              speed: 1.0,
            }
          : undefined,
        music: enableMusic
          ? {
              enabled: true,
              style: musicStyle,
              volume: musicVolume,
              fadeIn: true,
              fadeOut: true,
            }
          : undefined,
        captions: true,
      } as any)

      onComplete()
    } catch (error) {
      console.error("视频生成失败:", error)
      setStep("options")
    }
  }

  const videoTypes: { type: VideoType; nameKey: string; icon: string; descKey: string }[] = [
    { type: "slideshow", nameKey: "types.slideshow.name", icon: "ri-slideshow-3-line", descKey: "types.slideshow.desc" },
    { type: "image-to-video", nameKey: "types.imageToVideo.name", icon: "ri-movie-line", descKey: "types.imageToVideo.desc" },
    { type: "story-animation", nameKey: "types.storyAnimation.name", icon: "ri-book-read-line", descKey: "types.storyAnimation.desc" },
    { type: "memory-recap", nameKey: "types.memoryRecap.name", icon: "ri-history-line", descKey: "types.memoryRecap.desc" },
  ]

  const renderStep = () => {
    switch (step) {
      case "type":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">{t("chooseType")}</h3>
            <div className="grid grid-cols-2 gap-4">
              {videoTypes.map((vt) => (
                <motion.button
                  key={vt.type}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setVideoType(vt.type)
                    setStep("content")
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    videoType === vt.type ? "border-pink-400 bg-pink-50" : "border-slate-200 hover:border-pink-200"
                  }`}
                >
                  <i className={`${vt.icon} text-2xl text-pink-500 mb-2 block`} />
                  <h4 className="font-medium text-slate-800">{t(vt.nameKey)}</h4>
                  <p className="text-xs text-slate-500 mt-1">{t(vt.descKey)}</p>
                </motion.button>
              ))}
            </div>
          </div>
        )

      case "content":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">{t("addContent")}</h3>

            {/* 标题输入 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t("videoTitle")}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); }}
                placeholder={t("titlePlaceholder")}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none"
              />
            </div>

            {/* 故事文本（故事动画模式） */}
            {videoType === "story-animation" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t("storyLabel")}</label>
                <textarea
                  value={storyText}
                  onChange={(e) => { setStoryText(e.target.value); }}
                  placeholder={t("storyPlaceholder")}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-pink-300 focus:border-pink-400 outline-none resize-none"
                />
              </div>
            )}

            {/* 图片选择 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t("selectImages", { count: selectedImages.length })}
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-xl">
                {imageLibrary.map((img, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { toggleImage(img); }}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImages.includes(img) ? "border-pink-400 ring-2 ring-pink-200" : "border-transparent"
                    }`}
                  >
                    <img src={img || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                    {selectedImages.includes(img) && (
                      <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                        <i className="ri-check-line text-white text-xl bg-pink-500 rounded-full p-1" />
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-1 rounded">
                      {selectedImages.indexOf(img) + 1 || ""}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("type"); }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {t("prev")}
              </button>
              <button
                onClick={() => { setStep("style"); }}
                disabled={selectedImages.length === 0}
                className="flex-1 py-3 rounded-xl bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("next")}
              </button>
            </div>
          </div>
        )

      case "style":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">{t("chooseStyle")}</h3>

            {/* 视频风格 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t("styleLabel")}</label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(VIDEO_STYLE_CONFIG).map(([key, config]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelectedStyle(key as VideoStyle); }}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      selectedStyle === key ? "border-pink-400 bg-pink-50" : "border-slate-200 hover:border-pink-200"
                    }`}
                  >
                    <i className={`${config.icon} text-xl`} style={{ color: config.color }} />
                    <p className="text-sm font-medium text-slate-700 mt-1">{t(`styleNames.${key}`)}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 视频模板 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t("templateLabel")}</label>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {VIDEO_TEMPLATES.filter((t) => t.suitableFor.includes(videoType)).map((template) => (
                  <motion.button
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => { setSelectedTemplate(selectedTemplate?.id === template.id ? null : template); }}
                    className={`p-2 rounded-xl border-2 text-left transition-all ${
                      selectedTemplate?.id === template.id
                        ? "border-pink-400 bg-pink-50"
                        : "border-slate-200 hover:border-pink-200"
                    }`}
                  >
                    <img
                      src={template.thumbnail || "/placeholder.svg"}
                      alt={template.name}
                      className="w-full h-20 object-cover rounded-lg mb-2"
                    />
                    <p className="text-sm font-medium text-slate-700">{t(`templates.${template.id}.name`)}</p>
                    <p className="text-xs text-slate-500">{t("seconds", { secs: template.duration })}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 时长选择 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t("durationLabel", { secs: duration })}</label>
              <input
                type="range"
                min={15}
                max={120}
                step={5}
                value={duration}
                onChange={(e) => { setDuration(Number(e.target.value)); }}
                className="w-full accent-pink-500"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{t("seconds", { secs: 15 })}</span>
                <span>{t("seconds", { secs: 120 })}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("content"); }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {t("prev")}
              </button>
              <button
                onClick={() => { setStep("options"); }}
                className="flex-1 py-3 rounded-xl bg-pink-500 text-white hover:bg-pink-600"
              >
                {t("next")}
              </button>
            </div>
          </div>
        )

      case "options":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-slate-800">{t("audioSettings")}</h3>

            {/* 配音设置 */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-slate-700">{t("aiVoiceover")}</span>
                <button
                  onClick={() => { setEnableVoiceover(!enableVoiceover); }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    enableVoiceover ? "bg-pink-500" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      enableVoiceover ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {enableVoiceover && (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(VOICE_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => { setVoiceType(key as typeof voiceType); }}
                      className={`p-2 rounded-lg text-sm text-left transition-all ${
                        voiceType === key ? "bg-pink-100 border-pink-300 border" : "bg-white border border-slate-200"
                      }`}
                    >
                      <span className="font-medium">{t(`voiceNames.${key}.name`)}</span>
                      <p className="text-xs text-slate-500">{t(`voiceNames.${key}.desc`)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 背景音乐设置 */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-slate-700">{t("bgm")}</span>
                <button
                  onClick={() => { setEnableMusic(!enableMusic); }}
                  className={`w-12 h-6 rounded-full transition-colors ${enableMusic ? "bg-pink-500" : "bg-slate-300"}`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      enableMusic ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {enableMusic && (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {Object.entries(MUSIC_STYLE_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => { setMusicStyle(key as MusicStyle); }}
                        className={`p-2 rounded-lg text-center transition-all ${
                          musicStyle === key ? "bg-pink-100 border-pink-300 border" : "bg-white border border-slate-200"
                        }`}
                      >
                        <i className={`${config.icon} text-lg text-pink-500`} />
                        <p className="text-xs font-medium mt-1">{t(`musicNames.${key}`)}</p>
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">{t("volume", { vol: musicVolume })}</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={musicVolume}
                      onChange={(e) => { setMusicVolume(Number(e.target.value)); }}
                      className="w-full accent-pink-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("style"); }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                {t("prev")}
              </button>
              <button
                onClick={handleGenerate}
                className="flex-1 py-3 rounded-xl bg-linear-to-r from-pink-500 to-purple-500 text-white hover:opacity-90"
              >
                {t("startGenerating")}
              </button>
            </div>
          </div>
        )

      case "generating":
        return (
          <div className="text-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-6"
            >
              <i className="ri-loader-4-line text-5xl text-pink-500" />
            </motion.div>

            <h3 className="text-lg font-semibold text-slate-800 mb-2">{t("generatingTitle")}</h3>
            <p className="text-slate-500 mb-6">{currentTask}</p>

            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${generationProgress}%` }}
                className="h-full bg-linear-to-r from-pink-500 to-purple-500 rounded-full"
              />
            </div>
            <p className="text-sm text-slate-500 mt-2">{generationProgress}%</p>
          </div>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-white rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => { e.stopPropagation(); }}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">{t("createTitle")}</h2>
          {step !== "generating" && (
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center"
            >
              <i className="ri-close-line text-xl text-slate-500" />
            </button>
          )}
        </div>

        {/* 步骤指示器 */}
        {step !== "generating" && (
          <div className="flex items-center gap-2 mb-6">
            {["type", "content", "style", "options"].map((s, idx) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    ["type", "content", "style", "options"].indexOf(step) >= idx
                      ? "bg-pink-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < 3 && (
                  <div
                    className={`w-8 h-0.5 ${
                      ["type", "content", "style", "options"].indexOf(step) > idx ? "bg-pink-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* 步骤内容 */}
        {renderStep()}
      </motion.div>
    </motion.div>
  )
}
