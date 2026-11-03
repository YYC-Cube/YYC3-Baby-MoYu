/**
 * @fileoverview 前端错误上报端点（加固版）
 * @description 该端点**匿名可用**（崩溃可能发生在登录前），因此必须用「限流 + 体积上限 +
 *   字段白名单 + 长度截断」替代认证，否则会变成可任意写入日志/触发外发通知的公开写口。
 *   安全约束：
 *   1. 每 IP 10 次/分钟（进程内固定窗口）；
 *   2. 请求体 ≤ 8 KB（JSON 文本长度，解析前拦截）；
 *   3. zod 白名单解析：未知字段直接丢弃，不做透传；
 *   4. 所有文本字段截断（message 500 / stack 4 KB / url 300 / UA 300）；
 *   5. **不信任客户端声明的 userId**：身份只来自令牌（此处匿名，故不写身份字段）。
 * @author YYC³
 * @version 2.0.0
 * @created 2025-01-30
 * @modified 2026-11-02
 * @license MIT
 */

import { requireAuth } from "@/lib/auth/guard"
import { checkRateLimit } from "@/lib/rate-limit"
import { error as logError } from "@/lib/logger/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// 8 KB 足够容纳一条错误 + 调用栈片段；超出即为滥用或误用
const MAX_BODY_BYTES = 8 * 1024

const reportSchema = z.object({
  error: z.object({
    message: z.string().min(1).max(500),
    name: z.string().max(200).optional(),
    stack: z.string().max(4096).optional(),
  }),
  errorInfo: z
    .object({
      componentStack: z.string().max(2048).optional(),
      errorBoundaryStack: z.string().max(2048).optional(),
    })
    .optional(),
  userAgent: z.string().max(300).optional(),
  url: z.string().max(300).optional(),
  timestamp: z.string().max(40).optional(),
})

type ErrorReport = z.infer<typeof reportSchema>

/** 与登录/刷新同一取值口径；生产应确保反向代理覆写该头（见 docs/developer/08-deployment.md） */
function clientIP(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}

function isCriticalError(report: ErrorReport): boolean {
  const criticalMarkers = [
    "ChunkLoadError",
    "Loading CSS chunk",
    "Failed to fetch dynamically imported module",
    "Out of memory",
  ]
  const message = report.error.message
  return criticalMarkers.some((marker) => message.includes(marker))
}

/** 可选 Slack 外发：字段已截断，且失败静默（上报链路不能反过来影响主流程） */
async function notifySlack(report: ErrorReport): Promise<void> {
  const webhook = process.env.SLACK_WEBHOOK_URL
  if (!webhook) return
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "🚨 YYC³ 前端错误上报",
        attachments: [
          {
            color: "danger",
            fields: [
              { title: "错误信息", value: report.error.message.slice(0, 500), short: false },
              { title: "页面", value: (report.url ?? "").slice(0, 300), short: true },
              { title: "时间", value: report.timestamp ?? new Date().toISOString(), short: true },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.warn("[api/error-report] Slack 通知失败：", err instanceof Error ? err.message : err)
  }
}

export async function POST(request: NextRequest) {
  const ip = clientIP(request)
  const rl = checkRateLimit(`error-report:ip:${ip}`, 10, 60_000)
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate Limit", message: "上报过于频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    )
  }

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return NextResponse.json({ success: false, error: "Bad Request", message: "无法读取请求体" }, { status: 400 })
  }
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { success: false, error: "Payload Too Large", message: `上报体积超限（上限 ${MAX_BODY_BYTES} 字节）` },
      { status: 413 },
    )
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    return NextResponse.json({ success: false, error: "Bad Request", message: "请求体必须是 JSON" }, { status: 400 })
  }

  const parsed = reportSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation Error", message: parsed.error.issues[0]?.message ?? "上报格式不正确" },
      { status: 400 },
    )
  }

  const report: ErrorReport = {
    ...parsed.data,
    timestamp: parsed.data.timestamp ?? new Date().toISOString(),
  }

  try {
    logError("前端错误上报", {
      message: report.error.message,
      name: report.error.name,
      stack: report.error.stack,
      url: report.url,
      userAgent: report.userAgent,
      timestamp: report.timestamp,
      critical: isCriticalError(report),
    }, { module: "error-report", ip })

    // 外发不阻塞响应
    void notifySlack(report)

    return NextResponse.json({ success: true, message: "Error reported" })
  } catch (error) {
    console.error("[api/error-report] 写入日志失败：", error)
    return NextResponse.json({ success: false, error: "Server Error", message: "上报处理失败" }, { status: 500 })
  }
}

/**
 * GET 曾为公开占位端点（返回一段说明字符串），无实际数据但暴露了路由能力。
 * 现要求登录后再访问，避免匿名探测面扩大。
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  return NextResponse.json({ success: false, error: "Not Implemented", message: "错误统计尚未实现" }, { status: 501 })
}
