"use client"

import type React from "react"

import type { GeneratedVideo } from "@/types/ai-video"
import { AnimatePresence, motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

interface VideoPlayerProps {
  video: GeneratedVideo
  onClose: () => void
  onViewCountUpdate?: () => void
}

export default function VideoPlayer({ video, onClose, onViewCountUpdate }: VideoPlayerProps) {
  const t = useTranslations("videos.player")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const playerRef = useRef<HTMLDivElement>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    onViewCountUpdate?.()
  }, [onViewCountUpdate])

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= video.duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 0.1
        })
      }, 100)
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [isPlaying, video.duration])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === " ") {
        e.preventDefault()
        setIsPlaying((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => { window.removeEventListener("keydown", handleKeyDown); }
  }, [onClose])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    setCurrentTime(percent * video.duration)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onMouseMove={() => { setShowControls(true); }}
    >
      {/* 视频内容区域 */}
      <div ref={playerRef} className="relative w-full h-full max-w-6xl max-h-[80vh] mx-auto">
        {/* 视频画面（模拟） */}
        <div className="w-full h-full bg-linear-to-br from-slate-900 to-slate-800 rounded-lg overflow-hidden">
          <img
            src={video.thumbnailUrl || "/placeholder.svg"}
            alt={video.title}
            className="w-full h-full object-contain"
          />

          {/* 播放状态覆盖层 */}
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/40"
              >
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setIsPlaying(true); }}
                  className="w-20 h-20 rounded-full bg-white/90 hover:bg-white/70 active:bg-white/60 flex items-center justify-center shadow-xl transition-colors"
                  aria-label={t("play")}
                >
                  <i className="ri-play-fill text-4xl text-slate-900 ml-1" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 字幕显示区 */}
          {video.voiceoverText && isPlaying && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/75 border border-white/10 rounded-lg max-w-2xl">
              <p className="text-white text-center text-lg">
                {video.voiceoverText.slice(0, Math.floor(currentTime * 5))}
              </p>
            </div>
          )}
        </div>

        {/* 控制栏 */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-black/85 via-black/60 to-transparent"
            >
              {/* 进度条 */}
              <div
                className="h-1 bg-white/25 rounded-full cursor-pointer mb-4 group hover:h-1.5 transition-all"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-white rounded-full relative transition-all group-hover:bg-white/90"
                  style={{ width: `${(currentTime / video.duration) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* 播放/暂停 */}
                  <button
                    onClick={() => { setIsPlaying((prev) => !prev); }}
                    className="p-2.5 rounded-lg text-white hover:bg-white/15 active:bg-white/25 transition-colors"
                    aria-label={isPlaying ? t("pause") : t("play")}
                  >
                    <i className={`${isPlaying ? "ri-pause-fill" : "ri-play-fill"} text-2xl`} />
                  </button>

                  {/* 时间显示 */}
                  <span className="text-white/90 text-sm tabular-nums">
                    {formatTime(currentTime)} / {formatTime(video.duration)}
                  </span>

                  {/* 音量 */}
                  <button
                    className="p-2.5 rounded-lg text-white/90 hover:bg-white/15 active:bg-white/25 transition-colors"
                    aria-label={t("volume")}
                  >
                    <i className="ri-volume-up-line text-xl" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* 视频信息 */}
                  <span className="text-white/60 text-sm hidden sm:block">{video.title}</span>

                  {/* 全屏 */}
                  <button
                    className="p-2.5 rounded-lg text-white/90 hover:bg-white/15 active:bg-white/25 transition-colors"
                    aria-label={t("fullscreen")}
                  >
                    <i className="ri-fullscreen-line text-xl" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-white/20 active:bg-white/30 transition-colors"
          aria-label={t("close")}
        >
          <i className="ri-close-line text-xl" />
        </button>
      </div>
    </motion.div>
  )
}
