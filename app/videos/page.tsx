"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import PageHeader from "@/components/PageHeader"
import { useAIVideo } from "@/hooks/useAIVideo"
import { useChildren } from "@/hooks/useChildren"
import VideoGenerator from "@/components/video/VideoGenerator"
import VideoPlayer from "@/components/video/VideoPlayer"
import type { GeneratedVideo, VideoType } from "@/types/ai-video"
import { VIDEO_STYLE_CONFIG } from "@/types/ai-video"

type FilterType = "all" | VideoType

export default function VideosPage() {
  const t = useTranslations("videos")
  const locale = useLocale()
  const [activeFilter, setActiveFilter] = useState<FilterType>("all")
  const [showGenerator, setShowGenerator] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const { videos, loadVideos, toggleFavorite, incrementViewCount, deleteVideo, getFavoriteVideos } = useAIVideo()
  const { currentChild } = useChildren()

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  const filters: { id: FilterType; nameKey: string; icon: string }[] = [
    { id: "all", nameKey: "filters.all", icon: "ri-apps-line" },
    { id: "slideshow", nameKey: "filters.slideshow", icon: "ri-slideshow-3-line" },
    { id: "image-to-video", nameKey: "filters.imageToVideo", icon: "ri-movie-line" },
    { id: "story-animation", nameKey: "filters.storyAnimation", icon: "ri-book-read-line" },
    { id: "memory-recap", nameKey: "filters.memoryRecap", icon: "ri-history-line" },
  ]

  const filteredVideos = activeFilter === "all" ? videos : videos.filter((v) => v.type === activeFilter)

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? t("durationMinsSecs", { mins, secs }) : t("durationSecs", { secs })
  }

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN", {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-purple-50 pb-24">
      <PageHeader title={t("pageTitle")} subtitle={t("pageSubtitle")} showBack />

      <div className="px-4 space-y-6">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => { setActiveFilter(filter.id); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                  activeFilter === filter.id ? "bg-pink-500 text-white" : "bg-white text-slate-600 hover:bg-pink-50"
                }`}
              >
                <i className={filter.icon} />
                <span>{t(filter.nameKey)}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setViewMode(viewMode === "grid" ? "list" : "grid"); }}
              className="p-2 rounded-lg bg-white text-slate-600 hover:bg-slate-50"
            >
              <i className={viewMode === "grid" ? "ri-list-check" : "ri-grid-line"} />
            </button>
          </div>
        </div>

        {/* 创建按钮 */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setShowGenerator(true); }}
          className="w-full p-4 rounded-2xl bg-linear-to-r from-pink-500 to-purple-500 text-white flex items-center justify-center gap-3"
        >
          <i className="ri-video-add-line text-2xl" />
          <span className="font-medium">{t("createNew")}</span>
        </motion.button>

        {/* 收藏视频 */}
        {getFavoriteVideos().length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <i className="ri-heart-fill text-pink-500" />
              {t("myFavorites")}
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {getFavoriteVideos()
                .slice(0, 5)
                .map((video) => (
                  <motion.div key={video.id} whileHover={{ scale: 1.02 }} className="shrink-0 w-40">
                    <div
                      className="relative aspect-video rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => { setSelectedVideo(video); }}
                    >
                      <img
                        src={video.thumbnailUrl || "/placeholder.svg"}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <i className="ri-play-fill text-white text-3xl" />
                      </div>
                      <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                        {formatDuration(video.duration)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-700 mt-1 truncate">{video.title}</p>
                  </motion.div>
                ))}
            </div>
          </div>
        )}

        {/* 视频列表 */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            {activeFilter === "all" ? t("allVideos") : t(filters.find((f) => f.id === activeFilter)!.nameKey)}
            <span className="text-sm font-normal text-slate-500 ml-2">({filteredVideos.length})</span>
          </h3>

          {filteredVideos.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl">
              <i className="ri-video-line text-5xl text-slate-300 mb-4 block" />
              <p className="text-slate-500">{t("empty")}</p>
              <button
                onClick={() => { setShowGenerator(true); }}
                className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg text-sm"
              >
                {t("createFirst")}
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-4">
              {filteredVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="relative aspect-video cursor-pointer group" onClick={() => { setSelectedVideo(video); }}>
                    <img
                      src={video.thumbnailUrl || "/placeholder.svg"}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <i className="ri-play-fill text-2xl text-slate-800 ml-1" />
                      </div>
                    </div>
                    <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                      {formatDuration(video.duration)}
                    </span>
                    <div
                      className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs text-white"
                      style={{ backgroundColor: VIDEO_STYLE_CONFIG[video.style].color }}
                    >
                      {t(`styleNames.${video.style}`)}
                    </div>
                  </div>

                  <div className="p-3">
                    <h4 className="font-medium text-slate-800 truncate">{video.title}</h4>
                    <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                      <span>{formatDate(video.createdAt)}</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5">
                          <i className="ri-eye-line" />
                          {video.viewCount}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(video.id)
                          }}
                          className="hover:text-pink-500"
                        >
                          <i className={video.isFavorite ? "ri-heart-fill text-pink-500" : "ri-heart-line"} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(t("deleteConfirm"))) {
                              deleteVideo(video.id)
                            }
                          }}
                          className="hover:text-red-500"
                        >
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl p-3 flex gap-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setSelectedVideo(video); }}
                >
                  <div className="relative w-32 aspect-video rounded-lg overflow-hidden shrink-0">
                    <img
                      src={video.thumbnailUrl || "/placeholder.svg"}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1 rounded">
                      {formatDuration(video.duration)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-800 truncate">{video.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{video.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span
                        className="px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: VIDEO_STYLE_CONFIG[video.style].color }}
                      >
                        {t(`styleNames.${video.style}`)}
                      </span>
                      <span>{formatDate(video.createdAt)}</span>
                      <span className="flex items-center gap-0.5">
                        <i className="ri-eye-line" />
                        {video.viewCount}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(video.id)
                      }}
                      className="p-2 rounded-lg hover:bg-slate-100"
                    >
                      <i
                        className={video.isFavorite ? "ri-heart-fill text-pink-500" : "ri-heart-line text-slate-400"}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(t("deleteConfirm"))) {
                          deleteVideo(video.id)
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 视频生成器弹窗 */}
      <AnimatePresence>
        {showGenerator && currentChild && (
          <VideoGenerator
            childId={currentChild.id}
            onComplete={() => {
              setShowGenerator(false)
              loadVideos()
            }}
            onCancel={() => { setShowGenerator(false); }}
          />
        )}
      </AnimatePresence>

      {/* 视频播放器 */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayer
            video={selectedVideo}
            onClose={() => { setSelectedVideo(null); }}
            onViewCountUpdate={() => { incrementViewCount(selectedVideo.id); }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
