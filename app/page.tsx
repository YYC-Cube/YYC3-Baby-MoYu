/**
 * @fileoverview YYC³ AI小语智能成长守护系统 - 主页面
 * @description 应用主页面，展示儿童成长数据、角色交互和核心功能入口。
 *   i18n（P1）：全部可见文案走 messages 的 home/header 命名空间；
 *   zh 词条与历史文案逐字一致（视觉基线/e2e 不受影响），/en 经 [locale] Provider 渲染英文。
 * @author YYC³
 * @version 1.1.0
 * @created 2025-01-30
 * @modified 2026-11-04
 * @copyright Copyright (c) 2025 YYC³
 * @license MIT
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useTranslations } from "next-intl"
import HomeHeader from "@/components/headers/HomeHeader"
import Navigation from "@/components/Navigation"
import ChildSelector from "@/components/ChildSelector"
import { useAuth } from "@/hooks/useAuth"
import { useChildren } from "@/hooks/useChildren"
import { authFetch } from "@/lib/api/auth-fetch"
import { getCharacterForUser, characterManager, type CharacterConfig } from "@/lib/character-manager"

export default function HomePage() {
  const t = useTranslations("home")
  const { isAuthenticated } = useAuth()
  const { currentChild } = useChildren()
  const [stats, setStats] = useState({ records: 0, milestones: 0, assessments: 0 })
  const [characterImagePath, setCharacterImagePath] = useState("")
  const [currentCharacter, setCurrentCharacter] = useState<CharacterConfig | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      if (!currentChild) return
      // 服务端聚合统计（httpOnly Cookie 认证；未登录时保持 0）
      try {
        const res = await authFetch("/api/stats")
        if (!res.ok) return
        const result = (await res.json()) as {
          success?: boolean
          data?: { records?: number; milestones?: number; assessments?: number }
        }
        if (result.success && result.data) {
          setStats({
            records: result.data.records ?? 0,
            milestones: result.data.milestones ?? 0,
            assessments: result.data.assessments ?? 0,
          })
        }
      } catch {
        // 统计失败静默：卡片保持 0
      }
    }
    void loadStats()
  }, [currentChild])

  // 根据用户性别更新角色图片
  useEffect(() => {
    const updateCharacter = () => {
      if (currentChild) {
        const character = getCharacterForUser(currentChild)
        const imagePath = characterManager.getCharacterImagePath(character, 'happy')
        setCharacterImagePath(imagePath)
        setCurrentCharacter(character)
      } else {
        // 默认显示女性角色（小语）
        const character = getCharacterForUser(null)
        const imagePath = characterManager.getCharacterImagePath(character, 'happy')
        setCharacterImagePath(imagePath)
        setCurrentCharacter(character)
      }
    }

    updateCharacter()

    // 预加载角色图片
    characterManager.preloadCharacterImages().catch(console.warn)
  }, [currentChild])

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-sky-100">
      <HomeHeader />

      <main className="flex-1 overflow-y-auto w-full">
        <section className="max-w-7xl mx-auto w-full px-8 pb-28 pt-2 grid grid-cols-12 gap-8">
          {/* 左侧角色区 */}
          <motion.section
            className="col-span-12 md:col-span-4 flex flex-col justify-between items-center relative h-full"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="w-full mb-4">
              {isAuthenticated && currentChild ? (
                <motion.div
                  className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl shadow-sm flex items-center gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold">
                    {currentChild.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700">{currentChild.name}</p>
                    <p className="text-xs text-slate-400">{currentChild.current_stage || t("stageGrowing")}</p>
                  </div>
                  <ChildSelector className="ml-auto" />
                </motion.div>
              ) : (
                <motion.div
                  className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl shadow-sm"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-sm text-slate-500 mb-2">{t("loginHint")}</p>
                  <Link href="/settings" className="text-blue-500 text-sm font-medium hover:underline">
                    {t("goLogin")}
                  </Link>
                </motion.div>
              )}
            </div>

            {/* 对话气泡 */}
            <motion.div
              className="bg-white px-6 py-4 rounded-3xl rounded-bl-none shadow-soft mb-4 border-2 border-blue-100"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <p className="text-lg font-bold text-slate-700">
                {currentChild
                  ? t("bubbleNamed", { name: currentChild.nickname || currentChild.name })
                  : t("bubbleGuest")}
              </p>
            </motion.div>

            {/* Q版角色 + 柴犬 */}
            <div className="relative w-full grow flex items-center justify-center max-h-[50vh]">
              <div className="w-full h-full relative">
                {characterImagePath ? (
                  <motion.img
                    src={characterImagePath}
                    alt={currentCharacter?.name || "小语"}
                    className="w-full h-full object-contain"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "backOut" }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-8xl animate-pulse">
                      {currentChild?.gender === 'male' ? '👦' : '👧'}
                    </div>
                  </div>
                )}
                <motion.div
                  className="absolute bottom-10 right-10 text-6xl cursor-pointer"
                  title={t("petDog")}
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  🐕
                </motion.div>
              </div>
              <div className="absolute bottom-10 w-3/4 h-12 bg-green-200/50 rounded-[50%] -z-10 blur-md" />
            </div>

            <div className="mt-4 text-center">
              <h2 className="text-2xl font-rounded font-bold text-slate-700">{t("learningAssistant")}</h2>
              <p className="text-slate-500 mt-1">{t("slogan")}</p>
            </div>
          </motion.section>

          {/* 右侧功能区 */}
          <motion.section
            className="col-span-12 md:col-span-8 flex flex-col gap-6 justify-center h-full"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            {isAuthenticated && currentChild && (
              <motion.div
                className="bg-linear-to-r from-blue-500 to-purple-500 p-5 rounded-3xl text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <i className="ri-bar-chart-box-line" />
                  {t("statsTitle", { name: currentChild.name })}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">{stats.records}</p>
                    <p className="text-xs opacity-80">{t("statRecords")}</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">{stats.milestones}</p>
                    <p className="text-xs opacity-80">{t("statMilestones")}</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold">{stats.assessments}</p>
                    <p className="text-xs opacity-80">{t("statAssessments")}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 今日计划卡片 */}
            <DailyPlanCard />

            {/* 作业中心 */}
            {currentChild ? (
              <HomeworkCenterCard childName={currentChild.nickname || currentChild.name} />
            ) : (
              <HomeworkCenterCard />
            )}

            {/* 三个小功能卡片 */}
            <div className="grid grid-cols-3 gap-4 md:gap-6">
              <FeatureCard icon="ri-eraser-fill" color="purple" labelKey="features.mistakeBook" href="/homework?tab=mistakes" />
              <FeatureCard icon="ri-video-chat-fill" color="blue" labelKey="features.publicClass" href="/courses" />
              <FeatureCard icon="ri-emotion-happy-fill" color="pink" labelKey="features.moodRecord" href="/growth?tab=mood" />
            </div>
          </motion.section>
        </section>
      </main>

      <Navigation />
    </div>
  )
}

