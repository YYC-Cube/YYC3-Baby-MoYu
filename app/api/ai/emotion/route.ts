import { guardAIRequest } from "@/lib/api/ai-guard"
import { NextResponse } from "next/server"

// 情感分析API端点（本地词典计算，无需 edge runtime；认证链依赖 node:sqlite）

interface EmotionAnalysisRequest {
  text: string
  includeAdvice?: boolean
}

interface EmotionAnalysisResponse {
  emotion: string
  confidence: number
  valence: number // -1 (负面) 到 1 (正面)
  arousal: number // 0 (平静) 到 1 (激动)
  keywords: string[]
  advice?: string
}

export async function POST(request: Request) {
  const guard = await guardAIRequest(request, { name: "emotion", limit: 30 })
  if (guard instanceof NextResponse) return guard

  try {
    const { text, includeAdvice = false } = (await request.json()) as EmotionAnalysisRequest

    // 情感词典
    const emotionKeywords = {
      happy: {
        words: ["开心", "高兴", "快乐", "哈哈", "棒", "好", "喜欢", "爱", "赞", "耶", "太好了"],
        valence: 0.8,
        arousal: 0.6,
      },
      sad: {
        words: ["难过", "伤心", "哭", "失望", "不开心", "郁闷", "沮丧", "悲伤"],
        valence: -0.7,
        arousal: 0.4,
      },
      angry: {
        words: ["生气", "愤怒", "讨厌", "烦", "恼火", "火大", "气死了"],
        valence: -0.8,
        arousal: 0.9,
      },
      excited: {
        words: ["兴奋", "激动", "太棒了", "超级", "amazing", "精彩"],
        valence: 0.9,
        arousal: 0.95,
      },
      calm: {
        words: ["平静", "放松", "舒服", "安静", "淡定", "还好"],
        valence: 0.3,
        arousal: 0.2,
      },
      anxious: {
        words: ["紧张", "担心", "焦虑", "害怕", "怕", "不安", "忧虑"],
        valence: -0.5,
        arousal: 0.8,
      },
      neutral: {
        words: [],
        valence: 0,
        arousal: 0.5,
      },
    }

    // 计算情感得分
    const scores: Record<string, number> = {}
    const foundKeywords: string[] = []

    for (const [emotion, data] of Object.entries(emotionKeywords)) {
      let score = 0
      for (const word of data.words) {
        if (text.includes(word)) {
          score++
          if (!foundKeywords.includes(word)) {
            foundKeywords.push(word)
          }
        }
      }
      scores[emotion] = score
    }

    // 找出最高分情感
    const maxScore = Math.max(...Object.values(scores))
    const detectedEmotion =
      maxScore > 0 ? Object.keys(scores).find((key) => scores[key] === maxScore) || "neutral" : "neutral"

    const emotionData = emotionKeywords[detectedEmotion as keyof typeof emotionKeywords]
    const confidence = maxScore > 0 ? Math.min(maxScore * 0.25, 0.95) : 0.3

    // 生成建议
    let advice = ""
    if (includeAdvice) {
      const adviceMap: Record<string, string> = {
        happy: "保持这种积极的心态，继续努力！可以和家人分享你的快乐哦~",
        sad: "遇到困难是正常的，不要灰心。深呼吸，休息一下，或者找人聊聊天会有帮助的。",
        angry: "感到生气时，先让自己冷静下来。可以数到10，或者去喝杯水。平静后再处理问题会更好。",
        excited: "你的热情真棒！记得合理安排时间，保持这份激情的同时也要注意休息。",
        calm: "平和的心态很好，继续保持。这是学习和思考的最佳状态。",
        anxious: "感到紧张是正常的。试着做几次深呼吸，把大任务分成小步骤，一步步来就不会那么害怕了。",
        neutral: "今天的状态还不错。可以尝试做一些喜欢的事情，让心情更愉悦一些。",
      }
      const adviceValue = adviceMap[detectedEmotion]
      advice = adviceValue ?? adviceMap['neutral']
    }

    const response: EmotionAnalysisResponse = includeAdvice ? {
      emotion: detectedEmotion,
      confidence,
      valence: emotionData.valence,
      arousal: emotionData.arousal,
      keywords: foundKeywords,
      advice,
    } : {
      emotion: detectedEmotion,
      confidence,
      valence: emotionData.valence,
      arousal: emotionData.arousal,
      keywords: foundKeywords,
    }

    return Response.json(response)
  } catch (error) {
    console.error("[v0] 情感分析错误:", error)
    return new Response(JSON.stringify({ error: "情感分析失败" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
