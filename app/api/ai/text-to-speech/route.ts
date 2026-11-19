/**
 * @fileoverview 文本转语音（TTS）服务端代理
 * @description 密钥边界：BIGMODEL_API_KEY 仅服务端读取，浏览器一律经本路由获取音频，
 *   禁止任何 NEXT_PUBLIC_ 前缀承载密钥。
 *   入参校验：文本上限 2000 字、音色白名单、语速 0.5–2.0。
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { guardAIRequest } from "@/lib/api/ai-guard"
import { getVoiceService, hasVoiceService, TTS_VOICES, UpstreamHttpError } from "@/lib/api/voice-services"

/** 单次合成文本上限（控成本、防长文本拖垮响应） */
const MAX_TEXT_LENGTH = 2000

const bodySchema = z.object({
  text: z.string().min(1, "文本不能为空").max(MAX_TEXT_LENGTH, `文本过长（上限 ${MAX_TEXT_LENGTH} 字）`),
  voice: z.enum(TTS_VOICES).optional(),
  speed: z.number().min(0.5).max(2.0).optional(),
})

export async function POST(request: Request) {
  // CogTTS 按字符计费，配额从严
  const guard = await guardAIRequest(request, { name: "text-to-speech", limit: 10 })
  if (guard instanceof NextResponse) return guard

  if (!hasVoiceService()) {
    return NextResponse.json({ error: "语音合成服务未配置" }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    )
  }

  const { text, voice = "tongtong", speed } = parsed.data

  try {
    const { audio, format } = await getVoiceService().textToSpeech(text, {
      voice,
      ...(speed === undefined ? {} : { speed }),
    })
    if (format === "fallback") {
      // 服务端不应触发浏览器降级路径；出现即视为上游异常
      return NextResponse.json({ error: "语音合成服务暂时不可用" }, { status: 502 })
    }
    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": format === "pcm" ? "audio/pcm" : "audio/wav",
        "Cache-Control": "no-store",
        "X-Audio-Format": format,
      },
    })
  } catch (error) {
    // 区分「凭据失效」与「上游故障」：前者运维只需换 key，后者才需要排查服务
    if (error instanceof UpstreamHttpError && (error.status === 401 || error.status === 403)) {
      console.error("[api] 语音合成凭据失效:", error.message)
      return NextResponse.json({ error: "语音服务凭据无效，请检查 BIGMODEL_API_KEY" }, { status: 503 })
    }
    console.error("[api] 语音合成失败:", error)
    return NextResponse.json({ error: "语音合成失败，请稍后重试" }, { status: 502 })
  }
}