function DailyPlanCard() {
  const t = useTranslations("home")
  // 示例计划以词条驱动（P1 约定：数据不写死语言文案）
  const [plans, setPlans] = useState([
    { id: "plan-1", textKey: "plan1", done: false },
    { id: "plan-2", textKey: "plan2", done: true },
  ])

  const togglePlan = (id: string) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, done: !p.done } : p)))
  }

  return (
    <motion.div
      className="bg-macaron-yellow w-full p-6 rounded-3xl shadow-sm flex flex-col gap-3 relative overflow-hidden bg-[rgba(255,255,255,1)]"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <i className="ri-todo-fill absolute -right-4 -top-4 text-9xl text-yellow-400/20" />

      <div className="flex items-center gap-2 z-10">
        <div className="bg-yellow-400 text-white p-1.5 rounded-lg">
          <i className="ri-list-check" />
        </div>
        <h3 className="text-xl font-bold text-slate-700">{t("todayPlan")}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 z-10">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            className="flex items-center gap-3 bg-white/60 p-3 rounded-xl cursor-pointer hover:bg-white transition"
            onClick={() => { togglePlan(plan.id); }}
            whileTap={{ scale: 0.95 }}
          >
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
                plan.done ? "bg-green-400 border-green-400" : "border-slate-300"
              }`}
            >
              {plan.done && <i className="ri-check-line text-white" />}
            </div>
            <span className={`font-medium ${plan.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
              {t(plan.textKey as "plan1")}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function HomeworkCenterCard({ childName }: { childName?: string }) {
  const t = useTranslations("home")
  return (
    <motion.div
      className="bg-white w-full p-6 md:p-8 rounded-3xl shadow-soft border-2 border-blue-50 flex flex-col md:flex-row items-center justify-between relative gap-6"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-rounded font-extrabold text-slate-800 flex items-center gap-2">{t("homeworkCenter")}</h2>
        <p className="text-slate-500">
          {childName ? t("cheerNamed", { name: childName }) : t("homeworkSubtitle")}
        </p>
        <div className="mt-2 flex gap-2">
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-md">{t("homeworkTags.chinese")}</span>
          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-md">{t("homeworkTags.math")}</span>
        </div>
      </div>

      <Link href="/homework">
        <motion.button
          className="group relative bg-linear-to-r from-orange-300 to-orange-400 hover:from-orange-400 hover:to-orange-500 text-white px-8 md:px-10 py-4 md:py-5 shadow-glow transition-all flex items-center gap-3 rounded-2xl"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xl md:text-2xl font-bold tracking-wide">{t("startHomework")}</span>
          <i className="ri-arrow-right-circle-fill text-2xl md:text-3xl opacity-80 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </Link>
    </motion.div>
  )
}

function FeatureCard({
  icon,
  color,
  labelKey,
  href,
}: {
  icon: string
  color: "purple" | "blue" | "pink"
  labelKey: "features.mistakeBook" | "features.publicClass" | "features.moodRecord"
  href: string
}) {
  const t = useTranslations("home")
  const colorClasses = {
    purple: "bg-macaron-purple text-purple-400",
    blue: "bg-macaron-blue text-blue-400",
    pink: "bg-macaron-pink text-pink-400",
  }

  return (
    <Link href={href}>
      <motion.div
        className={`${colorClasses[color].split(" ")[0]} p-4 md:p-5 rounded-3xl shadow-sm hover:shadow-md transition cursor-pointer flex flex-col items-center gap-2 group`}
        whileHover={{ scale: 1.05, y: -5 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="w-12 h-12 bg-white flex items-center justify-center shadow-sm rounded-xl"
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.6 }}
        >
          <i className={`${icon} ${colorClasses[color].split(" ")[1]} text-2xl`} />
        </motion.div>
        <span className="font-bold text-slate-700 text-sm md:text-base">{t(labelKey)}</span>
      </motion.div>
    </Link>
  )
}
