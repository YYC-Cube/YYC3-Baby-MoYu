/**
 * @fileoverview 徽章评估引擎单元测试
 */

import { describe, it, expect, afterAll } from "bun:test"
import { computeStats, evaluateAll, loadUnlockedMap, saveUnlockedMap, RawGrowthRecord } from "@/lib/badges/engine"
import { BADGE_DEFINITIONS, BADGE_LEVELS, getBadgeById } from "@/lib/badges/definitions"

function makeRecord(partial: Partial<RawGrowthRecord> = {}): RawGrowthRecord {
  return {
    type: "observation",
    tags: [],
    ai_analysis: null,
    recorded_at: new Date().toISOString(),
    ...partial,
  }
}

describe("computeStats", () => {
  it("空数据返回全零统计", () => {
    const s = computeStats([], [], [])
    expect(s.totalRecords).toBe(0)
    expect(s.streakDays).toBe(0)
    expect(s.completedHomework).toBe(0)
    expect(s.distinctTags).toBe(0)
  })

  it("按类型正确聚合计数", () => {
    const records = [
      makeRecord({ type: "milestone" }),
      makeRecord({ type: "milestone" }),
      makeRecord({ type: "emotion" }),
      makeRecord({ type: "learning" }),
    ]
    const s = computeStats(records, [], [])
    expect(s.totalRecords).toBe(4)
    expect(s.milestones).toBe(2)
    expect(s.recordsByType.emotion).toBe(1)
    expect(s.recordsByType.learning).toBe(1)
  })

  it("标签去重统计", () => {
    const records = [
      makeRecord({ tags: ["学习", "独立"] }),
      makeRecord({ tags: ["学习"] }),
      makeRecord({ tags: undefined }),
    ]
    expect(computeStats(records, [], []).distinctTags).toBe(2)
  })

  it("AI 分析计数只统计非空", () => {
    const records = [
      makeRecord({ ai_analysis: "这是一条分析" }),
      makeRecord({ ai_analysis: "" }),
      makeRecord({ ai_analysis: null }),
    ]
    expect(computeStats(records, [], []).aiAnalysisCount).toBe(1)
  })

  it("完成作业计数只统计 completed 状态", () => {
    const homework = [{ status: "completed" }, { status: "pending" }, { status: "completed" }, {}]
    expect(computeStats([], homework, []).completedHomework).toBe(2)
  })

  it("连续天数取最长连续段", () => {
    const day = (offset: number) => {
      const d = new Date(Date.now() - offset * 86400000)
      return d.toISOString().slice(0, 10)
    }
    // 今天、昨天连续；3 天前断开
    const records = [makeRecord({ recorded_at: day(0) }), makeRecord({ recorded_at: day(1) }), makeRecord({ recorded_at: day(3) })]
    expect(computeStats(records, [], []).streakDays).toBe(2)
  })

  it("活跃周数跨周去重", () => {
    const d1 = "2026-08-10T10:00:00.000Z" // 周一
    const d2 = "2026-08-11T10:00:00.000Z" // 周二（同周）
    const d3 = "2026-08-18T10:00:00.000Z" // 下周一
    const s = computeStats([makeRecord({ recorded_at: d1 }), makeRecord({ recorded_at: d2 }), makeRecord({ recorded_at: d3 })], [], [])
    expect(s.activeWeeks).toBe(2)
  })

  it("多宝宝档案计数", () => {
    expect(computeStats([], [], [{ id: "a" }, { id: "b" }, {}]).childCount).toBe(2)
  })
})

