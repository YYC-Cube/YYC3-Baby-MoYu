/**
 * @fileoverview 自治核心引擎 HTTP 入口（AgenticCore 服务端化）
 * @description GET 返回系统状态；POST 处理用户输入返回 AgentResponse。
 *   引擎本体与 prediction 服务栈仅存在于服务端，客户端不打包。
 */

import { requireAuth } from "@/lib/auth/guard"
import { getAgenticCore } from "@/lib/agentic/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const inputSchema = z.object({
  text: z.string().min(1, "输入内容不能为空").max(4000),
  sessionId: z.string().max(128).optional(),
})

export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const rl = checkRateLimit(`agentic:status:${auth.user.id}`, 60, 60_000)
  if (!rl.allowed) {
    return NextResponse.json({ success: false, error: "Rate Limit", message: "请求过于频繁" }, { status: 429 })
  }

  try {
    return NextResponse.json({ success: true, data: getAgenticCore().getSystemStatus() })
  } catch (error) {
    console.error("[api] AgenticCore 状态查询失败:", error)
    return NextResponse.json({ success: false, error: "Server Error", message: "状态查询失败" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const rl = checkRateLimit(`agentic:process:${auth.user.id}`, 20, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate Limit", message: `请求过于频繁，请 ${rl.retryAfterSec} 秒后再试` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    )
  }

  try {
    const body: unknown = await request.json().catch(() => null)
    const parsed = inputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: parsed.error.issues[0]?.message || "参数错误" },
        { status: 400 }
      )
    }

    const response = await getAgenticCore().processInput({
      text: parsed.data.text,
      timestamp: Date.now(),
      sessionId: parsed.data.sessionId,
      // 服务端以认证用户为准，不信任客户端传入的身份
      userId: auth.user.id,
    })
    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    console.error("[api] AgenticCore 处理失败:", error)
    return NextResponse.json({ success: false, error: "Server Error", message: "处理失败，请稍后重试" }, { status: 500 })
  }
}
