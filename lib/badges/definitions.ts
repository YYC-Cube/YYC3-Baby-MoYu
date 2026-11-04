/**
 * @fileoverview 徽章定义库 —— 30 枚体系化勋章
 * @description 按 8 大分类 × 4 等级组织，全部基于真实行为数据可评估
 */

import type { BadgeDefinition, BadgeLevel, BadgeLevelMeta, BadgeStats } from "@/types/badges"

export const BADGE_LEVELS: Record<BadgeLevel, BadgeLevelMeta> = {
  bronze: { label: "铜牌", icon: "🥉", points: 10, bg: "from-amber-100 to-orange-100", border: "border-amber-300", text: "text-amber-700", shadow: "shadow-amber-200" },
  silver: { label: "银牌", icon: "🥈", points: 30, bg: "from-slate-100 to-gray-100", border: "border-slate-300", text: "text-slate-700", shadow: "shadow-slate-200" },
  gold: { label: "金牌", icon: "🥇", points: 80, bg: "from-yellow-100 to-amber-100", border: "border-yellow-300", text: "text-yellow-700", shadow: "shadow-yellow-200" },
  platinum: { label: "钻石", icon: "💎", points: 200, bg: "from-purple-50 to-pink-50", border: "border-purple-300", text: "text-purple-700", shadow: "shadow-purple-200" },
}

/** 生成计数型条件徽章的通用工厂 */
function countBadge(
  id: string,
  title: string,
  description: string,
  icon: string,
  level: BadgeLevel,
  category: BadgeDefinition["category"],
  get: (s: BadgeStats) => number,
  goal: number
): BadgeDefinition {
  return {
    id,
    title,
    description,
    icon,
    level,
    category,
    evaluate: (s) => Math.min(100, Math.round((get(s) / goal) * 100)),
    conditions: (s) => {
      const cur = get(s)
      return [`${description}（当前 ${Math.min(cur, goal)}/${goal}）`]
    },
    titleKey: `badgeDefs.${id}.title`,
    descriptionKey: `badgeDefs.${id}.description`,
    progressGoal: goal,
  }
}

