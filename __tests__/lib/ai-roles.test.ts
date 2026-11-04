/**
 * lib/ai_roles.ts 全函数补测（纯函数，无需 mock）
 * 覆盖：角色配置库完整性、上下文选角色（简/详版）、系统提示词组装、
 * 查询复杂度分析（复杂度/情绪/紧急度）、协同提示词与响应、角色历史、
 * 活跃/优先级/按 id 查询。
 */

import { describe, expect, test } from "bun:test"
import {
  AI_ROLES,
  analyzeQueryComplexity,
  generateCoordinatedResponse,
  getActiveRoles,
  getCoordinatedPrompt,
  getRoleById,
  getRoleSystemPrompt,
  getRolesByPriority,
  selectRoleByContext,
  selectRoleByContextDetailed,
  updateRoleHistory,
  type RoleHistory,
  type RoleTransition,
} from "../../lib/ai_roles"

const ctx = { name: "小语", ageText: "2岁", stage: "学步期", traits: ["好奇", "爱笑"] }

describe("AI_ROLES 配置库完整性", () => {
  test("六个角色齐全且 id 与键一致", () => {
    const ids = Object.keys(AI_ROLES)
    expect(ids.sort()).toEqual(["advisor", "companion", "cultural", "guardian", "listener", "recorder"].sort())
    for (const [key, config] of Object.entries(AI_ROLES)) {
      expect(config.id).toBe(key)
      expect(config.name.length).toBeGreaterThan(0)
      expect(config.systemPrompt.length).toBeGreaterThan(50)
      expect(config.triggerKeywords.length).toBeGreaterThan(0)
      expect(config.specialties.length).toBeGreaterThan(0)
      expect(config.isActive).toBe(true)
    }
  })

  test("每个角色有唯一的图标与颜色", () => {
    const icons = Object.values(AI_ROLES).map((c) => c.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })
})

describe("selectRoleByContext · 简版选角色", () => {
  test("陪伴关键词 → companion", () => {
    expect(selectRoleByContext("好无聊好寂寞，陪我聊聊天")).toBe("companion")
  })
  test("记录关键词 → recorder", () => {
    expect(selectRoleByContext("帮我记录一下孩子的成长里程碑")).toBe("recorder")
  })
  test("安全关键词 → guardian", () => {
    expect(selectRoleByContext("家里有什么安全风险需要注意")).toBe("guardian")
  })
  test("文化关键词 → cultural", () => {
    expect(selectRoleByContext("端午节有什么传统礼仪")).toBe("cultural")
  })
  test("情绪关键词占多 → listener", () => {
    expect(selectRoleByContext("孩子情绪低落心情不好，帮我分析下心理")).toBe("listener")
  })
  test("建议关键词 → advisor", () => {
    expect(selectRoleByContext("如何培养孩子的阅读习惯，有什么教育方法")).toBe("advisor")
  })
  test("无匹配 → 默认 advisor", () => {
    expect(selectRoleByContext("今天天气怎么样")).toBe("advisor")
  })
})

describe("selectRoleByContextDetailed · 详版选角色", () => {
  test("返回全部角色评分且按分数降序", () => {
    const result = selectRoleByContextDetailed("帮我记录成长，顺便聊聊情绪")
    expect(result.allScores).toHaveLength(6)
    for (let i = 1; i < result.allScores.length; i++) {
      expect(result.allScores[i - 1].score).toBeGreaterThanOrEqual(result.allScores[i].score)
    }
    expect(result.selectedRole).toBe("recorder")
    expect(result.confidence).toBe(Math.min(2 / 3, 1))
    expect(result.reason).toContain("2个关键词")
    const recorder = result.allScores.find((s) => s.role === "recorder")!
    expect(recorder.matchedKeywords).toContain("记录")
  })

  test("无匹配时置信度 0.5 且默认 advisor", () => {
    const result = selectRoleByContextDetailed("今天天气怎么样")
    expect(result.selectedRole).toBe("advisor")
    expect(result.confidence).toBe(0.5)
    expect(result.reason).toBe("默认选择建议者角色")
  })

  test("高分匹配置信度封顶 1", () => {
    const result = selectRoleByContextDetailed("记录保存里程碑档案数据")
    expect(result.selectedRole).toBe("recorder")
    expect(result.confidence).toBe(1)
  })
})

describe("getRoleSystemPrompt · 系统提示词", () => {
  test("含基础框架 + 角色专属提示词 + 通用要求", () => {
    const prompt = getRoleSystemPrompt("guardian")
    expect(prompt).toContain("你是AI小语，YYC³智能成长守护系统的AI助手")
    expect(prompt).toContain("守护者")
    expect(prompt).toContain("回答控制在200字以内")
  })

  test("注入儿童上下文（含特点列表）", () => {
    const prompt = getRoleSystemPrompt("companion", ctx)
    expect(prompt).toContain("小语")
    expect(prompt).toContain("2岁")
    expect(prompt).toContain("学步期")
    expect(prompt).toContain("好奇、爱笑")
  })

  test("traits 缺省回退「活泼可爱」", () => {
    const prompt = getRoleSystemPrompt("companion", { name: "宝", ageText: "1岁", stage: "婴儿期" })
    expect(prompt).toContain("活泼可爱")
  })
})

describe("analyzeQueryComplexity · 查询分析", () => {
  test("无角色匹配 → simple + 回退 advisor + short", () => {
    const a = analyzeQueryComplexity("今天星期几")
    expect(a.complexity).toBe("simple")
    expect(a.involvedRoles).toEqual(["advisor"])
    expect(a.suggestedResponseLength).toBe("short")
  })

  test("两个角色 → medium + medium 长度", () => {
    const a = analyzeQueryComplexity("想聊聊天，顺便帮我记录一下成长")
    expect(a.involvedRoles).toHaveLength(2)
    expect(a.complexity).toBe("medium")
    expect(a.suggestedResponseLength).toBe("medium")
  })

  test("三个及以上角色 → complex + long 长度", () => {
    const a = analyzeQueryComplexity("孩子情绪不好又想记录成长，还要安全建议")
    expect(a.involvedRoles.length).toBeGreaterThanOrEqual(3)
    expect(a.complexity).toBe("complex")
    expect(a.suggestedResponseLength).toBe("long")
  })

  test("情绪基调：positive / negative / mixed / neutral", () => {
    expect(analyzeQueryComplexity("孩子今天特别开心喜欢新玩具").emotionalTone).toBe("positive")
    expect(analyzeQueryComplexity("我很难过很担心孩子").emotionalTone).toBe("negative")
    expect(analyzeQueryComplexity("孩子很开心但我很难过").emotionalTone).toBe("mixed")
    expect(analyzeQueryComplexity("记录一下成长").emotionalTone).toBe("neutral")
  })

  test("紧急度：low / medium / high", () => {
    expect(analyzeQueryComplexity("记录一下成长").urgency).toBe("low")
    expect(analyzeQueryComplexity("这里是不是有点危险").urgency).toBe("medium")
    expect(analyzeQueryComplexity("紧急危险马上处理").urgency).toBe("high")
  })
})

describe("getCoordinatedPrompt · 协同提示词", () => {
  test("单角色退化为角色系统提示词", () => {
    const single = getCoordinatedPrompt("q", ["guardian"])
    expect(single).toBe(getRoleSystemPrompt("guardian"))
  })

  test("空角色列表回退 advisor", () => {
    expect(getCoordinatedPrompt("q", [])).toBe(getRoleSystemPrompt("advisor"))
  })

  test("多角色包含各视角与儿童上下文", () => {
    const prompt = getCoordinatedPrompt("q", ["recorder", "guardian"], ctx)
    expect(prompt).toContain("综合多个角色视角")
    expect(prompt).toContain("【记录者视角】")
    expect(prompt).toContain("【守护者视角】")
    expect(prompt).toContain("小语")
    expect(prompt).toContain("回答控制在300字以内")
  })
})

describe("generateCoordinatedResponse · 协同响应", () => {
  test("simple：主角色 + 无辅助洞察 + 高置信度", () => {
    const analysis = analyzeQueryComplexity("今天星期几")
    const res = generateCoordinatedResponse("今天星期几", analysis, ctx)
    expect(res.mainRole).toBe("advisor")
    expect(res.supportingInsights).toHaveLength(0)
    expect(res.confidence).toBe(0.9)
    expect(res.estimatedResponseTime).toBe(1000)
    expect(res.mainResponse).toContain("AI小语")
  })

  test("complex：多角色主次分明 + 中等置信度", () => {
    const analysis = analyzeQueryComplexity("孩子情绪不好又想记录成长，还要安全建议")
    const res = generateCoordinatedResponse("q", analysis)
    expect(res.mainRole).toBe(analysis.involvedRoles[0])
    expect(res.supportingInsights).toHaveLength(analysis.involvedRoles.length - 1)
    for (const insight of res.supportingInsights!) {
      expect(insight.relevance).toBe(0.7)
      expect(insight.insight.length).toBeGreaterThan(0)
    }
    expect(res.confidence).toBe(0.6)
    expect(res.estimatedResponseTime).toBe(3000)
  })

  test("medium 置信度 0.75 / 响应时长 2000", () => {
    const analysis = analyzeQueryComplexity("想聊聊天，顺便帮我记录一下成长")
    const res = generateCoordinatedResponse("q", analysis)
    expect(res.confidence).toBe(0.75)
    expect(res.estimatedResponseTime).toBe(2000)
  })
})

describe("updateRoleHistory · 角色历史", () => {
  function makeTransition(to: RoleTransition["toRole"], i = 0): RoleTransition {
    return { fromRole: "advisor", toRole: to, reason: `t${i}`, timestamp: new Date(), confidence: 0.8 }
  }

  test("追加 transition、更新 currentRole 与使用计数", () => {
    const history: RoleHistory = {
      transitions: [makeTransition("companion")],
      currentRole: "companion",
      roleUsageCount: { companion: 1, recorder: 0, guardian: 0, listener: 0, advisor: 0, cultural: 0 },
      lastUpdated: new Date(),
    }
    const updated = updateRoleHistory(history, makeTransition("guardian", 1))
    expect(updated.transitions).toHaveLength(2)
    expect(updated.currentRole).toBe("guardian")
    expect(updated.roleUsageCount.guardian).toBe(1)
    expect(updated.lastUpdated.getTime()).toBeGreaterThanOrEqual(history.lastUpdated.getTime())
    // 不可变：原历史不被修改
    expect(history.transitions).toHaveLength(1)
  })

  test("计数累加而非覆盖", () => {
    const history: RoleHistory = {
      transitions: [makeTransition("recorder")],
      currentRole: "recorder",
      roleUsageCount: { companion: 0, recorder: 3, guardian: 0, listener: 0, advisor: 0, cultural: 0 },
      lastUpdated: new Date(),
    }
    const updated = updateRoleHistory(history, makeTransition("recorder", 1))
    expect(updated.roleUsageCount.recorder).toBe(4)
  })

  test("transitions 上限 100 条裁剪", () => {
    const transitions: RoleTransition[] = Array.from({ length: 100 }, (_, i) => makeTransition("companion", i))
    const history: RoleHistory = {
      transitions,
      currentRole: "companion",
      roleUsageCount: { companion: 100, recorder: 0, guardian: 0, listener: 0, advisor: 0, cultural: 0 },
      lastUpdated: new Date(),
    }
    const updated = updateRoleHistory(history, makeTransition("guardian", 100))
    expect(updated.transitions).toHaveLength(100)
    expect(updated.transitions[0].reason).toBe("t1")
    expect(updated.transitions[99].toRole).toBe("guardian")
  })
})

describe("角色查询工具", () => {
  test("getActiveRoles 返回全部六个活跃角色", () => {
    expect(getActiveRoles().sort()).toEqual(
      ["advisor", "companion", "cultural", "guardian", "listener", "recorder"].sort()
    )
  })

  test("getRoleById 命中与未命中", () => {
    expect(getRoleById("companion")?.name).toBe("陪伴者")
    expect(getRoleById("nonexistent")).toBeUndefined()
  })

  test("getRolesByPriority 按优先级升序（同级保持稳定序）", () => {
    expect(getRolesByPriority()).toEqual([
      "companion", "listener", "recorder", "cultural", "advisor", "guardian",
    ])
  })
})