describe("evaluateAll", () => {
  it("零数据时无任何解锁", () => {
    const s = computeStats([], [], [])
    const { badges, totalPoints } = evaluateAll(s, {})
    expect(badges.filter((b) => b.unlocked)).toHaveLength(0)
    expect(totalPoints).toBe(0)
  })

  it("1 条记录即解锁首枚铜牌", () => {
    const { badges } = evaluateAll(computeStats([makeRecord()], [], []), {})
    const first = badges.find((b) => b.definition.id === "record-first")
    expect(first?.progress).toBe(100)
    expect(first?.unlocked).toBe(true)
  })

  it("进度按目标比例计算", () => {
    const records = Array.from({ length: 5 }, () => makeRecord())
    const { badges } = evaluateAll(computeStats(records, [], []), {})
    const ten = badges.find((b) => b.definition.id === "record-10")
    expect(ten?.progress).toBe(50)
  })

  it("新解锁会被标记 isNew 并回写时间", () => {
    const records = Array.from({ length: 10 }, () => makeRecord())
    const { badges, newUnlocks } = evaluateAll(computeStats(records, [], []), {})
    const ten = badges.find((b) => b.definition.id === "record-10")
    expect(ten?.unlocked).toBe(true)
    expect(ten?.isNew).toBe(true)
    expect(ten?.unlockedAt).toBeTruthy()
    expect(newUnlocks.some((b) => b.definition.id === "record-10")).toBe(true)
  })

  it("已持久化的解锁不标记 isNew", () => {
    const records = Array.from({ length: 10 }, () => makeRecord())
    const prior = { "record-10": "2026-01-01T00:00:00.000Z" }
    const { badges, newUnlocks } = evaluateAll(computeStats(records, [], []), prior)
    const ten = badges.find((b) => b.definition.id === "record-10")
    expect(ten?.isNew).toBe(false)
    expect(ten?.unlockedAt).toBe("2026-01-01T00:00:00.000Z")
    expect(newUnlocks.some((b) => b.definition.id === "record-10")).toBe(false)
  })

  it("复合条件徽章按条件判定", () => {
    const records = [
      makeRecord({ type: "milestone" }),
      makeRecord({ type: "observation" }),
      makeRecord({ type: "emotion" }),
      makeRecord({ type: "learning" }),
    ]
    const { badges } = evaluateAll(computeStats(records, [], []), {})
    const allTypes = badges.find((b) => b.definition.id === "all-types")
    expect(allTypes?.unlocked).toBe(true)
  })

  it("成就点数 = 已解锁徽章等级点数之和", () => {
    const records = Array.from({ length: 1 }, () => makeRecord())
    const { badges, totalPoints } = evaluateAll(computeStats(records, [], []), {})
    const expected = badges
      .filter((b) => b.unlocked && b.definition.id !== "balanced-100")
      .reduce((sum, b) => sum + BADGE_LEVELS[b.definition.level].points, 0)
    expect(totalPoints).toBe(expected)
  })
})

describe("BADGE_DEFINITIONS 完整性", () => {
  it("定义库 id 唯一", () => {
    const ids = BADGE_DEFINITIONS.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("每枚徽章字段完整且等级合法", () => {
    for (const def of BADGE_DEFINITIONS) {
      expect(def.title.length).toBeGreaterThan(0)
      expect(def.description.length).toBeGreaterThan(0)
      expect(["bronze", "silver", "gold", "platinum"]).toContain(def.level)
      expect(def.icon.length).toBeGreaterThan(0)
    }
  })

  it("每枚徽章 conditions 返回字符串数组（覆盖简单/复合两类工厂）", () => {
    const stats = computeStats([], [], [])
    for (const def of BADGE_DEFINITIONS) {
      const conditions = def.conditions!(stats)
      expect(Array.isArray(conditions)).toBe(true)
      for (const c of conditions) {
        expect(typeof c).toBe("string")
        expect(c.length).toBeGreaterThan(0)
      }
    }
  })

  it("getBadgeById 命中与未命中", () => {
    expect(getBadgeById(BADGE_DEFINITIONS[0].id)).toBeDefined()
    expect(getBadgeById("nonexistent-badge")).toBeUndefined()
  })
})

describe("徽章解锁持久化（localStorage 存根）", () => {
  // 自给自足：不依赖其他测试文件泄漏的 window/localStorage（bun 单进程按序执行，
  // CI 与本机文件顺序不同——此前曾因依赖泄漏的 window 导致仅 CI 失败）
  // 引擎只检查 typeof window !== "undefined"，最小对象即可激活持久化分支
  const backing = new Map<string, string>()
  const stub = {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => { backing.set(key, value) },
    removeItem: (key: string) => { backing.delete(key) },
    clear: () => backing.clear(),
  }
  const globalAny = globalThis as Record<string, unknown>
  const saved = { window: globalAny.window, localStorage: globalAny.localStorage }

  it("save → load 往返一致", () => {
    globalAny.window = saved.window ?? {}
    globalAny.localStorage = stub
    const map = { "first-record": "2026-01-01T00:00:00Z", "streak-7": "2026-02-02T00:00:00Z" }
    saveUnlockedMap(map)
    expect(loadUnlockedMap()).toEqual(map)
  })

  it("存储内容损坏时 load 返回空对象（容错降级）", () => {
    globalAny.window = saved.window ?? {}
    globalAny.localStorage = stub
    backing.set("yyc3_badge_unlocks_v1", "{not-valid-json")
    expect(loadUnlockedMap()).toEqual({})
  })

  it("localStorage 抛错时 load/save 双向静默降级（隐私模式）", () => {
    globalAny.window = saved.window ?? {}
    const throwing = {
      getItem: () => { throw new Error("SecurityError") },
      setItem: () => { throw new Error("QuotaExceededError") },
      removeItem: () => {},
      clear: () => {},
    }
    globalAny.localStorage = throwing
    expect(loadUnlockedMap()).toEqual({})
    expect(() => saveUnlockedMap({ "first-record": "t" })).not.toThrow()
  })

  afterAll(() => {
    if (saved.window === undefined) delete globalAny.window
    else globalAny.window = saved.window
    if (saved.localStorage === undefined) delete globalAny.localStorage
    else globalAny.localStorage = saved.localStorage
  })
})
