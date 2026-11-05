/**
 * @fileoverview YYC³ AI小语 - AI 对话端点（模型优先 · 示例兜底）
 * @description 设计原则：**绝不假装自己是模型**。
 *   - 配置 `OPENAI_API_KEY` 时走真实模型（与 orchestrate / assessment-report 同一供应商模式）；
 *   - 未配置时返回内置示例话术，并在流首帧声明 `demo: true`，供前端显式标注「示例回答」。
 *   两条路径共用同一 SSE 契约，避免前端出现「有时真有时假却看不出来」的体验。
 * @author YYC³
 * @version 2.0.0
 * @created 2025-01-30
 * @modified 2026-11-02
 * @copyright Copyright (c) 2025 YYC³
 * @license MIT
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"
import { guardAIRequest } from "@/lib/api/ai-guard"
import { AI_ROLES, selectRoleByContext, type AIRole } from "@/lib/ai_roles"
import { NextResponse } from "next/server"
import { z } from "zod"

/** 与 lib/ai_roles 的键集合保持一致；非法角色回落为按上下文选择 */
const ROLE_IDS = Object.keys(AI_ROLES) as AIRole[]

const bodySchema = z.object({
  message: z.string().min(1, "消息不能为空").max(4000, "消息过长（上限 4000 字）"),
  role: z.string().max(32).optional(),
  complexity: z.unknown().optional(),
})

/** 模型标识：与 orchestrate / assessment-report 使用同一型号，避免多模型口径漂移 */
const MODEL_ID = "gpt-4o-mini"

/** 示例话术：仅在未配置模型密钥时使用，且前端会收到 demo 标记 */
const SAMPLE_RESPONSES = {
  greetings: [
    "您好！我是小语AI助手，很高兴为您提供育儿帮助。今天想聊什么呢？",
    "你好！很高兴见到您。我是您的专属育儿小助手小语。",
    "欢迎！我是小语，让我们一起为宝宝的成长努力吧。",
  ],
  music: [
    "音乐启蒙可以从简单的儿歌开始，这有助于宝宝的语言发展和节奏感培养。",
    "给宝宝听音乐是个很好的选择，建议选择旋律简单、节奏明快的儿歌。",
    "音乐能够促进宝宝的大脑发育，建议每天安排15-20分钟的音乐时间。",
  ],
  learning: [
    "早期教育应该以游戏为主，在快乐中学习效果最好。",
    "宝宝的学习主要通过游戏和探索来完成，建议提供丰富的感官体验。",
    "在玩耍中学习是最好的方式，让宝宝在快乐的氛围中自然成长。",
  ],
  safety: [
    "安全是第一位的。请确保宝宝活动区域的防护措施到位。",
    "宝宝的安全意识需要从小培养，同时家长要做好防护工作。",
    "家中的安全隐患要及时排除，为宝宝创造安全的成长环境。",
  ],
  sleep: [
    "良好的睡眠习惯对宝宝成长至关重要，建议建立规律作息。",
    "充足的睡眠有助于宝宝的身体发育和大脑成长。",
    "建议建立固定的睡前程序，帮助宝宝养成良好的睡眠习惯。",
  ],
  eating: [
    "辅食添加要循序渐进，注意观察宝宝的接受程度。",
    "宝宝的饮食要多样化，确保营养均衡搭配。",
    "添加新食物时要观察3-5天，确保没有过敏反应。",
  ],
  role: {
    companion: "我在呢。想聊聊宝宝今天的变化，还是您自己的心情？",
    recorder: "信息已记录。持续的记录有助于了解宝宝的成长轨迹。",
    guardian: "宝宝的安全和健康是首要关注，请确保环境安全。",
    listener: "我理解您的感受。每个孩子都有自己的成长节奏。",
    advisor: "建议建立规律的作息时间，这对宝宝成长发育很重要。",
    cultural: "文化启蒙是一个循序渐进的过程，让我们一起努力。",
    all: "感谢您的分享。我会继续为您提供全面的育儿建议。",
  },
  fallback: [
    "感谢您的分享。作为您的育儿助手，我会竭诚为您提供专业的建议和支持。",
    "我理解您的关注。让我们一起来为宝宝创造更好的成长环境。",
    "育儿路上我们一起努力。有什么具体问题随时可以问我。",
  ],
} as const

function pick(list: readonly string[]): string {
  return list[Math.floor(Math.random() * list.length)] ?? list[0] ?? ""
}

