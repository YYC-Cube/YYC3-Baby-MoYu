"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import Navigation from "@/components/Navigation"
import PageHeader from "@/components/headers/PageHeader"

type CourseId = "c1" | "c2" | "c3"
type CourseCategoryId = "chinese" | "math" | "science" | "art" | "enrichment"

interface Course {
  id: CourseId
  category: CourseCategoryId
  status: "ongoing" | "new" | "normal"
  progress?: number
  hasDuration?: boolean
}

const coursesData: Course[] = [
  { id: "c1", category: "chinese", status: "ongoing", progress: 75 },
  { id: "c2", category: "science", status: "new", hasDuration: true },
  { id: "c3", category: "enrichment", status: "normal" },
]

const categories: { id: "all" | CourseCategoryId; icon: string }[] = [
  { id: "all", icon: "" },
  { id: "chinese", icon: "📚" },
  { id: "math", icon: "📐" },
  { id: "science", icon: "🌏" },
  { id: "art", icon: "🎨" },
  { id: "enrichment", icon: "🌟" },
]

export default function CoursesPage() {
  const t = useTranslations("courses")
  const [selectedCategory, setSelectedCategory] = useState<"all" | CourseCategoryId>("all")

  const filteredCourses =
    selectedCategory === "all" ? coursesData : coursesData.filter((c) => c.category === selectedCategory)

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-sky-100">
      <PageHeader icon="ri-macbook-fill" title={t("pageTitle")} showBack>
        <div className="relative w-1/3 max-w-xs hidden md:block">
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            className="w-full py-3 pl-12 pr-4 rounded-full border-2 border-blue-100 focus:border-blue-300 transition shadow-sm outline-none text-slate-600 placeholder:text-slate-400 bg-white"
          />
          <i className="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </PageHeader>

      <main className="flex-1 overflow-y-auto w-full">
        <section className="max-w-7xl mx-auto w-full px-8 pb-28 pt-4">
          {/* 分类按钮 */}
          <section className="mb-6 flex overflow-x-auto hide-scrollbar gap-3 pb-2 items-center">
            <h3 className="text-xl font-bold text-slate-700 whitespace-nowrap pr-3">{t("filterLabel")}</h3>

            {categories.map((cat, index) => (
              <motion.button
                key={cat.id}
                className={`font-bold px-5 py-2 rounded-full shadow-md transition-all whitespace-nowrap ${
                  selectedCategory === cat.id ? "bg-blue-400 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => { setSelectedCategory(cat.id); }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {cat.icon} {t(`categories.${cat.id}`)}
              </motion.button>
            ))}
          </section>

          {/* 课程列表 */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredCourses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </section>
        </section>
      </main>

      <Navigation />
    </div>
  )
}

function CourseCard({ course, index }: { course: Course; index: number }) {
  const t = useTranslations("courses")
  const categoryColors: { [key in CourseCategoryId]: string } = {
    chinese: "bg-white border-green-200",
    science: "bg-macaron-purple",
    enrichment: "bg-macaron-yellow",
    math: "bg-white",
    art: "bg-white",
  }

  return (
    <motion.article
      className={`rounded-3xl p-6 shadow-soft hover:shadow-lg transition-all cursor-pointer flex flex-col gap-4 ${
        categoryColors[course.category] || "bg-white"
      }`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.03, y: -5 }}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-bold px-3 py-1 rounded-full ${
            course.status === "ongoing"
              ? "bg-green-100 text-green-700"
              : course.status === "new"
                ? "bg-purple-100 text-purple-700"
                : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {t(`items.${course.id}.badge`)}
        </span>
        <i
          className={`${course.status === "ongoing" ? "ri-bookmark-fill text-yellow-500" : "ri-bookmark-line text-slate-300"} text-xl`}
        />
      </div>

      <div>
        <h4 className="text-xl font-bold mb-1">{t(`items.${course.id}.title`)}</h4>
        <p
          className={`text-sm ${course.category === "science" || course.category === "enrichment" ? "text-slate-600" : "text-slate-500"}`}
        >
          {t(`items.${course.id}.description`)}
        </p>
      </div>

      {course.progress !== undefined && (
        <div>
          <div className="text-sm font-medium mb-1 flex justify-between">
            <span>{t("progressLabel", { progress: course.progress })}</span>
            <span className="text-green-600">{t("unitsLearned")}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <motion.div
              className="bg-green-500 h-2.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${course.progress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </div>
      )}

      {course.hasDuration && (
        <div className="text-sm font-medium text-slate-600">
          <i className="ri-time-line text-lg mr-1" /> {t(`items.${course.id}.duration`)}
        </div>
      )}

      <motion.button
        className={`w-full py-2 rounded-full font-bold transition ${
          course.status === "ongoing"
            ? "bg-green-400 text-white hover:bg-green-500"
            : course.status === "new"
              ? "bg-purple-400 text-white hover:bg-purple-500"
              : "bg-warm-orange text-white hover:bg-orange-500"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {course.status === "ongoing" ? t("continueLearning") : course.status === "new" ? t("startNow") : t("viewDetails")}
      </motion.button>
    </motion.article>
  )
}
