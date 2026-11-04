"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import Navigation from "@/components/Navigation"
import PageHeader from "@/components/headers/PageHeader"

type MessageId = "m1" | "m2" | "m3" | "m4"

interface Message {
  id: MessageId
  type: "homework" | "system" | "activity"
  icon: string
  iconColor: string
  unread: boolean
  bgColor?: string
}

const messagesData: Message[] = [
  {
    id: "m1",
    type: "homework",
    icon: "ri-check-double-fill",
    iconColor: "text-yellow-500",
    unread: true,
    bgColor: "bg-macaron-yellow border-l-4 border-yellow-400",
  },
  {
    id: "m2",
    type: "homework",
    icon: "ri-edit-2-fill",
    iconColor: "text-blue-400",
    unread: false,
  },
  {
    id: "m3",
    type: "system",
    icon: "ri-sun-fill",
    iconColor: "text-purple-500",
    unread: true,
    bgColor: "bg-macaron-purple border-l-4 border-purple-400",
  },
  {
    id: "m4",
    type: "activity",
    icon: "ri-group-fill",
    iconColor: "text-green-400",
    unread: false,
  },
]

export default function MessagesPage() {
  const t = useTranslations("messageCenter")
  const homeworkMessages = messagesData.filter((m) => m.type === "homework")
  const systemMessages = messagesData.filter((m) => m.type === "system")
  const activityMessages = messagesData.filter((m) => m.type === "activity")

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-sky-100">
      <PageHeader
        icon="ri-message-3-fill"
        title={t("pageTitle")}
        actions={[{ icon: "ri-mail-open-line", label: t("markAllRead") }]}
      />

      <main className="flex-1 overflow-y-auto w-full">
        <section className="max-w-4xl mx-auto w-full px-8 pb-28 pt-4">
          {/* 作业反馈 */}
          <MessageSection
            title={t("sections.homework")}
            icon="ri-medal-fill"
            iconColor="text-yellow-500"
            unreadCount={homeworkMessages.filter((m) => m.unread).length}
            messages={homeworkMessages}
          />

          {/* 系统通知 */}
          <MessageSection
            title={t("sections.system")}
            icon="ri-notification-3-fill"
            iconColor="text-purple-500"
            unreadCount={systemMessages.filter((m) => m.unread).length}
            messages={systemMessages}
          />

          {/* 活动通知 */}
          <MessageSection
            title={t("sections.activity")}
            icon="ri-plant-fill"
            iconColor="text-green-500"
            unreadCount={activityMessages.filter((m) => m.unread).length}
            messages={activityMessages}
          />
        </section>
      </main>

      <Navigation />
    </div>
  )
}

function MessageSection({
  title,
  icon,
  iconColor,
  unreadCount,
  messages,
}: {
  title: string
  icon: string
  iconColor: string
  unreadCount: number
  messages: Message[]
}) {
  const t = useTranslations("messageCenter")
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
        <i className={`${icon} ${iconColor}`} />
        {title} {t("unreadCount", { count: unreadCount })}
      </h2>

      <div className="space-y-4">
        {messages.map((message, index) => (
          <MessageCard key={message.id} message={message} index={index} />
        ))}
      </div>
    </section>
  )
}

function MessageCard({ message, index }: { message: Message; index: number }) {
  const t = useTranslations("messageCenter")
  return (
    <motion.article
      className={`rounded-3xl p-5 shadow-soft hover:shadow-lg transition-all cursor-pointer flex items-start gap-4 ${
        message.unread ? message.bgColor : "bg-white opacity-80"
      }`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: message.unread ? 1 : 0.8, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ scale: 1.01, x: 5 }}
    >
      <i className={`${message.icon} ${message.iconColor} text-3xl mt-1`} />
      <div className="flex-1">
        <h4 className="text-lg font-bold">{t(`items.${message.id}.title`)}</h4>
        <p className={`text-sm mt-1 ${message.unread ? "text-slate-600" : "text-slate-500"}`}>
          {t(`items.${message.id}.content`)}
        </p>
      </div>
      <span className="text-xs text-slate-500 mt-1 flex items-center gap-1 whitespace-nowrap">
        <i className="ri-time-line" /> {t(`items.${message.id}.time`)}
      </span>
    </motion.article>
  )
}
