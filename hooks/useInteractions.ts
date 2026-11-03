"use client"

import type { InteractionAnalysis, InteractionRecord, InteractionType } from "@/types/interaction"
import {
  hydrateCollection,
  readCollection,
  subscribeCollection,
  writeCollection,
} from "@/lib/client/collection-store"
import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "yyc3_interactions"
// 服务端集合类型：互动记录整组持久化
const COLLECTION_KIND = "interaction" as const

function generateId(): string {
  return `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 模拟AI分析
async function analyzeInteraction(record: Partial<InteractionRecord>): Promise<InteractionAnalysis> {
  await new Promise((resolve) => setTimeout(resolve, 500))

  const keywords: string[] = []
  const themes: string[] = []
  const suggestions: string[] = []

  // 根据类型生成关键词和主题
  switch (record.type) {
    case "reading":
      keywords.push("阅读", "绘本", "想象力")
      themes.push("语言发展", "认知启蒙")
      suggestions.push("可以尝试让孩子复述故事情节", "鼓励孩子提出问题")
      break
    case "play":
      keywords.push("游戏", "互动", "创造力")
      themes.push("社交能力", "规则意识")
      suggestions.push("可以增加角色扮演类游戏", "适当引入合作类游戏")
      break
    case "outdoor":
      keywords.push("户外", "探索", "运动")
      themes.push("身体发育", "自然认知")
      suggestions.push("可以带孩子观察植物昆虫", "增加攀爬类活动")
      break
    case "study":
      keywords.push("学习", "专注", "思考")
      themes.push("学习习惯", "知识积累")
      suggestions.push("注意保持学习兴趣", "及时给予正向反馈")
      break
    case "art":
      keywords.push("创作", "色彩", "想象")
      themes.push("审美能力", "创造力")
      suggestions.push("多鼓励自由创作", "可以尝试不同材料")
      break
    default:
      keywords.push("亲子", "陪伴", "成长")
      themes.push("情感联结", "安全感")
      suggestions.push("保持高质量陪伴时间", "关注孩子情绪变化")
  }

  // 根据心情调整质量分数
  let qualityScore = 70
  if (record.mood === "excellent") qualityScore = 90
  else if (record.mood === "good") qualityScore = 80
  else if (record.mood === "poor") qualityScore = 50

  // 根据时长调整
  if (record.duration && record.duration >= 30) qualityScore += 5
  if (record.duration && record.duration >= 60) qualityScore += 5

  // 检测里程碑
  let milestoneDetected: string | null = null
  if (record.content?.includes("第一次") || record.content?.includes("首次")) {
    milestoneDetected = "检测到可能的成长里程碑"
  }

  return {
    keywords,
    sentiment: record.mood === "excellent" || record.mood === "good" ? "positive" : "neutral",
    themes,
    qualityScore: Math.min(100, qualityScore),
    suggestions,
    milestoneDetected,
  }
}

// 默认互动记录
function getDefaultInteractions(childId: string): InteractionRecord[] {
  const now = Date.now()
  const yesterday = now - 24 * 60 * 60 * 1000
  const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000

  return [
    {
      id: generateId(),
      childId,
      parentId: "parent_1",
      type: "reading",
      title: "一起读《小王子》",
      content: "今天和宝贝一起读了《小王子》第一章，宝贝对小王子的星球很感兴趣，问了很多问题。",
      mediaUrls: [],
      duration: 30,
      participants: ["妈妈", "宝贝"],
      location: "家里客厅",
      mood: "excellent",
      aiAnalysis: {
        keywords: ["阅读", "绘本", "好奇心"],
        sentiment: "positive",
        themes: ["语言发展", "想象力"],
        qualityScore: 92,
        suggestions: ["可以尝试让孩子复述故事", "画出印象最深的场景"],
        milestoneDetected: null,
      },
      tags: ["亲子阅读", "经典绘本"],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      childId,
      parentId: "parent_1",
      type: "outdoor",
      title: "公园骑自行车",
      content: "周末带宝贝去公园骑自行车，这是他第一次完全不用辅助轮骑行！",
      mediaUrls: [],
      duration: 60,
      participants: ["爸爸", "宝贝"],
      location: "中央公园",
      mood: "excellent",
      aiAnalysis: {
        keywords: ["户外", "骑行", "成就感"],
        sentiment: "positive",
        themes: ["运动能力", "自信心"],
        qualityScore: 95,
        suggestions: ["继续鼓励户外运动", "可以尝试更长距离骑行"],
        milestoneDetected: "检测到成长里程碑：第一次独立骑行",
      },
      tags: ["户外运动", "里程碑"],
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: generateId(),
      childId,
      parentId: "parent_1",
      type: "art",
      title: "手工制作母亲节贺卡",
      content: "宝贝用彩纸和水彩笔制作了一张母亲节贺卡，上面画了妈妈和自己手牵手。",
      mediaUrls: [],
      duration: 45,
      participants: ["妈妈", "宝贝"],
      location: "家里书房",
      mood: "good",
      aiAnalysis: {
        keywords: ["手工", "创作", "感恩"],
        sentiment: "positive",
        themes: ["创造力", "情感表达"],
        qualityScore: 88,
        suggestions: ["可以收藏孩子的作品", "鼓励更多手工创作"],
        milestoneDetected: null,
      },
      tags: ["手工", "节日"],
      createdAt: twoDaysAgo,
      updatedAt: twoDaysAgo,
    },
  ]
}

export function useInteractions() {
  const [interactions, setInteractions] = useState<InteractionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 加载数据
  useEffect(() => {
    const loadData = () => {
      try {
        const stored = readCollection<InteractionRecord & { createdAt: string; updatedAt: string }>(
          COLLECTION_KIND,
          STORAGE_KEY,
        )

        if (stored && stored.length > 0) {
          setInteractions(
            stored.map((r) => ({
              ...r,
              createdAt: new Date(r.createdAt).getTime(),
              updatedAt: new Date(r.updatedAt).getTime(),
            })),
          )
        } else if (stored && stored.length === 0) {
          setInteractions([])
        } else {
          // 默认示例仅作空态展示，不写入持久层
          setInteractions(getDefaultInteractions("default"))
        }
      } catch (error) {
        console.error("加载互动记录失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
    const unsubscribe = subscribeCollection(COLLECTION_KIND, loadData)
    void hydrateCollection(COLLECTION_KIND, STORAGE_KEY)
    return unsubscribe
  }, [])

  // 保存数据
  const saveData = useCallback((data: InteractionRecord[]) => {
    writeCollection(COLLECTION_KIND, STORAGE_KEY, data)
  }, [])

  // 添加互动记录
  const addInteraction = useCallback(
    async (data: Omit<InteractionRecord, "id" | "aiAnalysis" | "createdAt" | "updatedAt">) => {
      const aiAnalysis = await analyzeInteraction(data)

      const newRecord: InteractionRecord = {
        ...data,
        id: generateId(),
        aiAnalysis,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      setInteractions((prev) => {
        const updated = [newRecord, ...prev]
        saveData(updated)
        return updated
      })

      return newRecord
    },
    [saveData],
  )

  // 更新互动记录
  const updateInteraction = useCallback(
    async (id: string, data: Partial<InteractionRecord>) => {
      const aiAnalysis = await analyzeInteraction(data)

      setInteractions((prev) => {
        const updated = prev.map((r) => (r.id === id ? { ...r, ...data, aiAnalysis, updatedAt: Date.now() } : r))
        saveData(updated)
        return updated
      })
    },
    [saveData],
  )

  // 删除互动记录
  const deleteInteraction = useCallback(
    (id: string) => {
      setInteractions((prev) => {
        const updated = prev.filter((r) => r.id !== id)
        saveData(updated)
        return updated
      })
    },
    [saveData],
  )

  // 按类型筛选
  const getByType = useCallback(
    (type: InteractionType) => {
      return interactions.filter((r) => r.type === type)
    },
    [interactions],
  )

  // 按日期范围筛选
  const getByDateRange = useCallback(
    (start: Date, end: Date) => {
      return interactions.filter((r) => {
        const date = new Date(r.createdAt)
        return date >= start && date <= end
      })
    },
    [interactions],
  )

  // 统计数据
  const stats = {
    totalRecords: interactions.length,
    totalDuration: interactions.reduce((sum, r) => sum + r.duration, 0),
    averageQuality:
      interactions.length > 0
        ? Math.round(
          interactions.filter((r) => r.aiAnalysis).reduce((sum, r) => sum + (r.aiAnalysis?.qualityScore || 0), 0) /
          interactions.filter((r) => r.aiAnalysis).length,
        )
        : 0,
    typeDistribution: Object.fromEntries(
      (
        ["play", "study", "outdoor", "reading", "art", "music", "sports", "conversation", "other"] as InteractionType[]
      ).map((type) => [type, interactions.filter((r) => r.type === type).length]),
    ),
    thisWeekRecords: interactions.filter((r) => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(r.createdAt) >= weekAgo
    }).length,
  }

  return {
    interactions,
    isLoading,
    stats,
    addInteraction,
    updateInteraction,
    deleteInteraction,
    getByType,
    getByDateRange,
  }
}