/** 关键词路由的示例回答（无模型时的兜底，保持内容可读、不假装推理） */
function sampleResponse(message: string, role: AIRole): string {
  const text = message.trim().toLowerCase()
  if (["你好", "嗨", "hi", "在吗"].some((k) => text.includes(k))) return pick(SAMPLE_RESPONSES.greetings)
  if (["音乐", "儿歌", "唱歌", "听歌"].some((k) => text.includes(k))) return pick(SAMPLE_RESPONSES.music)
  if (["学习", "教育", "启蒙"].some((k) => text.includes(k))) return pick(SAMPLE_RESPONSES.learning)
  if (["安全", "危险", "防护"].some((k) => text.includes(k))) return pick(SAMPLE_RESPONSES.safety)
  if (["睡觉", "睡眠", "作息", "晚上"].some((k) => text.includes(k))) return pick(SAMPLE_RESPONSES.sleep)
  if (["吃饭", "辅食", "食物", "喂养"].some((k) => text.includes(k))) return pick(SAMPLE_RESPONSES.eating)
  const roleSample = SAMPLE_RESPONSES.role[role as keyof typeof SAMPLE_RESPONSES.role]
  return roleSample ?? pick(SAMPLE_RESPONSES.fallback)
}

/** 按需构建模型实例：无密钥返回 null，调用方据此决定 demo 路径 */
function buildModel() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const provider = createOpenAI({
    apiKey,
    ...(process.env.OPENAI_BASE_URL && { baseURL: process.env.OPENAI_BASE_URL }),
  })
  return provider(MODEL_ID)
}

/**
 * 生成回答：模型优先，失败或未配置则降级为示例
 * @returns text 与是否示例（demo 为 true 时前端必须标注）
 */
async function composeAnswer(message: string, role: AIRole): Promise<{ text: string; demo: boolean }> {
  const model = buildModel()
  if (!model) {
    return { text: sampleResponse(message, role), demo: true }
  }
  try {
    const { text } = await generateText({
      model,
      system: AI_ROLES[role].systemPrompt,
      prompt: message,
      // 育儿对话不需要长文；限制长度既控成本也降超时概率
      maxOutputTokens: 600,
    })
    const clean = text.trim()
    if (clean.length > 0) return { text: clean, demo: false }
    // 模型返回空串（内容过滤等）同样按示例兜底，但保留 demo 标记
    return { text: sampleResponse(message, role), demo: true }
  } catch (err) {
    console.error("[api/ai/chat] 模型调用失败，降级为示例回答：", err)
    return { text: sampleResponse(message, role), demo: true }
  }
}

/** 将文本按字符切片推送，保持既有的 SSE 增量契约 */
function streamAnswer(payload: { text: string; demo: boolean; role: AIRole; chunkDelayMs: number }): Response {
  const encoder = new TextEncoder()
  const { text, demo, role, chunkDelayMs } = payload

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown): void => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      // 首帧声明能力状态：前端据此渲染「示例回答」标记，不再靠猜
      send({ type: "meta", demo, role, model: demo ? null : MODEL_ID })

      try {
        let current = ""
        for (const char of text) {
          current += char
          // content 为累计文本，兼容仅解析 content 的旧客户端
          send({ type: "delta", content: current, role })
          await new Promise((resolve) => setTimeout(resolve, chunkDelayMs))
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      } catch (error) {
        console.error("[api/ai/chat] 流式响应中断：", error)
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      // 明确告知代理不要缓存 SSE
      "X-Accel-Buffering": "no",
    },
  })
}

export async function POST(request: Request) {
  const guard = await guardAIRequest(request, { name: "chat", limit: 20 })
  if (guard instanceof NextResponse) return guard

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Bad Request", message: "请求体必须是 JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation Error", message: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    )
  }

  const { message } = parsed.data
  const requestedRole = parsed.data.role as AIRole | undefined
  const role: AIRole = requestedRole && ROLE_IDS.includes(requestedRole)
    ? requestedRole
    : selectRoleByContext(message)

  try {
    const { text, demo } = await composeAnswer(message, role)
    // 真模型逐字更快（12ms）；示例话术稍慢（30ms）以保留「生成感」但不误导
    return streamAnswer({ text, demo, role, chunkDelayMs: demo ? 30 : 12 })
  } catch (error) {
    console.error("[api/ai/chat] 生成失败：", error)
    return NextResponse.json(
      { success: false, error: "AI Service Error", message: "对话生成失败，请稍后重试", demo: false },
      { status: 500 },
    )
  }
}
