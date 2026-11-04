/**
 * @fileoverview 徽章系统类型定义
 * @description 勋章等级、分类、定义与评估结果
 */

export type BadgeLevel = "bronze" | "silver" | "gold" | "platinum"

export type BadgeCategory =
  | "成长记录"
  | "观察记录"
  | "情绪记录"
  | "学习成长"
  | "里程碑"
  | "作业任务"
  | "坚持陪伴"
  | "综合成就"

// 徽章等级元数据（展示用）
export interface BadgeLevelMeta {
  label: string
  icon: string
  points: number // 成就点数
  bg: string
  border: string
  text: string
  shadow: string
}

// 评估所依赖的用户行为统计（由真实 API 数据聚合）
export interface BadgeStats {
  totalRecords: number
  recordsByType: Record<"milestone" | "observation" | "emotion" | "learning", number>
  milestones: number
  completedHomework: number
  distinctTags: number
  aiAnalysisCount: number
  streakDays: number // 最长连续记录天数
  activeWeeks: number // 有记录的不同周数
  childCount: number
  daysSinceFirstRecord: number
}

// 单个徽章的机器可评估定义
export interface BadgeDefinition {
  id: string
  title: string
  description: string
  icon: string
  level: BadgeLevel
  category: BadgeCategory
  /** 返回 0~100 进度；null 表示无法评估（条件为复合型） */
  evaluate: (stats: BadgeStats) => number | null
  /** 展示用的条件说明（可含动态进度文案） */
  conditions: (stats: BadgeStats) => string[]
  /** i18n：词条键（badgeDefs.<id>.title / .description），UI 优先走词条渲染 */
  titleKey?: string
  descriptionKey?: string
  /** i18n：复合型徽章的固定条件词条键列表（badgeConds.<id>.c1..cn） */
  condKeys?: string[]
  /** i18n：计数型徽章的目标值（配合 condProgress 模板渲染动态进度） */
  progressGoal?: number
}

// 评估结果
export interface BadgeProgress {
  definition: BadgeDefinition
  progress: number // 0~100
  unlocked: boolean
  unlockedAt?: string // ISO 时间（来自本地持久化）
  isNew?: boolean // 本次会话新解锁
}
