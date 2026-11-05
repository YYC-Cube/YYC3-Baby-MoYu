import { generateToken, verifyToken } from "@/lib/auth/jwt"
import { setAuthCookies } from "@/lib/auth/cookies"
import { findUserById, toAuthUser } from "@/lib/auth/service"
import { error as logError } from "@/lib/logger/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const refreshSchema = z.object({
  // body 可省略：浏览器路径凭 httpOnly Cookie 提供刷新令牌
  refreshToken: z.string().min(1, "refreshToken 为必填").optional(),
})

function cookieRefreshToken(request: Request): string | null {
  const m = request.headers.get("cookie")?.match(/(?:^|;\s*)yyc3_rt=([^;]+)/)
  return m?.[1] ?? null
}

export async function POST(request: Request) {
  try {
    // 限流：每 IP 15 次/分钟（刷新不应高频发生）
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (!checkRateLimit(`refresh:ip:${ip}`, 15, 60_000).allowed) {
      return NextResponse.json({ success: false, error: "Rate Limit", message: "请求过于频繁" }, { status: 429 })
    }

    const body: unknown = await request.json().catch(() => ({}))
    const parsed = refreshSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: parsed.error.issues[0]?.message || "参数错误" },
        { status: 400 }
      )
    }

    // refreshToken 来源：body（显式客户端）或 httpOnly Cookie（浏览器）
    const refreshToken = parsed.data.refreshToken ?? cookieRefreshToken(request)
    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: "refreshToken 为必填" },
        { status: 400 }
      )
    }

    let payload
    try {
      // 仅接受 refresh 令牌：access 令牌不得用于刷新
      payload = verifyToken(refreshToken, "refresh")
    } catch {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: "刷新令牌无效或已过期" },
        { status: 401 }
      )
    }

    const row = await findUserById(payload.userId)
    if (!row) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: "用户不存在" },
        { status: 401 }
      )
    }
    const user = toAuthUser(row)
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "Forbidden", message: "账号已停用" },
        { status: 403 }
      )
    }

    const accessToken = generateToken({ userId: user.id, email: user.email, role: user.role })
    const res = NextResponse.json({
      success: true,
      data: { token: accessToken, user },
      meta: { timestamp: new Date().toISOString() },
    })
    // 浏览器路径：刷新 httpOnly access Cookie
    setAuthCookies(res, accessToken)
    return res
  } catch (error) {
    logError("刷新令牌失败", error, { module: "auth", function: "refresh" })
    return NextResponse.json({ success: false, error: "Server Error", message: "刷新令牌失败" }, { status: 500 })
  }
}
