"use client"

import { type Schedule, type ScheduleFormData, type ScheduleType, getScheduleColor } from "@/types/schedule"
import {
  hydrateCollection,
  readCollection,
  subscribeCollection,
  writeCollection,
} from "@/lib/client/collection-store"
import { useCallback, useEffect, useState } from "react"

interface UseScheduleReturn {
  schedules: Schedule[]
  isLoading: boolean
  error: string | null
  addSchedule: (data: ScheduleFormData, childId: string) => Promise<Schedule>
  updateSchedule: (id: string, data: Partial<ScheduleFormData>) => Promise<Schedule>
  deleteSchedule: (id: string) => Promise<void>
  toggleComplete: (id: string) => Promise<void>
  getSchedulesByDate: (date: Date) => Schedule[]
  getSchedulesByDateRange: (start: Date, end: Date) => Schedule[]
  generateAISchedule: (childId: string, preferences: AISchedulePreferences) => Promise<Schedule[]>
}

interface AISchedulePreferences {
  wakeUpTime: string
  sleepTime: string
  studyFocus: string[]
  breakFrequency: number
}

const STORAGE_KEY = "yyc3-schedules"
// 服务端集合类型（见 /api/user-documents）：登录后以服务端为准，游客保留本地
const COLLECTION_KIND = "schedule" as const

function loadSchedules(): Schedule[] {
  if (typeof window === "undefined") return []
  const cached = readCollection<
    Omit<Schedule, "startTime" | "endTime" | "createdAt" | "updatedAt"> & Record<string, string>
  >(COLLECTION_KIND, STORAGE_KEY)
  if (cached && cached.length > 0) {
    return cached.map((s) => ({
      ...s,
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    }))
  }
  // 有缓存但为空数组：用户已清空，尊重空集合，不再塞默认值
  if (cached && cached.length === 0) return []
  return generateDefaultSchedules()
}

