"use client"

import type React from "react"

import Navigation from "@/components/Navigation"
import UserCenter from "@/components/auth/UserCenter"
import PageHeader from "@/components/headers/PageHeader"
import ThemeSwitcher from "@/components/theme-system/ThemeSwitcher"
import { useAuth } from "@/hooks/useAuth"
import { useChildren } from "@/hooks/useChildren"
import { characterManager } from "@/lib/character-manager"
import { motion } from "framer-motion"
import { useState } from "react"

export default function SettingsPage() {
  const [eyeMode, setEyeMode] = useState(true)
  const [reminder, setReminder] = useState(false)
  const { user, logout } = useAuth()
  // 数据来源：真实儿童档案（/api/children），非内置示例
  const { currentChild } = useChildren()

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-sky-100">
      <PageHeader icon="ri-settings-4-fill" title="设置与管理" />

      <main className="flex-1 overflow-y-auto w-full">
        <section className="max-w-5xl mx-auto w-full px-8 pb-28 pt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="col-span-1 md:col-span-2">
            <motion.div
              className="bg-linear-to-r from-blue-500 to-purple-500 rounded-3xl p-6 shadow-soft text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {currentChild ? (
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
                      <img
                        src={characterManager.getCharacterImagePath(characterManager.getCharacterForUser(currentChild), 'happy')}
                        alt={currentChild.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                      {user ? (user.firstName || user.lastName || user.email?.charAt(0) || "U") : "?"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split("@")[0] : "未登录"}</h3>
                    <p className="text-white/80 text-sm">{user ? user.email : "登录后享受完整功能"}</p>
                  </div>
                </div>
                <UserCenter />
              </div>

              {user && (
                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">128</p>
                    <p className="text-white/70 text-xs">学习天数</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">56</p>
                    <p className="text-white/70 text-xs">完成任务</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-white/70 text-xs">成长徽章</p>
                  </div>
                </div>
              )}
            </motion.div>
          </section>

          {/* 账户与安全 */}
          <SettingsSection title="账户与安全" icon="ri-user-settings-fill" iconColor="text-blue-500" index={0}>
            <SettingsItem
              icon="ri-account-circle-fill"
              iconColor="text-blue-400"
              title="修改资料/昵称"
              subtitle={user ? `当前昵称：${user.firstName || "未设置"}` : "请先登录"}
              hasArrow
            />
            <SettingsItem
              icon="ri-shield-fill"
              iconColor="text-green-400"
              title="家长授权码"
              subtitle="用于家长端绑定和管理"
              action={
                <button className="bg-green-400 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-green-500">
                  查看
                </button>
              }
            />
          </SettingsSection>

          {/* 界面主题 */}
          <SettingsSection title="界面主题" icon="ri-palette-fill" iconColor="text-emerald-500" index={0}>
            <SettingsItem
              icon="ri-magic-fill"
              iconColor="text-emerald-400"
              title="主题风格"
              subtitle="暖阳 / 赛博霓虹 / 液态翡翠"
              action={<ThemeSwitcher compact />}
            />
          </SettingsSection>

          {/* 学习偏好 */}
          <SettingsSection title="学习偏好" icon="ri-book-mark-fill" iconColor="text-purple-500" index={1}>
            <SettingsItem
              icon="ri-eye-fill"
              iconColor="text-purple-400"
              title="护眼模式"
              subtitle="开启后界面将调整为暖色"
              action={<ToggleSwitch value={eyeMode} onChange={setEyeMode} />}
            />
            <SettingsItem
              icon="ri-notification-3-fill"
              iconColor="text-pink-400"
              title="学习进度提醒"
              subtitle="每天发送一次作业提醒"
              action={<ToggleSwitch value={reminder} onChange={setReminder} />}
              hasBorder
            />
          </SettingsSection>

          {/* 家长与帮助 */}
          <section className="col-span-1 md:col-span-2">
            <motion.h2
              className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <i className="ri-parent-fill text-orange-500" />
              家长与帮助
            </motion.h2>

            <motion.div
              className="bg-white rounded-3xl p-6 shadow-soft grid grid-cols-1 md:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <ActionCard
                icon="ri-question-mark-circle-fill"
                iconColor="text-yellow-500"
                bgColor="bg-macaron-yellow hover:bg-yellow-100"
                label="常见问题 (FAQ)"
              />
              <ActionCard
                icon="ri-customer-service-2-fill"
                iconColor="text-green-500"
                bgColor="bg-macaron-green hover:bg-green-100"
                label="联系我们"
              />
              {user ? (
                <ActionCard
                  icon="ri-logout-box-r-fill"
                  iconColor="text-red-600"
                  bgColor="bg-red-100 hover:bg-red-200"
                  label="退出登录"
                  textColor="text-red-600"
                  onClick={logout}
                />
              ) : (
                <ActionCard
                  icon="ri-login-box-line"
                  iconColor="text-blue-600"
                  bgColor="bg-blue-100 hover:bg-blue-200"
                  label="登录账号"
                  textColor="text-blue-600"
                />
              )}
            </motion.div>
          </section>
        </section>
      </main>

      <Navigation />
    </div>
  )
}

function SettingsSection({
  title,
  icon,
  iconColor,
  index,
  children,
}: {
  title: string
  icon: string
  iconColor: string
  index: number
  children: React.ReactNode
}) {
  return (
    <section>
      <motion.h2
        className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: index * 0.2 }}
      >
        <i className={`${icon} ${iconColor}`} />
        {title}
      </motion.h2>

      <motion.div
        className="bg-white rounded-3xl p-6 shadow-soft space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.2 + 0.2 }}
      >
        {children}
      </motion.div>
    </section>
  )
}

function SettingsItem({
  icon,
  iconColor,
  title,
  subtitle,
  hasArrow,
  action,
  hasBorder,
}: {
  icon: string
  iconColor: string
  title: string
  subtitle: string
  hasArrow?: boolean
  action?: React.ReactNode
  hasBorder?: boolean
}) {
  return (
    <motion.div
      className={`flex justify-between items-center py-2 hover:bg-blue-50/50 transition rounded-lg px-2 -mx-2 ${hasBorder ? "border-t pt-4 border-slate-50/50" : ""}`}
      whileHover={{ x: 5 }}
    >
      <div className="flex items-center gap-3">
        <i className={`${icon} text-2xl ${iconColor}`} />
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {hasArrow && <i className="ri-arrow-right-s-line text-xl text-slate-400" />}
      {action}
    </motion.div>
  )
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <motion.div
      className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors ${value ? "bg-blue-400" : "bg-slate-300"
        }`}
      onClick={() => { onChange(!value); }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
        animate={{ x: value ? 24 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </motion.div>
  )
}

function ActionCard({
  icon,
  iconColor,
  bgColor,
  label,
  textColor = "text-slate-800",
  onClick,
}: {
  icon: string
  iconColor: string
  bgColor: string
  label: string
  textColor?: string
  onClick?: () => void
}) {
  return (
    <motion.button
      className={`flex flex-col items-center p-4 rounded-2xl transition ${bgColor}`}
      whileHover={{ scale: 1.05, y: -3 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <i className={`${icon} text-3xl ${iconColor}`} />
      <p className={`font-bold mt-1 ${textColor}`}>{label}</p>
    </motion.button>
  )
}
