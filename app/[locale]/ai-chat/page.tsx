"use client"

import { useState, useEffect } from "react"
import type { Message } from "../../../types/common"
import { getCurrentTimestamp, getRandomDelay, getRandomIndex } from "../../../types/common"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import Link from "next/link"
import VoiceInteraction from "@/components/VoiceInteraction"

export default function AIChatPage() {
  const t = useTranslations("ai")
  const tNav = useTranslations("navigation")
  const [messageIdCounter, setMessageIdCounter] = useState(() => {
    if (typeof window === 'undefined') return 1000
    const saved = localStorage.getItem('yyc3-ai-chat-messages')
    if (saved) {
      try {
        const parsedMessages = JSON.parse(saved) as Message[]
        if (parsedMessages.length > 0) {
          const maxId = Math.max(...parsedMessages.map((m) => Number(m.id)))
          return maxId + 1
        }
      } catch (e) {
        console.error('Failed to parse saved messages:', e)
      }
    }
    return 1000
  })
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem('yyc3-ai-chat-messages')
    if (saved) {
      try {
        const parsedMessages = JSON.parse(saved)
        return parsedMessages
      } catch (e) {
        console.error('Failed to parse saved messages:', e)
        return [{
          id: 1,
          role: "assistant",
          content: t("welcome"),
          avatar: "🤖",
          name: t("defaultRoleName"),
          timestamp: getCurrentTimestamp()
        }]
      }
    }
    return [{
      id: 1,
      role: "assistant",
      content: t("welcome"),
      avatar: "🤖",
      name: t("defaultRoleName"),
      timestamp: getCurrentTimestamp()
    }]
  })
  const [inputMessage, setInputMessage] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState("")

  // 保存消息到localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 1) {
      localStorage.setItem('yyc3-ai-chat-messages', JSON.stringify(messages))
    }
  }, [messages])

  // 清空聊天记录
  const clearChatHistory = () => {
    const initialMessage: Message = {
      id: messageIdCounter,
      role: "assistant",
      content: t("clearedAck"),
      avatar: "🤖",
      name: t("defaultRoleName"),
      timestamp: getCurrentTimestamp()
    }
    setMessageIdCounter(prev => prev + 1)
    setMessages([initialMessage])
    if (typeof window !== 'undefined') {
      localStorage.removeItem('yyc3-ai-chat-messages')
    }
  }

  const aiRoles = [
    {
      id: "all",
      nameKey: "roles.all.name",
      descriptionKey: "roles.all.description",
      avatar: "🤖",
      color: "bg-purple-100 text-purple-600"
    },
    {
      id: "recorder",
      nameKey: "roles.recorder.name",
      descriptionKey: "roles.recorder.description",
      avatar: "📝",
      color: "bg-blue-100 text-blue-600"
    },
    {
      id: "guardian",
      nameKey: "roles.guardian.name",
      descriptionKey: "roles.guardian.description",
      avatar: "🛡️",
      color: "bg-green-100 text-green-600"
    },
    {
      id: "listener",
      nameKey: "roles.listener.name",
      descriptionKey: "roles.listener.description",
      avatar: "👂",
      color: "bg-pink-100 text-pink-600"
    },
    {
      id: "advisor",
      nameKey: "roles.advisor.name",
      descriptionKey: "roles.advisor.description",
      avatar: "🎓",
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      id: "cultural",
      nameKey: "roles.cultural.name",
      descriptionKey: "roles.cultural.description",
      avatar: "📚",
      color: "bg-indigo-100 text-indigo-600"
    }
  ]

  // 异步契约：保持 async 签名供事件处理器统一调用（内部 setTimeout 模拟延迟）
  // eslint-disable-next-line @typescript-eslint/require-await
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: messageIdCounter,
      role: "user",
      content: inputMessage,
      avatar: "👨‍👧",
      name: "家长",
      timestamp: getCurrentTimestamp()
    }

    setMessageIdCounter(prev => prev + 1)
    setMessages((prev: Message[]) => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      const randomDelay = getRandomDelay(800, 2000)
      setTimeout(() => {
        const aiResponse = generateAIResponse(inputMessage, selectedRole)
        setMessages((prev: Message[]) => [...prev, aiResponse])
        setIsLoading(false)
      }, randomDelay)
    } catch (error) {
      console.error('AI响应生成失败:', error)
      const fallbackResponse: Message = {
        id: messageIdCounter + 1,
        role: "assistant",
        content: t("fallbackError"),
        avatar: "🤖",
        name: "小语AI助手",
        timestamp: getCurrentTimestamp()
      }
      setMessageIdCounter(prev => prev + 2)
      setMessages((prev: Message[]) => [...prev, fallbackResponse])
      setIsLoading(false)
    }
  }

  // 语音转录处理
  const handleVoiceTranscript = (transcript: string) => {
    setInputMessage(transcript)
  }

  // 情感检测处理
  const handleEmotionDetected = (emotion: string) => {
    setCurrentEmotion(emotion)
    // 可以在这里添加情感相关的AI响应逻辑
    console.log("检测到情感:", emotion)
  }

  // 演示回复库已键驱动（messages/ai.roles.*）；关键词路由语义与原实现一致
  const generateAIResponse = (message: string, role: string) => {
    const lowerMessage = message.toLowerCase()
    const roleKey = aiRoles.some((r) => r.id === role) ? role : "all"

    // 关键词检测（路由到对应角色的对应示例回复）
    if (lowerMessage.includes('你好') || lowerMessage.includes('嗨') || lowerMessage.includes('hi')) {
      return createResponse(role, t(`roles.${roleKey}.greeting`))
    }

    if (lowerMessage.includes('哭') || lowerMessage.includes('闹') || lowerMessage.includes('不安')) {
      return createResponse(role, t("roles.listener.r2"))
    }

    if (lowerMessage.includes('睡觉') || lowerMessage.includes('睡眠')) {
      return createResponse(role, t("roles.advisor.r2"))
    }

    if (lowerMessage.includes('吃饭') || lowerMessage.includes('辅食')) {
      return createResponse(role, t("roles.advisor.r3"))
    }

    if (lowerMessage.includes('发育') || lowerMessage.includes('成长')) {
      return createResponse(role, t("roles.recorder.r2"))
    }

    if (lowerMessage.includes('安全') || lowerMessage.includes('危险')) {
      return createResponse(role, t("roles.guardian.r1"))
    }

    if (lowerMessage.includes('学习') || lowerMessage.includes('教育') || lowerMessage.includes('启蒙')) {
      return createResponse(role, t("roles.cultural.r1"))
    }

    // 按角色随机取一条示例回复
    const responseIndex = getRandomIndex(3)
    return createResponse(role, t(`roles.${roleKey}.r${responseIndex + 1}`))
  }

  const createResponse = (role: string, content: string): Message => {
    const newMessage: Message = {
      id: messageIdCounter,
      role: "assistant",
      content: content,
      avatar: role === "all" ? "🤖" : aiRoles.find(r => r.id === role)?.avatar ?? "🤖",
      name: role === "all" ? t("defaultRoleName") : t(aiRoles.find(r => r.id === role)?.nameKey ?? "defaultRoleName"),
      timestamp: getCurrentTimestamp()
    }
    setMessageIdCounter(prev => prev + 1)
    return newMessage
  }

  return (
    <div className="min-h-screen bg-sky-50">
      {/* 简化版头部 */}
      <header className="bg-white shadow-sm border-b border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <h1 className="text-2xl font-bold text-blue-600">
                  YYC³ AI小语
                </h1>
              </Link>
            </div>
            <nav className="flex space-x-8">
              <Link href="/" className="text-gray-700 hover:text-blue-600">
                {tNav("home")}
              </Link>
              <Link href="/ai-chat" className="text-blue-600 font-medium">
                {t("navAiChat")}
              </Link>
              <Link href="/growth" className="text-gray-700 hover:text-blue-600">
                {tNav("growth")}
              </Link>
              <Link href="/courses" className="text-gray-700 hover:text-blue-600">
                {tNav("courses")}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 诚实标注：本页回答由本地预设话术生成，不调用模型；避免用户误判为真实推理 */}
      <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          {t("demoBannerPre")}<code className="font-mono">/api/ai/chat</code>{t("demoBannerPost")}
          <code className="font-mono"> OPENAI_API_KEY </code>{t("demoBannerEnv")}
        </div>
      </div>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：AI角色选择 */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h2 className="text-lg font-bold mb-4">{t("chooseRole")}</h2>
              <div className="space-y-3">
                {aiRoles.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => { setSelectedRole(role.id); }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedRole === role.id
                        ? role.color
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{role.avatar}</span>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{t(role.nameKey)}</h3>
                        <p className="text-xs text-gray-600 mt-1">{t(role.descriptionKey)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* 右侧：对话区域 */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-xl shadow-lg h-[600px] flex flex-col"
            >
              {/* 对话头部 */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {selectedRole === "all" ? "🤖" : aiRoles.find(r => r.id === selectedRole)?.avatar}
                    </span>
                    <div>
                      <h2 className="font-bold">
                        {selectedRole === "all" ? t("defaultRoleName") : t(aiRoles.find(r => r.id === selectedRole)?.nameKey ?? "defaultRoleName")}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {selectedRole === "all" ? t("defaultRoleDesc") : t(aiRoles.find(r => r.id === selectedRole)?.descriptionKey ?? "defaultRoleDesc")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-600">{t("online")}</span>
                    </div>
                    <motion.button
                      onClick={clearChatHistory}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors flex items-center gap-1"
                      title={t("clearTitle")}
                    >
                      <i className="ri-delete-bin-line" />
                      {t("clear")}
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* 消息列表 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message: Message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex items-start space-x-3 max-w-[80%] ${
                      message.role === "user" ? "flex-row-reverse space-x-reverse" : ""
                    }`}>
                      <div className="text-2xl shrink-0">
                        {message.avatar}
                      </div>
                      <div>
                        <div className={`rounded-lg px-4 py-3 ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {message.role === "user" ? t("you") : message.name}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-start space-x-3 max-w-[80%]">
                      <div className="text-2xl">🤖</div>
                      <div className="bg-gray-100 rounded-lg px-4 py-3">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* 输入区域 */}
              <div className="border-t border-gray-200 p-4">
                {/* 语音交互区域 */}
                <div className="mb-4">
                  <VoiceInteraction
                    onTranscript={handleVoiceTranscript}
                    onEmotionDetected={handleEmotionDetected}
                    className="p-4 bg-gray-50 rounded-lg"
                  />
                </div>

                {/* 文本输入区域 */}
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => { setInputMessage(e.target.value); }}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder={t("inputPlaceholder")}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {t("send")}
                  </motion.button>
                </div>

                {/* 情感状态显示 */}
                {currentEmotion && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 text-center"
                  >
                    <span className="text-sm text-gray-600">
                      {t("emotionDetected")}
                    </span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      currentEmotion === "happy" ? "bg-yellow-100 text-yellow-700" :
                      currentEmotion === "sad" ? "bg-blue-100 text-blue-700" :
                      currentEmotion === "excited" ? "bg-red-100 text-red-700" :
                      currentEmotion === "calm" ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {currentEmotion === "happy" ? t("emotionHappy") :
                       currentEmotion === "sad" ? t("emotionSad") :
                       currentEmotion === "excited" ? t("emotionExcited") :
                       currentEmotion === "calm" ? t("emotionCalm") :
                       t("emotionNeutral")}
                    </span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* 快速建议 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-lg font-bold mb-4">{t("quickTips")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <motion.button
                key={n}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setInputMessage(t(`suggestions.s${n}`)); }}
                className="p-3 bg-sky-50 hover:bg-sky-100 rounded-lg text-left transition-colors"
              >
                <p className="text-sm text-gray-700">{t(`suggestions.s${n}`)}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </main>

      {/* 简化版页脚 */}
      <footer className="bg-white border-t border-sky-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 YYC³ AI小语 - {t("footerTagline")}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
