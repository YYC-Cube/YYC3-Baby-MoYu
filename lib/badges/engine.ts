/**
 * @fileoverview 徽章评估引擎
 * @description 从真实 API 数据聚合行为统计 → 逐枚评估进度与解锁；解锁状态本地持久化
 */

import type { BadgeProgress, BadgeStats } from "@/types/badges"
import { BADGE_DEFINITIONS, BADGE_LEVELS } from "./definitions"

// —— 原始行类型（与 API 返回对齐，字段宽松兼容）——
export interface RawGrowthRecord {
  type?: string
  tags?: unknown
  ai_analysis?: string | null
  recorded_at?: string
}

export interface RawHomework {
  status?: string
}

export interface RawChild {
  id?: string
}

/** 周标识（ISO 周） */
function weekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${week}`
}

/** 从原始记录聚合行为统计（纯函数，可单测） */
export function computeStats(
  records: RawGrowthRecord[],
  homework: RawHomework[] = [],
  children: RawChild[] = []
): BadgeStats {
  const recordsByType: Record<string, number> = {}
  const tagSet = new Set<string>()
  const dates: string[] = []
  let aiAnalysisCount = 0

  for (const r of records) {
    if (r.type) recordsByType[r.type] = (recordsByType[r.type] ?? 0) + 1
    if (Array.isArray(r.tags)) {
      for (const t of r.tags) if (typeof t === "string" && t) tagSet.add(t)
    }
    if (r.ai_analysis && String(r.ai_analysis).trim().length > 0) aiAnalysisCount++
    if (r.recorded_at) dates.push(r.recorded_at)
  }

  const completedHomework = homework.filter((h) => h.status === "completed").length

  // 连续天数：按日去重排序后数最长连续段
  const daySet = new Set(dates.map((d) => d.slice(0, 10)))
  const sortedDays = [...daySet].sort()
  let streakDays = 0
  let best = 0
  let prev: number | null = null
  for (const day of sortedDays) {
    const t = new Date(day + "T00:00:00Z").getTime()
    if (prev !== null && t - prev === 86400000) streakDays++
    else streakDays = 1
    best = Math.max(best, streakDays)
    prev = t
  }
  streakDays = best

  const activeWeeks = new Set(dates.map((d) => weekKey(new Date(d)))).size

  let daysSinceFirstRecord = 0
  if (sortedDays.length > 0) {
    daysSinceFirstRecord = Math.floor(
      (Date.now() - new Date(sortedDays[0] + "T00:00:00Z").getTime()) / 86400000
    )
  }

  return {
    totalRecords: records.length,
    recordsByType: recordsByType,
    milestones: recordsByType.milestone ?? 0,
    completedHomework,
    distinctTags: tagSet.size,
    aiAnalysisCount,
    streakDays,
    activeWeeks,
    childCount: children.filter((c) => c?.id).length,
    daysSinceFirstRecord,
  }
}

// —— 本地持久化（已解锁徽章与解锁时间）——
const STORAGE_KEY = "yyc3_badge_unlocks_v1"

export function loadUnlockedMap(): Record<string, string> {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Record<string, string>
  } catch {
    return {}
  }
}

export function saveUnlockedMap(map: Record<string, string>): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // 隐私模式等场景静默降级
  }
}

/** 全量评估：返回每枚徽章的进度/解锁态，并回写新解锁项 */
export function evaluateAll(
  stats: BadgeStats,
  unlockedMap: Record<string, string>
): { badges: BadgeProgress[]; newUnlocks: BadgeProgress[]; totalPoints: number } {
  // 先算一遍拿点数（百分徽章依赖）
  const preliminary = BADGE_DEFINITIONS.map((def) => {
    const progress = def.evaluate(stats)
    return { def, progress }
  })
  const pointsOf = (unlockedIds: Set<string>) =>
    preliminary.reduce((sum, { def }) => (unlockedIds.has(def.id) ? sum + BADGE_LEVELS[def.level].points : sum), 0)

  const now = new Date().toISOString()
  const badges: BadgeProgress[] = []
  const newUnlocks: BadgeProgress[] = []
  const updatedMap = { ...unlockedMap }

  for (const { def, progress } of preliminary) {
    let pct = progress
    // 百分成就徽章：按点数实时计算
    if (def.id === "balanced-100") {
      const ids = new Set(Object.keys(unlockedMap))
      // 排除自身避免自引用
      ids.delete("balanced-100")
      const pts = pointsOf(ids)
      pct = Math.min(100, Math.round((pts / 100) * 100))
    }

    const unlocked = pct !== null && pct >= 100
    const wasUnlocked = Boolean(unlockedMap[def.id])

    if (unlocked && !wasUnlocked) {
      updatedMap[def.id] = now
    }

    badges.push({
      definition: def,
      progress: pct ?? 0,
      unlocked,
      unlockedAt: unlocked ? unlockedMap[def.id] ?? (updatedMap[def.id] === now ? now : undefined) : undefined,
      isNew: unlocked && !wasUnlocked,
    })
    if (unlocked && !wasUnlocked) newUnlocks.push(badges[badges.length - 1])
  }

  const finalIds = new Set(badges.filter((b) => b.unlocked).map((b) => b.definition.id))
  return {
    badges,
    newUnlocks,
    totalPoints: pointsOf(finalIds),
  }
}