/** 连续/综合型徽章：evaluate 返回 null 表示由 unlockWhen 判定 */
function compoundBadge(
  id: string,
  title: string,
  description: string,
  icon: string,
  level: BadgeLevel,
  category: BadgeDefinition["category"],
  unlockWhen: (s: Parameters<BadgeDefinition["evaluate"]>[0]) => boolean,
  conditions: string[],
  condKeys: string[]
): BadgeDefinition {
  return {
    id,
    title,
    description,
    icon,
    level,
    category,
    evaluate: (s) => (unlockWhen(s) ? 100 : null),
    conditions: () => conditions,
    titleKey: `badgeDefs.${id}.title`,
    descriptionKey: `badgeDefs.${id}.description`,
    condKeys,
  }
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ===== 成长记录 =====
  countBadge("record-first", "初试啼声", "完成第 1 条成长记录", "🌱", "bronze", "成长记录", (s) => s.totalRecords, 1),
  countBadge("record-10", "用心记录者", "累计 10 条成长记录", "📖", "bronze", "成长记录", (s) => s.totalRecords, 10),
  countBadge("record-50", "成长档案馆", "累计 50 条成长记录", "📚", "silver", "成长记录", (s) => s.totalRecords, 50),
  countBadge("record-100", "百年纪念册", "累计 100 条成长记录", "🏛️", "gold", "成长记录", (s) => s.totalRecords, 100),
  countBadge("record-200", "时光收藏家", "累计 200 条成长记录", "⏳", "platinum", "成长记录", (s) => s.totalRecords, 200),

  // ===== 观察记录 =====
  countBadge("observe-5", "好奇目光", "完成 5 条观察日志", "👀", "bronze", "观察记录", (s) => s.recordsByType.observation ?? 0, 5),
  countBadge("observe-20", "敏锐观察家", "完成 20 条观察日志", "🔭", "silver", "观察记录", (s) => s.recordsByType.observation ?? 0, 20),
  countBadge("observe-50", "儿童行为学家", "完成 50 条观察日志", "🔬", "gold", "观察记录", (s) => s.recordsByType.observation ?? 0, 50),

  // ===== 情绪记录 =====
  countBadge("emotion-10", "情绪捕手", "记录 10 次情绪变化", "💭", "bronze", "情绪记录", (s) => s.recordsByType.emotion ?? 0, 10),
  countBadge("emotion-30", "心灵读译者", "记录 30 次情绪变化", "🌈", "silver", "情绪记录", (s) => s.recordsByType.emotion ?? 0, 30),
  countBadge("emotion-60", "共情大师", "记录 60 次情绪变化", "💗", "gold", "情绪记录", (s) => s.recordsByType.emotion ?? 0, 60),

  // ===== 学习成长 =====
  countBadge("learning-10", "求知若渴", "记录 10 条学习成长", "✏️", "bronze", "学习成长", (s) => s.recordsByType.learning ?? 0, 10),
  countBadge("learning-30", "学海拾贝", "记录 30 条学习成长", "🎓", "silver", "学习成长", (s) => s.recordsByType.learning ?? 0, 30),

  // ===== 里程碑 =====
  countBadge("milestone-3", "第一个脚印", "解锁 3 个成长里程碑", "👣", "bronze", "里程碑", (s) => s.milestones, 3),
  countBadge("milestone-10", "里程碑达人", "解锁 10 个成长里程碑", "🏆", "silver", "里程碑", (s) => s.milestones, 10),
  countBadge("milestone-25", "成长领航员", "解锁 25 个成长里程碑", "🚀", "gold", "里程碑", (s) => s.milestones, 25),

  // ===== 作业任务 =====
  countBadge("homework-5", "作业启航", "完成 5 次作业任务", "📗", "bronze", "作业任务", (s) => s.completedHomework, 5),
  countBadge("homework-20", "学霸养成中", "完成 20 次作业任务", "📚", "silver", "作业任务", (s) => s.completedHomework, 20),
  countBadge("homework-50", "作业终结者", "完成 50 次作业任务", "🥇", "gold", "作业任务", (s) => s.completedHomework, 50),

  // ===== 坚持陪伴 =====
  countBadge("streak-7", "七日之约", "连续 7 天记录", "🔥", "bronze", "坚持陪伴", (s) => s.streakDays, 7),
  countBadge("streak-30", "陪伴之星", "连续 30 天记录", "🌟", "gold", "坚持陪伴", (s) => s.streakDays, 30),
  countBadge("weeks-8", "双月耕耘", "8 个不同周都有记录", "📅", "silver", "坚持陪伴", (s) => s.activeWeeks, 8),
  countBadge("anniversary-365", "一周年之礼", "首次记录满一周年", "🎂", "platinum", "坚持陪伴", (s) => s.daysSinceFirstRecord, 365),

  // ===== 综合成就（复合条件）=====
  compoundBadge(
    "all-types", "全景记录者", "四种记录类型全部使用过", "🧩", "silver", "综合成就",
    (s) => (["milestone", "observation", "emotion", "learning"] as const).every((t) => (s.recordsByType[t] ?? 0) > 0),
    ["完成里程碑记录", "完成观察记录", "完成情绪记录", "完成学习记录"],
    ["badgeConds.all-types.c1", "badgeConds.all-types.c2", "badgeConds.all-types.c3", "badgeConds.all-types.c4"]
  ),
  compoundBadge(
    "ai-analysis-10", "AI 智囊团", "10 条记录获得 AI 分析", "🤖", "bronze", "综合成就",
    (s) => s.aiAnalysisCount >= 10,
    ["累计 10 条记录包含 AI 分析（当前按数据自动统计）"],
    ["badgeConds.ai-analysis-10.c1"]
  ),
  compoundBadge(
    "ai-analysis-50", "智慧同行者", "50 条记录获得 AI 分析", "🧠", "gold", "综合成就",
    (s) => s.aiAnalysisCount >= 50,
    ["累计 50 条记录包含 AI 分析"],
    ["badgeConds.ai-analysis-50.c1"]
  ),
  countBadge("tags-15", "标签收藏家", "使用 15 个不同标签", "🏷️", "silver", "综合成就", (s) => s.distinctTags, 15),
  compoundBadge(
    "multi-child", "多宝家庭", "同时守护 2 个以上宝宝档案", "👨‍👩‍👧‍👦", "gold", "综合成就",
    (s) => s.childCount >= 2,
    ["建立至少 2 个宝宝档案"],
    ["badgeConds.multi-child.c1"]
  ),
  compoundBadge(
    "renaissance", "全能守护者", "记录、观察、情绪、作业、AI 全面开花", "👑", "platinum", "综合成就",
    (s) => s.totalRecords >= 30 && (s.recordsByType.observation ?? 0) >= 5 && (s.recordsByType.emotion ?? 0) >= 5 && s.completedHomework >= 5 && s.aiAnalysisCount >= 10,
    ["累计 30 条记录", "观察与情绪记录各 5 条", "完成 5 次作业", "10 条 AI 分析"],
    ["badgeConds.renaissance.c1", "badgeConds.renaissance.c2", "badgeConds.renaissance.c3", "badgeConds.renaissance.c4"]
  ),
  compoundBadge(
    "balanced-100", "百分守护", "成就点数达到 100", "💯", "gold", "综合成就",
    () => false, // 由引擎按点数动态判定（此处仅占位展示）
    ["累计成就点数达到 100（自动累计）"],
    ["badgeConds.balanced-100.c1"]
  ),
]

export const BADGE_COUNT = BADGE_DEFINITIONS.length

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id)
}