function generateDefaultSchedules(): Schedule[] {
  const today = new Date()
  const baseSchedules: Partial<Schedule>[] = [
    { title: "起床洗漱", type: "rest", startTime: setTime(today, 7, 0), endTime: setTime(today, 7, 30) },
    { title: "早餐时间", type: "meal", startTime: setTime(today, 7, 30), endTime: setTime(today, 8, 0) },
    { title: "晨读时光", type: "study", startTime: setTime(today, 8, 0), endTime: setTime(today, 8, 30) },
    { title: "上午课程", type: "class", startTime: setTime(today, 8, 30), endTime: setTime(today, 11, 30) },
    { title: "午餐休息", type: "meal", startTime: setTime(today, 11, 30), endTime: setTime(today, 13, 0) },
    { title: "午休时间", type: "sleep", startTime: setTime(today, 13, 0), endTime: setTime(today, 14, 0) },
    { title: "下午课程", type: "class", startTime: setTime(today, 14, 0), endTime: setTime(today, 16, 30) },
    { title: "户外运动", type: "exercise", startTime: setTime(today, 16, 30), endTime: setTime(today, 17, 30) },
    { title: "晚餐时间", type: "meal", startTime: setTime(today, 17, 30), endTime: setTime(today, 18, 30) },
    { title: "作业时间", type: "homework", startTime: setTime(today, 19, 0), endTime: setTime(today, 20, 30) },
    { title: "自由玩耍", type: "play", startTime: setTime(today, 20, 30), endTime: setTime(today, 21, 0) },
    { title: "睡前准备", type: "rest", startTime: setTime(today, 21, 0), endTime: setTime(today, 21, 30) },
  ]

  return baseSchedules.map((s, index) => ({
    id: `default-${index}`,
    childId: "default",
    title: s.title!,
    type: s.type as ScheduleType,
    startTime: s.startTime!,
    endTime: s.endTime!,
    aiGenerated: true,
    completed: false,
    color: getScheduleColor(s.type as ScheduleType),
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}

function saveSchedules(schedules: Schedule[]): void {
  if (typeof window === "undefined") return
  // 本地缓存即时写入 + 服务端防抖同步（游客自动降级为仅本地）
  writeCollection(COLLECTION_KIND, STORAGE_KEY, schedules)
}

export function useSchedule(): UseScheduleReturn {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const apply = () => {
      setSchedules(loadSchedules())
      setIsLoading(false)
    }
    apply()
    // 服务端就绪后刷新一次（游客会保持本地副本）
    const unsubscribe = subscribeCollection(COLLECTION_KIND, apply)
    void hydrateCollection(COLLECTION_KIND, STORAGE_KEY)
    return unsubscribe
  }, [])

  // 异步契约：保持 async 签名供调用方统一 await（内部同步持久化）
  // eslint-disable-next-line @typescript-eslint/require-await
  const addSchedule = useCallback(async (data: ScheduleFormData, childId: string): Promise<Schedule> => {
    const newSchedule: Schedule = {
      id: `schedule-${Date.now()}`,
      childId,
      title: data.title,
      description: data.description,
      type: data.type,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      repeat: data.repeat,
      reminder: data.reminder,
      aiGenerated: false,
      completed: false,
      color: data.color || getScheduleColor(data.type),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setSchedules((prev) => {
      const updated = [...prev, newSchedule]
      saveSchedules(updated)
      return updated
    })

    return newSchedule
  }, [])

  // 异步契约：保持 async 签名供调用方统一 await（内部同步持久化）
  // eslint-disable-next-line @typescript-eslint/require-await
  const updateSchedule = useCallback(async (id: string, data: Partial<ScheduleFormData>): Promise<Schedule> => {
    let updatedSchedule: Schedule | null = null

    setSchedules((prev) => {
      const updated = prev.map((s) => {
        if (s.id === id) {
          updatedSchedule = {
            ...s,
            ...data,
            startTime: data.startTime ? new Date(data.startTime) : s.startTime,
            endTime: data.endTime ? new Date(data.endTime) : s.endTime,
            color: data.color || (data.type ? getScheduleColor(data.type) : s.color),
            updatedAt: new Date(),
          }
          return updatedSchedule
        }
        return s
      })
      saveSchedules(updated)
      return updated
    })

    if (!updatedSchedule) {
      throw new Error("日程不存在")
    }

    return updatedSchedule
  }, [])

  // 异步契约：保持 async 签名供调用方统一 await（内部同步持久化）
  // eslint-disable-next-line @typescript-eslint/require-await
  const deleteSchedule = useCallback(async (id: string): Promise<void> => {
    setSchedules((prev) => {
      const updated = prev.filter((s) => s.id !== id)
      saveSchedules(updated)
      return updated
    })
  }, [])

  // 异步契约：保持 async 签名供调用方统一 await（内部同步持久化）
  // eslint-disable-next-line @typescript-eslint/require-await
  const toggleComplete = useCallback(async (id: string): Promise<void> => {
    setSchedules((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, completed: !s.completed, updatedAt: new Date() } : s))
      saveSchedules(updated)
      return updated
    })
  }, [])

  const getSchedulesByDate = useCallback(
    (date: Date): Schedule[] => {
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)

      return schedules.filter((s) => {
        const scheduleDate = new Date(s.startTime)
        scheduleDate.setHours(0, 0, 0, 0)
        return scheduleDate.getTime() === targetDate.getTime()
      })
    },
    [schedules],
  )

  const getSchedulesByDateRange = useCallback(
    (start: Date, end: Date): Schedule[] => {
      const startTime = new Date(start).setHours(0, 0, 0, 0)
      const endTime = new Date(end).setHours(23, 59, 59, 999)

      return schedules.filter((s) => {
        const scheduleTime = new Date(s.startTime).getTime()
        return scheduleTime >= startTime && scheduleTime <= endTime
      })
    },
    [schedules],
  )

  // 异步契约：保持 async 签名供调用方统一 await（内部同步生成日程）
  const generateAISchedule = useCallback(
    // eslint-disable-next-line @typescript-eslint/require-await -- 异步契约说明见上
    async (childId: string, preferences: AISchedulePreferences): Promise<Schedule[]> => {
      setIsLoading(true)
      setError(null)

      try {
        const today = new Date()
        const [wakeHour, wakeMin] = preferences.wakeUpTime.split(":").map(Number)
        const [sleepHour, sleepMin] = preferences.sleepTime.split(":").map(Number)

        const generatedSchedules: Schedule[] = []
        let currentTime = setTime(today, wakeHour, wakeMin)
        const endOfDay = setTime(today, sleepHour, sleepMin)

        generatedSchedules.push({
          id: `ai-${Date.now()}-wake`,
          childId,
          title: "起床洗漱",
          type: "rest",
          startTime: new Date(currentTime),
          endTime: new Date(currentTime.getTime() + 30 * 60 * 1000),
          aiGenerated: true,
          completed: false,
          color: getScheduleColor("rest"),
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000)

        generatedSchedules.push({
          id: `ai-${Date.now()}-breakfast`,
          childId,
          title: "早餐时间",
          type: "meal",
          startTime: new Date(currentTime),
          endTime: new Date(currentTime.getTime() + 30 * 60 * 1000),
          aiGenerated: true,
          completed: false,
          color: getScheduleColor("meal"),
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000)

        let studyCount = 0
        const maxStudySessions = 4

        while (currentTime < endOfDay && studyCount < maxStudySessions) {
          const focusArea = preferences.studyFocus[studyCount % preferences.studyFocus.length] || "学习"

          generatedSchedules.push({
            id: `ai-${Date.now()}-study-${studyCount}`,
            childId,
            title: `${focusArea}时间`,
            type: "study",
            startTime: new Date(currentTime),
            endTime: new Date(currentTime.getTime() + 45 * 60 * 1000),
            aiGenerated: true,
            completed: false,
            color: getScheduleColor("study"),
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          currentTime = new Date(currentTime.getTime() + 45 * 60 * 1000)

          generatedSchedules.push({
            id: `ai-${Date.now()}-break-${studyCount}`,
            childId,
            title: "休息放松",
            type: "rest",
            startTime: new Date(currentTime),
            endTime: new Date(currentTime.getTime() + preferences.breakFrequency * 60 * 1000),
            aiGenerated: true,
            completed: false,
            color: getScheduleColor("rest"),
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          currentTime = new Date(currentTime.getTime() + preferences.breakFrequency * 60 * 1000)
          studyCount++

          if (
            currentTime.getHours() === 12 &&
            generatedSchedules.every((s) => s.type !== "meal" || s.title === "早餐时间")
          ) {
            generatedSchedules.push({
              id: `ai-${Date.now()}-lunch`,
              childId,
              title: "午餐时间",
              type: "meal",
              startTime: new Date(currentTime),
              endTime: new Date(currentTime.getTime() + 60 * 60 * 1000),
              aiGenerated: true,
              completed: false,
              color: getScheduleColor("meal"),
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000)

            generatedSchedules.push({
              id: `ai-${Date.now()}-nap`,
              childId,
              title: "午休时间",
              type: "sleep",
              startTime: new Date(currentTime),
              endTime: new Date(currentTime.getTime() + 60 * 60 * 1000),
              aiGenerated: true,
              completed: false,
              color: getScheduleColor("sleep"),
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000)
          }
        }

        generatedSchedules.push({
          id: `ai-${Date.now()}-exercise`,
          childId,
          title: "户外运动",
          type: "exercise",
          startTime: new Date(currentTime),
          endTime: new Date(currentTime.getTime() + 60 * 60 * 1000),
          aiGenerated: true,
          completed: false,
          color: getScheduleColor("exercise"),
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000)

        generatedSchedules.push({
          id: `ai-${Date.now()}-dinner`,
          childId,
          title: "晚餐时间",
          type: "meal",
          startTime: new Date(currentTime),
          endTime: new Date(currentTime.getTime() + 60 * 60 * 1000),
          aiGenerated: true,
          completed: false,
          color: getScheduleColor("meal"),
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        currentTime = new Date(currentTime.getTime() + 60 * 60 * 1000)

        generatedSchedules.push({
          id: `ai-${Date.now()}-play`,
          childId,
          title: "自由玩耍",
          type: "play",
          startTime: new Date(currentTime),
          endTime: new Date(endOfDay.getTime() - 30 * 60 * 1000),
          aiGenerated: true,
          completed: false,
          color: getScheduleColor("play"),
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        generatedSchedules.push({
          id: `ai-${Date.now()}-sleep-prep`,
          childId,
          title: "睡前准备",
          type: "rest",
          startTime: new Date(endOfDay.getTime() - 30 * 60 * 1000),
          endTime: endOfDay,
          aiGenerated: true,
          completed: false,
          color: getScheduleColor("rest"),
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        setSchedules((prev) => {
          const nonAiSchedules = prev.filter((s) => !s.aiGenerated)
          const updated = [...nonAiSchedules, ...generatedSchedules]
          saveSchedules(updated)
          return updated
        })

        return generatedSchedules
      } catch (err) {
        setError("AI日程生成失败")
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return {
    schedules,
    isLoading,
    error,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    toggleComplete,
    getSchedulesByDate,
    getSchedulesByDateRange,
    generateAISchedule,
  }
}
