"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"
import PageHeader from "@/components/PageHeader"
import Navigation from "@/components/Navigation"
import BookReader from "@/components/books/BookReader"
import { usePictureBook } from "@/hooks/usePictureBook"
import { BOOK_CATEGORY_CONFIG, type BookCategory } from "@/types/ai-creative"

export default function BooksPage() {
  const t = useTranslations("books")
  const {
    books,
    currentBook,
    currentPage,
    isPlaying,
    selectBook,
    goToPage,
    play,
    pause,
    toggleFavorite,
    filterByCategory,
    searchBooks,
  } = usePictureBook()

  const [activeCategory, setActiveCategory] = useState<BookCategory | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showReader, setShowReader] = useState(false)

  const handleCategoryChange = (category: BookCategory | "all") => {
    setActiveCategory(category)
    filterByCategory(category)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    searchBooks(query)
  }

  const handleBookSelect = (bookId: string) => {
    selectBook(bookId)
    setShowReader(true)
  }

  const handleCloseReader = () => {
    setShowReader(false)
    pause()
  }

  const categories: (BookCategory | "all")[] = [
    "all",
    "story",
    "science",
    "emotion",
    "habit",
    "culture",
    "english",
    "math",
    "nature",
  ]

  return (
    <div className="min-h-screen bg-linear-to-b from-amber-50 to-orange-50 pb-24">
      <PageHeader title={t("pageTitle")} showBack />

      {/* 搜索栏 */}
      <div className="px-4 py-3">
        <div className="relative">
          <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
          />
        </div>
      </div>

      {/* 分类导航 */}
      <div className="px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => {
            // 分类名走词条（zh 与 BOOK_CATEGORY_CONFIG 逐字一致），icon/color 仍取数据层配置
            const config =
              category === "all"
                ? { name: t("all"), icon: "ri-apps-line", color: "#6B7280" }
                : { ...BOOK_CATEGORY_CONFIG[category], name: t(`categoryNames.${category}`) }
            const isActive = activeCategory === category

            return (
              <button
                key={category}
                onClick={() => { handleCategoryChange(category); }}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isActive
                    ? "bg-linear-to-r from-amber-400 to-orange-400 text-white shadow-md"
                    : "bg-white text-slate-600 hover:bg-amber-50"
                }`}
              >
                <i className={`${config.icon} text-lg`} />
                <span className="text-sm font-medium whitespace-nowrap">{config.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 绘本列表 */}
      <div className="px-4 py-4">
        {/* 推荐区 */}
        {activeCategory === "all" && books.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <i className="ri-star-line text-amber-500" />
              {t("todayRecommended")}
            </h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl overflow-hidden shadow-lg"
            >
              <img
                src={books[0]?.coverUrl || "/placeholder.svg"}
                alt={books[0]?.title || "Book"}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-xl font-bold text-white mb-1">{books[0]?.title || ""}</h3>
                <p className="text-white/80 text-sm mb-3">{books[0]?.author || ""}</p>
                <button
                  onClick={() => {
                    if (books[0]) {
                      handleBookSelect(books[0].id);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-amber-600 font-medium hover:bg-white transition-colors"
                >
                  <i className="ri-play-circle-line text-lg" />
                  {t("startReading")}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 绘本网格 */}
        <div className="grid grid-cols-2 gap-4">
          {books.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
            >
              <div onClick={() => { handleBookSelect(book.id); }} className="w-full text-left cursor-pointer">
                <div className="relative aspect-[3/4]">
                  <img
                    src={book.coverUrl || "/placeholder.svg"}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />

                  {/* 收藏按钮 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(book.id)
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm"
                  >
                    <i
                      className={`${book.isFavorite ? "ri-heart-fill text-red-500" : "ri-heart-line text-slate-400"} text-lg`}
                    />
                  </button>

                  {/* AI生成标签 */}
                  {book.isAIGenerated && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-linear-to-r from-purple-500 to-pink-500 rounded-full">
                      <span className="text-xs text-white font-medium">{t("aiCreated")}</span>
                    </div>
                  )}

                  {/* 时长 */}
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded-full">
                    <span className="text-xs text-white">{t("durationMinutes", { duration: book.duration })}</span>
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="font-semibold text-slate-800 truncate mb-1">{book.title}</h3>
                  <p className="text-xs text-slate-500 mb-2">{book.author}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <i className="ri-book-read-line text-amber-500 text-sm" />
                      <span className="text-xs text-slate-500">{t("readCount", { count: book.readCount })}</span>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${BOOK_CATEGORY_CONFIG[book.category].color}20`,
                        color: BOOK_CATEGORY_CONFIG[book.category].color,
                      }}
                    >
                      {t(`categoryNames.${book.category}`)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 空状态 */}
        {books.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <i className="ri-book-line text-6xl text-slate-300 mb-4" />
            <p className="text-slate-500">{t("empty")}</p>
          </div>
        )}
      </div>

      {/* 绘本阅读器 */}
      <AnimatePresence>
        {showReader && currentBook && (
          <BookReader
            book={currentBook}
            currentPage={currentPage}
            isPlaying={isPlaying}
            onPageChange={goToPage}
            onPlay={play}
            onPause={pause}
            onClose={handleCloseReader}
          />
        )}
      </AnimatePresence>

      <Navigation />
    </div>
  )
}
