"use client"

import LoginModal from "@/components/auth/LoginModal"
import { motion } from "framer-motion"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { localeTag } from "@/lib/i18n/format"

export default function HomeHeader() {
  const t = useTranslations("header")
  const locale = useLocale()
  // zh 保持 zh-CN 格式（视觉基线/e2e 文案逐字不变）；en 用 en-US
  const dateLocale = localeTag(locale)
  const [time, setTime] = useState("08:30")
  const [date, setDate] = useState("11月24日 星期五")
  // 登录/注册入口：LoginModal 弹窗（/auth/* 页面路由不存在，历史链接为死链）
  const [authModal, setAuthModal] = useState<"login" | "register" | null>(null)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" }))
      setDate(
        now.toLocaleDateString(dateLocale, {
          month: "long",
          day: "numeric",
          weekday: "long",
        }),
      )
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => { clearInterval(timer); }
  }, [dateLocale])

  // 敏感页重定向回来的登录提示（middleware 307 到 /?login=1）。
  // 必须监听 searchParams 变化而非仅在挂载时读一次：应用内 <Link> 跳转受保护页时，
  // 路由会被就地改写为 /?login=1，HomeHeader 不会重新挂载，挂载期 effect 不会重跑。
  const openLogin = useCallback(() => { setAuthModal("login") }, [])

  return (
    <motion.header
      className="w-full px-8 py-4 flex items-center justify-between z-20"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-6">
        <div className="text-right">
          <motion.div
            className="text-3xl font-bold text-adaptive font-rounded tracking-widest"
            key={time}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {time}
          </motion.div>
          <div className="text-sm text-adaptive-muted font-medium">{date}</div>
        </div>

        <motion.div
          className="flex items-center gap-2 bg-white/60 dark:bg-gray-800/60 px-4 py-2 backdrop-blur-sm rounded-md"
          whileHover={{ scale: 1.05 }}
        >
          <motion.i
            className="ri-sun-fill text-yellow-400 text-2xl"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
          <span className="text-lg font-bold text-adaptive">23°C</span>
          <span className="text-xs text-adaptive-muted">{t("weatherSuitable")}</span>
        </motion.div>
      </div>

      <div className="flex gap-3 items-center">
        {/* 登录/注册按钮（弹窗形式，避免死链路由） */}
        <div className="flex gap-2">
          <motion.button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setAuthModal("login") }}
          >
            {t("login")}
          </motion.button>
          <motion.button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setAuthModal("register") }}
          >
            {t("register")}
          </motion.button>
          <Suspense fallback={null}>
            <LoginParamWatcher onLogin={openLogin} />
          </Suspense>
          <LoginModal
            isOpen={authModal !== null}
            initialMode={authModal ?? "login"}
            onClose={() => { setAuthModal(null) }}
          />
        </div>

        <QuickActionButton
          href="/growth"
          icon="ri-calendar-check-fill"
          iconColor="text-blue-400"
          label={t("quickStudy")}
          hoverColor="hover:bg-blue-50"
        />
        <QuickActionButton
          href="/activities"
          icon="ri-heart-3-fill"
          iconColor="text-red-400"
          label={t("quickActivity")}
          hoverColor="hover:bg-red-50"
        />
        <QuickActionButton
          href="/settings"
          icon="ri-parent-fill"
          iconColor="text-yellow-500"
          label={t("quickParent")}
          hoverColor="hover:bg-yellow-50"
        />
      </div>
    </motion.header>
  )
}

/**
 * 监听 ?login=1：middleware 对受保护页的 307 会落到首页并携带该参数。
 * 用 useSearchParams（而非 window.location）保证应用内 Link 跳转、页面未重挂载时同样触发；
 * 消费后 replaceState 清除参数，避免刷新重复弹窗。
 */
function LoginParamWatcher({ onLogin }: { onLogin: () => void }) {
  const searchParams = useSearchParams()
  const login = searchParams.get("login")

  useEffect(() => {
    if (!login) return
    onLogin()
    window.history.replaceState(null, "", window.location.pathname)
  }, [login, onLogin])

  return null
}

function QuickActionButton({
  href,
  icon,
  iconColor,
  label,
  hoverColor,
}: {
  href: string
  icon: string
  iconColor: string
  label: string
  hoverColor: string
}) {
  return (
    <Link href={href}>
      <motion.button
        className={`flex items-center gap-2 bg-surface px-4 py-2 shadow-sm transition cursor-pointer text-adaptive-muted rounded-md ${hoverColor}`}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        <i className={`${icon} ${iconColor}`} />
        <span className="text-sm font-black">{label}</span>
      </motion.button>
    </Link>
  )
}
