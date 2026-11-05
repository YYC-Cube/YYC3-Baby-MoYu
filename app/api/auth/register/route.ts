import bcrypt from "bcryptjs"
import { createUser } from "@/lib/auth/service"
import { error as logError, info as logInfo } from "@/lib/logger/server"
import { checkRateLimit } from "@/lib/rate-limit"
import { NextResponse } from "next/server"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
  firstName: z.string().min(1, "姓名为必填"),
  lastName: z.string().optional().default(""),
  phone: z.string().optional(),
})

// 枚举防护：注册成功与否响应完全一致（不返回用户数据/令牌，不泄露邮箱是否已注册）。
// 客户端注册后统一走登录：新用户用刚提交的密码登录成功，重复邮箱登录失败（错误信息与"密码错误"不可区分）。
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json().catch(() => null)
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: parsed.error.issues[0]?.message || "参数错误" },
        { status: 400 }
      )
    }

    // 限流：每 IP 5 次/分钟
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (!checkRateLimit(`register:ip:${ip}`, 5, 60_000).allowed) {
      return NextResponse.json({ success: false, error: "Rate Limit", message: "注册尝试过于频繁，请稍后再试" }, { status: 429 })
    }

    // 哑哈希：抹平"新注册（真哈希）vs 重复邮箱（无哈希）"的时序差，防时序侧信道枚举
    const dummyHash = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9RhMDzMdgDbmL0z2oQvVcA2m0dBZ5Xu"

    try {
      await createUser(parsed.data)
      logInfo("注册成功", { email: parsed.data.email }, { module: "auth", function: "register" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "注册失败"
      if (message.includes("已注册")) {
        // 邮箱已存在：静默 no-op，响应与新注册完全一致，防止账号枚举
        await bcrypt.compare(parsed.data.password, dummyHash)
        return NextResponse.json(
          { success: true, message: "注册成功，请使用邮箱和密码登录", meta: { timestamp: new Date().toISOString() } },
          { status: 201 }
        )
      }
      throw error
    }

    return NextResponse.json(
      { success: true, message: "注册成功，请使用邮箱和密码登录", meta: { timestamp: new Date().toISOString() } },
      { status: 201 }
    )
  } catch (error) {
    logError("注册失败", error, { module: "auth", function: "register" })
    return NextResponse.json({ success: false, error: "Server Error", message: "注册失败" }, { status: 500 })
  }
}
