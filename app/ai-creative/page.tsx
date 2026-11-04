"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import Navigation from "@/components/Navigation"
import PageHeader from "@/components/headers/PageHeader"
import { useAICreative } from "@/hooks/useAICreative"
import { useChildren } from "@/hooks/useChildren"
import { type ArtStyle, type StoryStyle, ART_STYLE_CONFIG, STORY_STYLE_CONFIG, type ContinuationOption } from "@/types/ai-creative"

type CreativeTab = "gallery" | "generate" | "stories" | "write"

export default function AICreativePage() {
  const t = useTranslations("creative")
  const [activeTab, setActiveTab] = useState<CreativeTab>("generate")
  const { currentChild } = useChildren()
  const {
    artworks,
    stories,
    isGenerating,
    generationProgress,
    loadArtworks,
    loadStories,
    generateImage,
    toggleFavorite,
    deleteArtwork,
    createStory,
    continueStory,
    selectContinuation,
    deleteStory,
  } = useAICreative()

  // 文生图状态
  const [prompt, setPrompt] = useState("")
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>("cartoon")
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:3" | "16:9" | "3:4">("1:1")

  // 续写状态
  const [storyTitle, setStoryTitle] = useState("")
  const [storyKeywords, setStoryKeywords] = useState("")
  const [storyStyle, setStoryStyle] = useState<StoryStyle>("fairy_tale")
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null)
  const [continuationOptions, setContinuationOptions] = useState<ContinuationOption[]>([])
  const [userStoryInput, setUserStoryInput] = useState("")
  const [isLoadingContinuation, setIsLoadingContinuation] = useState(false)

  useEffect(() => {
    loadArtworks()
    loadStories()
  }, [loadArtworks, loadStories])

  // 生成图片
  const handleGenerate = async () => {
    if (!prompt.trim() || !currentChild) return

    await generateImage({
      childId: currentChild.id,
      prompt: prompt.trim(),
      style: selectedStyle,
      aspectRatio,
    })

    setPrompt("")
    setActiveTab("gallery")
  }

  // 创建新故事
  const handleCreateStory = () => {
    if (!storyTitle.trim() || !currentChild) return

    const keywords = storyKeywords.split(/[,，\s]+/).filter((k) => k.trim())
    const story = createStory(currentChild.id, storyTitle.trim(), keywords, storyStyle)
    setActiveStoryId(story.id)
    setStoryTitle("")
    setStoryKeywords("")
    void handleContinueStory(story.id)
  }

  // 续写故事
  const handleContinueStory = async (storyId: string, userInput?: string) => {
    setIsLoadingContinuation(true)
    try {
      const options = await continueStory(storyId, userInput)
      setContinuationOptions(options)
    } finally {
      setIsLoadingContinuation(false)
      setUserStoryInput("")
    }
  }

  // 选择续写方向
  const handleSelectOption = (storyId: string, option: ContinuationOption) => {
    selectContinuation(storyId, option)
    setContinuationOptions([])
  }

  const activeStory = stories.find((s) => s.id === activeStoryId)

  const tabs = [
    { id: "generate", labelKey: "tabs.generate", icon: "ri-magic-line" },
    { id: "gallery", labelKey: "tabs.gallery", icon: "ri-gallery-line" },
    { id: "write", labelKey: "tabs.write", icon: "ri-quill-pen-line" },
    { id: "stories", labelKey: "tabs.stories", icon: "ri-book-line" },
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-linear-to-br from-purple-50 via-pink-50 to-blue-50">
      <PageHeader
        icon="ri-palette-line"
        title={t("pageTitle")}
        showBack
        actions={[{ icon: "ri-question-line", label: t("help") }]}
      />

      <main className="flex-1 overflow-y-auto w-full">
        <section className="max-w-7xl mx-auto w-full px-4 md:px-8 pb-28 pt-4">
          {/* Tab切换 */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as CreativeTab); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "bg-white/70 text-slate-600 hover:bg-white"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <i className={tab.icon} />
                <span className="font-medium">{t(tab.labelKey)}</span>
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* AI绘画Tab */}
            {activeTab === "generate" && (
              <motion.div
                key="generate"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* 提示词输入 */}
                <div className="bg-white rounded-3xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <i className="ri-lightbulb-line text-yellow-500" />
                    {t("describeTitle")}
                  </h3>
                  <textarea
                    value={prompt}
                    onChange={(e) => { setPrompt(e.target.value); }}
                    placeholder={t("promptPlaceholder")}
                    className="w-full h-32 p-4 border-2 border-purple-100 rounded-2xl resize-none focus:border-purple-300 focus:outline-none transition-colors"
                    maxLength={200}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-slate-400">{prompt.length}/200</span>
                    <button
                      onClick={() => { setPrompt(t("examplePrompt")); }}
                      className="text-sm text-purple-500 hover:text-purple-600"
                    >
                      {t("tryThis")}
                    </button>
                  </div>
                </div>

                {/* 风格选择 */}
                <div className="bg-white rounded-3xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <i className="ri-palette-line text-pink-500" />
                    {t("styleTitle")}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(Object.entries(ART_STYLE_CONFIG) as [ArtStyle, (typeof ART_STYLE_CONFIG)[ArtStyle]][]).map(
                      ([key, config]) => (
                        <motion.button
                          key={key}
                          onClick={() => { setSelectedStyle(key); }}
                          className={`p-4 rounded-2xl border-2 transition-all ${
                            selectedStyle === key
                              ? "border-purple-400 bg-purple-50 shadow-md"
                              : "border-slate-100 hover:border-purple-200 bg-white"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 mx-auto"
                            style={{ backgroundColor: config.color + "20", color: config.color }}
                          >
                            <i className={`${config.icon} text-xl`} />
                          </div>
                          <span className="text-sm font-medium">{t(`artStyleNames.${key}`)}</span>
                        </motion.button>
                      ),
                    )}
                  </div>
                </div>

                {/* 尺寸选择 */}
                <div className="bg-white rounded-3xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <i className="ri-crop-line text-blue-500" />
                    {t("canvasTitle")}
                  </h3>
                  <div className="flex gap-3 flex-wrap">
                    {[
                      { ratio: "1:1" as const, icon: "ri-checkbox-blank-line", labelKey: "ratios.square" },
                      { ratio: "4:3" as const, icon: "ri-landscape-line", labelKey: "ratios.landscape" },
                      { ratio: "3:4" as const, icon: "ri-portrait-line", labelKey: "ratios.portrait" },
                      { ratio: "16:9" as const, icon: "ri-computer-line", labelKey: "ratios.widescreen" },
                    ].map((item) => (
                      <motion.button
                        key={item.ratio}
                        onClick={() => { setAspectRatio(item.ratio); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${
                          aspectRatio === item.ratio
                            ? "border-blue-400 bg-blue-50"
                            : "border-slate-100 hover:border-blue-200"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <i className={item.icon} />
                        <span>{t(item.labelKey)}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* 生成按钮 */}
                <motion.button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating || !currentChild}
                  className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                    prompt.trim() && !isGenerating && currentChild
                      ? "bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                  whileHover={prompt.trim() && !isGenerating ? { scale: 1.02 } : {}}
                  whileTap={prompt.trim() && !isGenerating ? { scale: 0.98 } : {}}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t("generating", { progress: generationProgress })}</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-magic-line text-xl" />
                      <span>{t("startCreating")}</span>
                    </>
                  )}
                </motion.button>

                {!currentChild && (
                  <p className="text-center text-amber-600 bg-amber-50 rounded-xl p-3">{t("addChildFirst")}</p>
                )}
              </motion.div>
            )}

            {/* 作品集Tab */}
            {activeTab === "gallery" && (
              <motion.div
                key="gallery"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {artworks.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl">
                    <i className="ri-image-line text-6xl text-slate-300 mb-4" />
                    <p className="text-slate-500 mb-4">{t("galleryEmpty")}</p>
                    <button
                      onClick={() => { setActiveTab("generate"); }}
                      className="px-6 py-2 bg-purple-500 text-white rounded-full font-medium"
                    >
                      {t("startCreating")}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {artworks.map((artwork, index) => (
                      <motion.div
                        key={artwork.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="group relative bg-white rounded-2xl overflow-hidden shadow-lg"
                      >
                        <Image
                          src={artwork.imageUrl || "/placeholder.svg"}
                          alt={artwork.prompt}
                          width={400}
                          height={400}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white text-sm line-clamp-2 mb-2">{artwork.prompt}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/70 px-2 py-1 bg-white/20 rounded-full">
                                {t(`artStyleNames.${artwork.style}`)}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { toggleFavorite(artwork.id); }}
                                  className={`p-2 rounded-full ${artwork.isFavorite ? "bg-red-500 text-white" : "bg-white/20 text-white"}`}
                                >
                                  <i className={artwork.isFavorite ? "ri-heart-fill" : "ri-heart-line"} />
                                </button>
                                <button
                                  onClick={() => { deleteArtwork(artwork.id); }}
                                  className="p-2 rounded-full bg-white/20 text-white hover:bg-red-500"
                                >
                                  <i className="ri-delete-bin-line" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* 续写创作Tab */}
            {activeTab === "write" && (
              <motion.div
                key="write"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {!activeStory ? (
                  <>
                    {/* 创建新故事 */}
                    <div className="bg-white rounded-3xl p-6 shadow-lg">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <i className="ri-edit-line text-purple-500" />
                        {t("newStoryTitle")}
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">{t("storyTitleLabel")}</label>
                          <input
                            type="text"
                            value={storyTitle}
                            onChange={(e) => { setStoryTitle(e.target.value); }}
                            placeholder={t("storyTitlePlaceholder")}
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-xl focus:border-purple-300 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">{t("keywordsLabel")}</label>
                          <input
                            type="text"
                            value={storyKeywords}
                            onChange={(e) => { setStoryKeywords(e.target.value); }}
                            placeholder={t("keywordsPlaceholder")}
                            className="w-full px-4 py-3 border-2 border-purple-100 rounded-xl focus:border-purple-300 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">{t("styleLabel")}</label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {(
                              Object.entries(STORY_STYLE_CONFIG) as [
                                StoryStyle,
                                (typeof STORY_STYLE_CONFIG)[StoryStyle],
                              ][]
                            ).map(([key, config]) => (
                              <button
                                key={key}
                                onClick={() => { setStoryStyle(key); }}
                                className={`p-3 rounded-xl border-2 transition-all ${
                                  storyStyle === key
                                    ? "border-purple-400 bg-purple-50"
                                    : "border-slate-100 hover:border-purple-200"
                                }`}
                              >
                                <i className={`${config.icon} text-lg`} style={{ color: config.color }} />
                                <span className="block text-sm mt-1">{t(`storyStyleNames.${key}`)}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={handleCreateStory}
                          disabled={!storyTitle.trim() || !currentChild}
                          className={`w-full py-3 rounded-xl font-bold ${
                            storyTitle.trim() && currentChild
                              ? "bg-linear-to-r from-purple-500 to-pink-500 text-white"
                              : "bg-slate-200 text-slate-400"
                          }`}
                        >
                          {t("startCreating")}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 故事编辑器 */}
                    <div className="bg-white rounded-3xl p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">{activeStory.title}</h3>
                        <button
                          onClick={() => {
                            setActiveStoryId(null)
                            setContinuationOptions([])
                          }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <i className="ri-close-line text-xl" />
                        </button>
                      </div>

                      {/* 故事内容 */}
                      <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                        {activeStory.segments.map((segment) => (
                          <motion.div
                            key={segment.id}
                            initial={{ opacity: 0, x: segment.author === "child" ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`p-4 rounded-2xl ${
                              segment.author === "child" ? "bg-blue-50 ml-8" : "bg-purple-50 mr-8"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  segment.author === "child"
                                    ? "bg-blue-200 text-blue-700"
                                    : "bg-purple-200 text-purple-700"
                                }`}
                              >
                                {segment.author === "child" ? t("writtenByMe") : t("aiContinued")}
                              </span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{segment.content}</p>
                          </motion.div>
                        ))}
                      </div>

                      {/* 续写选项 */}
                      {continuationOptions.length > 0 && (
                        <div className="space-y-3 mb-6">
                          <p className="text-sm font-medium text-slate-600">{t("chooseDirection")}</p>
                          {continuationOptions.map((option) => (
                            <motion.button
                              key={option.id}
                              onClick={() => { handleSelectOption(activeStory.id, option); }}
                              className="w-full p-4 rounded-2xl border-2 border-purple-100 hover:border-purple-300 bg-white text-left transition-all"
                              whileHover={{ scale: 1.01 }}
                            >
                              <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs mb-2">
                                {option.direction}
                              </span>
                              <p className="text-slate-700 line-clamp-3">{option.content}</p>
                            </motion.button>
                          ))}
                        </div>
                      )}

                      {/* 用户输入 */}
                      {continuationOptions.length === 0 && (
                        <div className="space-y-3">
                          <textarea
                            value={userStoryInput}
                            onChange={(e) => { setUserStoryInput(e.target.value); }}
                            placeholder={t("inputPlaceholder")}
                            className="w-full h-24 p-4 border-2 border-purple-100 rounded-2xl resize-none focus:border-purple-300 focus:outline-none"
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleContinueStory(activeStory.id, userStoryInput || undefined)}
                              disabled={isLoadingContinuation}
                              className="flex-1 py-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold disabled:opacity-50"
                            >
                              {isLoadingContinuation ? t("thinking") : userStoryInput ? t("addAndContinue") : t("aiContinue")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* 我的故事Tab */}
            {activeTab === "stories" && (
              <motion.div
                key="stories"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {stories.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl">
                    <i className="ri-book-line text-6xl text-slate-300 mb-4" />
                    <p className="text-slate-500 mb-4">{t("storiesEmpty")}</p>
                    <button
                      onClick={() => { setActiveTab("write"); }}
                      className="px-6 py-2 bg-purple-500 text-white rounded-full font-medium"
                    >
                      {t("startCreating")}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stories.map((story, index) => (
                      <motion.div
                        key={story.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-lg">{story.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="text-xs px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: STORY_STYLE_CONFIG[story.style].color + "20",
                                  color: STORY_STYLE_CONFIG[story.style].color,
                                }}
                              >
                                {t(`storyStyleNames.${story.style}`)}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  story.status === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {story.status === "completed" ? t("statusCompleted") : t("statusCreating")}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => { deleteStory(story.id); }}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        </div>

                        <p className="text-slate-500 text-sm line-clamp-3 mb-4">
                          {story.segments.length > 0
                            ? story.segments[story.segments.length - 1]?.content
                            : t("notStarted")}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">{t("segmentsCount", { count: story.segments.length })}</span>
                          <button
                            onClick={() => {
                              setActiveStoryId(story.id)
                              setActiveTab("write")
                            }}
                            className="px-4 py-2 bg-purple-100 text-purple-600 rounded-full text-sm font-medium hover:bg-purple-200"
                          >
                            {t("continueCreating")}
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <Navigation />
    </div>
  )
}
