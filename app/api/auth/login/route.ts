import { generateRefreshToken, generateToken } from "@/lib/auth/jwt"
import { setAuthCookies } from "@/lib/auth/cookies"
import { findUserByEmail, toAuthUser, touchLastLogin, verifyPassword } from "@/lib/auth/service"
import { error as logError, info as logInfo } from "@/lib/logger/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "密码为必填"),
})

// 暴力破解防护：按 IP + 邮箱双维度限流
function clientIP(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: parsed.error.issues[0]?.message || "参数错误" },
        { status: 400 }
      )
    }

    // 限流：每 IP 10 次/分钟 + 每邮箱 5 次/分钟
    const ip = clientIP(request)
    if (!checkRateLimit(`login:ip:${ip}`, 10, 60_000).allowed) {
      return NextResponse.json({ success: false, error: "Rate Limit", message: "尝试过于频繁，请稍后再试" }, { status: 429 })
    }
    if (!checkRateLimit(`login:email:${parsed.data.email}`, 5, 60_000).allowed) {
      return NextResponse.json({ success: false, error: "Rate Limit", message: "该账号尝试过于频繁，请稍后再试" }, { status: 429 })
    }

    const row = await findUserByEmail(parsed.data.email)
    if (!row || !(await verifyPassword(parsed.data.password, row.password_hash))) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: "邮箱或密码错误" },
        { status: 401 }
      )
    }

    const user = toAuthUser(row)
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "Unauthorized", message: "账号已停用" },
        { status: 401 }
      )
    }

    // 异步更新最后登录时间（不阻塞响应）
    void touchLastLogin(user.id)

    const payload = { userId: user.id, email: user.email, role: user.role }
    logInfo("登录成功", { userId: user.id, email: user.email }, { module: "auth", function: "login" })

    const accessToken = generateToken(payload)
    const refreshToken = generateRefreshToken(payload)

    // httpOnly Cookie 为主传输（XSS 不可读）；body tokens 保留供 API 客户端
    const res = NextResponse.json({
      success: true,
      message: "登录成功",
      data: {
        user,
        tokens: { accessToken, refreshToken, expiresIn: process.env.JWT_EXPIRES_IN || "2h" },
      },
      meta: { timestamp: new Date().toISOString() },
    })
    setAuthCookies(res, accessToken, refreshToken)
    return res
  } catch (error) {
    logError("登录失败", error, { module: "auth", function: "login" })
    return NextResponse.json({ success: false, error: "Server Error", message: "登录失败" }, { status: 500 })
  }
}
