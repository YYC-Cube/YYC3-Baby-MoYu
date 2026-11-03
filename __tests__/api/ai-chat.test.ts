/**
 * @fileoverview /api/ai/chat 行为测试（真实端点，非镜像 mock）
 * @description 覆盖四类契约：
 *   1. 未认证 → 401；2. 入参校验 → 400；3. 未配置模型 → SSE 首帧 demo:true（诚实降级）；
 *   4. 限流 → 401/400 也计数，第 21 次 429。
 *   auth/service 走模块 mock（与 api/auth-routes.test.ts 同一范式），JWT 为真实签发/校验。
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import { generateToken } from "@/lib/auth/jwt"
import { resetRateLimits } from "@/lib/rate-limit"

// 注意：Bun 的 mock.module 在同一进程内共享同一模块路径，
// 因此这里给出**超集**导出（含 login/register 用到的符号），避免与其他测试文件的 mock 冲突。
mock.module("@/lib/auth/service", () => ({
  findUserById: async (id: string) => ({
    id,
    email: "chat@t.cn",
    role: "parent",
    is_active: 1,
    created_at: "2026-01-01",
  }),
  findUserByEmail: async () => null,
  verifyPassword: async (plain: string, hash: string | null) => hash === `hash:${plain}`,
  createUser: async () => {
    throw new Error("测试环境不创建用户")
  },
  touchLastLogin: async () => {},
  toAuthUser: (row: { id: string; email: string; role?: string }) => ({
    id: row.id,
    email: row.email,
    firstName: "",
    lastName: "",
    role: row.role ?? "parent",
    emailVerified: false,
    isActive: true,
    createdAt: "2026-01-01",
  }),
}))

// 日志 mock：避免测试期间写 logs/
mock.module("@/lib/logger/server", () => ({ error: () => {}, info: () => {}, warn: () => {} }))

const chatRoute = await import("../../app/api/ai/chat/route")

const token = () => generateToken({ userId: "u-chat", email: "chat@t.cn", role: "parent" })

const post = (body: unknown, withAuth = true) =>
  new Request("http://localhost/api/ai/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(withAuth ? { authorization: `Bearer ${token()}` } : {}),
    },
    body: JSON.stringify(body),
  })

/** 取 SSE 首个 data 帧的 JSON（meta 帧） */
async function firstEvent(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text()
  const line = text.split("\n").find((l) => l.startsWith("data: "))
  if (!line) throw new Error("SSE 无 data 帧")
  return JSON.parse(line.replace(/^data: /, "")) as Record<string, unknown>
}

beforeEach(() => {
  resetRateLimits()
  // 固定为「未配置模型」场景：断言降级必须可感知
  delete process.env.OPENAI_API_KEY
})

describe("POST /api/ai/chat", () => {
  test("未认证 → 401 且不进入流式分支", async () => {
    const res = await chatRoute.POST(post({ message: "你好" }, false))
    expect(res.status).toBe(401)
    const body = (await res.json()) as { success?: boolean }
    expect(body.success).toBe(false)
  })

  test("空消息 → 400（zod 校验生效）", async () => {
    const res = await chatRoute.POST(post({ message: "" }))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBe("Validation Error")
  })

  test("超长消息（>4000）→ 400", async () => {
    const res = await chatRoute.POST(post({ message: "啊".repeat(4001) }))
    expect(res.status).toBe(400)
  })

  test("未配置 OPENAI_API_KEY → SSE 首帧 demo:true，并保留 role 声明", async () => {
    const res = await chatRoute.POST(post({ message: "宝宝不爱睡觉怎么办", role: "advisor" }))
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type") ?? "").toContain("text/event-stream")

    const meta = await firstEvent(res)
    expect(meta.type).toBe("meta")
    expect(meta.demo).toBe(true)
    expect(meta.model).toBeNull()
    expect(meta.role).toBe("advisor")
  })

  test("非法 role 回落为按上下文选择（不 500）", async () => {
    const res = await chatRoute.POST(post({ message: "宝宝发烧了", role: "not-a-role" }))
    expect(res.status).toBe(200)
    const meta = await firstEvent(res)
    expect(meta.demo).toBe(true)
    expect(["companion", "recorder", "guardian", "listener", "advisor", "cultural"]).toContain(
      meta.role as string,
    )
  })

  test("限流：非法入参同样计数，第 21 次返回 429 + Retry-After", async () => {
    for (let i = 0; i < 20; i += 1) {
      const res = await chatRoute.POST(post({ message: "" }))
      expect(res.status).toBe(400)
    }
    const blocked = await chatRoute.POST(post({ message: "" }))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("retry-after")).toBeTruthy()
  })
})
