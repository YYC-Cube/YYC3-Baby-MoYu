"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"

// label 为词条键（messages/*/json 的 navigation 命名空间），渲染时经 t() 取当前语言
const navItems = [
  { id: "home", icon: "ri-home-smile-2-fill", labelKey: "tabHome", href: "/" },
  { id: "videos", icon: "ri-video-fill", labelKey: "tabVideos", href: "/videos" },
  { id: "books", icon: "ri-book-3-fill", labelKey: "tabBooks", href: "/books" },
  { id: "short-drama", icon: "ri-movie-2-fill", labelKey: "tabShortDrama", href: "/ai-creative", badge: true },
  { id: "creative", icon: "ri-palette-fill", labelKey: "tabCreative", href: "/ai-creative" },
  { id: "curriculum", icon: "ri-calendar-todo-fill", labelKey: "tabCurriculum", href: "/curriculum" },
  { id: "growth", icon: "ri-trophy-fill", labelKey: "tabGrowth", href: "/growth" },
  { id: "settings", icon: "ri-settings-4-fill", labelKey: "tabSettings", href: "/settings" },
]

export default function Navigation() {
  const pathname = usePathname()
  const t = useTranslations("navigation")

  return (
    <motion.nav
      className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-white/50 shadow-xl py-2 z-40 flex items-center gap-1 rounded-2xl px-4"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      {navItems.map((item, index) => {
        const isActive = pathname === item.href

        return (
          <Link key={item.id} href={item.href}>
            <motion.button
              className={`relative flex flex-col items-center justify-center py-2 transition-all px-5 rounded-xl ${
                isActive ? "bg-blue-400 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              {item.badge && !isActive && (
                <motion.div
                  className="absolute top-1 right-2 w-2 h-2 bg-red-400 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                />
              )}
              <i className={`${item.icon} text-xl mb-0.5`} />
              <span className="text-[10px]">{t(item.labelKey)}</span>
            </motion.button>
          </Link>
        )
      })}
    </motion.nav>
  )
}
