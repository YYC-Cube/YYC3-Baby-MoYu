/**
 * @fileoverview AI 路由统一守卫：认证 + 限流
 * @description AI 端点消耗真实外部 API 额度（BigModel/fal.ai），
 *   必须登录后访问且按用户限流。各 route.ts 顶部调用：
 *   const guard = await guardAIRequest(request, { name: "chat" })
 *   if (guard instanceof NextResponse) return guard
 */

import { requireAuth, type AuthContext } from "@/lib/auth/guard"
import { checkRateLimit } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export interface AIRequestOptions {
  /** 路由名，用于限流键隔离 */
  name: string
  /** 窗口内最大次数，默认 20 */
  limit?: number
  /** 窗口长度（毫秒），默认 60s */
  windowMs?: number
}

/**
 * AI 路由入口守卫：未登录 → 401；超频 → 429（带 Retry-After）
 * @returns 认证上下文（通过）或 NextResponse（拒绝）
 */
export async function guardAIRequest(
  request: Request,
  options: AIRequestOptions
): Promise<AuthContext | NextResponse> {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { name, limit = 20, windowMs = 60_000 } = options
  const rl = await checkRateLimit(`ai:${name}:${auth.user.id}`, limit, windowMs)

  if (!rl.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate Limit",
        message: `请求过于频繁，请 ${rl.retryAfterSec} 秒后再试`,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    )
  }

  return auth
}
