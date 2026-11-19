import { generateText } from "ai"
import { guardAIRequest } from "@/lib/api/ai-guard"
import { getModel, getModelSource } from "@/lib/ai/model-provider"
import { aiRouteRequestsTotal } from "@/lib/monitoring/metrics"
import { z } from "zod"

const bodySchema = z.object({
  childName: z.string(),
  childAge: z.number(),
  stageId: z.string(),
  stageName: z.string(),
  scores: z.record(z.string(), z.number()),
})
import { NextResponse } from "next/server"

interface DimensionAnalysis {
  score: number
  level: string
  percentile: number
  description: string
}

interface DimensionData {
  [key: string]: DimensionAnalysis
}

export async function POST(request: Request) {
  const guard = await guardAIRequest(request, { name: "assessment-report", limit: 10 })
  if (guard instanceof NextResponse) return guard

  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "请求体格式不正确" }, { status: 400 })
    }
    const { childName, childAge, stageId, stageName, scores } = parsed.data

    const model = getModel()
    if (!model) {
      aiRouteRequestsTotal.inc({ route: "assessment-report", outcome: "no-provider" })
      return NextResponse.json({ error: "服务配置错误，请检查 API 密钥" }, { status: 500 })
    }

    // 计算各维度得分和总体评估
    const dimensionAnalysis = analyzeDimensions(scores)
    const overallLevel = calculateOverallLevel(dimensionAnalysis)

    // 生成AI评估报告
    const { text: aiReport } = await generateText({
      model: model,
      system: `你是YYC³ AI小语成长守护系统的"守护者"角色，专注于儿童发展评估。
你的任务是基于评估数据生成专业、温暖、有建设性的发展报告。

报告要求：
1. 基于WHO、CDC等权威标准进行分析
2. 强调发展的个体差异性，避免制造焦虑
3. 提供具体、可操作的建议
4. 语言温暖专业，充满关怀
5. 结构清晰：优势→待发展→建议→展望`,
      prompt: `请为${childName}（${childAge}个月龄，处于${stageName}）生成发展评估报告。

评估数据：
${JSON.stringify(dimensionAnalysis, null, 2)}

总体发展水平：${overallLevel}

请生成包含以下部分的报告：
1. 【发展亮点】本阶段表现突出的2-3个方面
2. 【发展优势】各维度的优势分析
3. 【成长空间】需要关注和支持的方面
4. 【专业建议】针对性的促进发展建议（每个维度1-2条）
5. 【家庭活动】推荐的亲子活动（3-5个）
6. 【发展展望】对下一阶段的准备建议

注意：
- 避免使用"落后""问题""缺陷"等负面词汇
- 用"成长空间""发展机会""可以更好"等正向表达
- 强调每个孩子发展节奏不同是正常的`,
    })

    // 构建完整报告
    const report = {
      id: `report_${Date.now()}`,
      childName,
      childAge,
      stageId,
      stageName,
      assessmentDate: new Date().toISOString(),
      dimensionScores: dimensionAnalysis,
      overallLevel,
      aiAnalysis: aiReport,
      recommendations: extractRecommendations(aiReport),
      nextSteps: generateNextSteps(stageId, dimensionAnalysis),
    }

    aiRouteRequestsTotal.inc({ route: "assessment-report", outcome: `success:${getModelSource()}` })
    return Response.json(report)
  } catch (error) {
    console.error("Assessment report error:", error)
    aiRouteRequestsTotal.inc({ route: "assessment-report", outcome: "error" })
    return Response.json({ error: "报告生成失败" }, { status: 500 })
  }
}

// 分析各维度得分
function analyzeDimensions(scores: Record<string, number>): DimensionData {
  const analysis: DimensionData = {}

  for (const [dimension, score] of Object.entries(scores)) {
    const percentile = calculatePercentile(score)
    analysis[dimension] = {
      score,
      level: getScoreLevel(score),
      percentile,
      description: getScoreDescription(score),
    }
  }

  return analysis
}

// 计算总体发展水平
function calculateOverallLevel(dimensionAnalysis: DimensionData): string {
  const scores = Object.values(dimensionAnalysis).map((d) => d.score)
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length

  if (avgScore >= 85) return "发展良好"
  if (avgScore >= 70) return "发展正常"
  if (avgScore >= 55) return "需要关注"
  return "建议咨询专业人士"
}

// 计算百分位
function calculatePercentile(score: number): number {
  // 简化的百分位计算（实际应基于常模数据）
  if (score >= 90) return 95
  if (score >= 80) return 85
  if (score >= 70) return 70
  if (score >= 60) return 50
  if (score >= 50) return 30
  return 15
}

// 获取分数等级
function getScoreLevel(score: number): string {
  if (score >= 85) return "优秀"
  if (score >= 70) return "良好"
  if (score >= 55) return "正常"
  if (score >= 40) return "待发展"
  return "需关注"
}

// 获取分数描述
function getScoreDescription(score: number): string {
  if (score >= 85) return "在同龄儿童中表现突出"
  if (score >= 70) return "发展状况良好，符合预期"
  if (score >= 55) return "发展正常，可适当加强"
  if (score >= 40) return "有较大成长空间"
  return "建议寻求专业指导"
}

// 提取建议
function extractRecommendations(report: string): string[] {
  const lines = report.split("\n")
  const recommendations: string[] = []

  let inRecommendSection = false
  for (const line of lines) {
    if (line.includes("专业建议") || line.includes("家庭活动")) {
      inRecommendSection = true
      continue
    }
    if (line.includes("【") && inRecommendSection) {
      inRecommendSection = false
    }
    if (inRecommendSection && line.trim().startsWith("-")) {
      recommendations.push(line.trim().substring(1).trim())
    }
  }

  return recommendations.slice(0, 10)
}

// 生成下一步行动
function generateNextSteps(_stageId: string, analysis: DimensionData): string[] {
  const steps = ["定期进行发展评估，追踪成长变化", "保持与孩子的高质量陪伴时间", "鼓励探索和尝试新事物"]

  // 找出最需要关注的维度
  const sortedDimensions = Object.entries(analysis)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 2)

  for (const [dim, data] of sortedDimensions) {
    if (data.score < 70) {
      steps.push(`重点关注${dim}发展，增加相关活动`)
    }
  }

  return steps
}
