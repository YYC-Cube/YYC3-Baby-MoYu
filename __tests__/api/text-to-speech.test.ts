/**
 * @fileoverview /api/ai/text-to-speech 服务端代理测试
 * 覆盖：未认证 401、未配置密钥 503、入参校验 400（空文本/超长/非法音色/非法语速）、
 *   成功返回音频二进制与响应头、上游失败 502、降级 fallback 视为上游异常 502。
 *   voice-services 走模块 mock（须给出导出超集，避免与其他测试文件冲突）。
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import { generateToken } from "@/lib/auth/jwt"
import { resetRateLimits } from "@/lib/rate-limit"

let configured = true
let upstreamFail = false
let fallbackMode = false
let lastCall: { text: string; voice?: string; speed?: number } | null = null

mock.module("@/lib/auth/service", () => ({
  findUserById: async (id: string) => ({
    id,
    email: "tts@t.cn",
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

mock.module("@/lib/logger/server", () => ({ error: () => {}, info: () => {}, warn: () => {} }))

/** 导出超集：speech-to-text 路由也引用 getVoiceService，须一并提供 */
mock.module("@/lib/api/voice-services", () => ({
  TTS_VOICES: ["tongtong", "chuichui", "xiaochen", "jam", "kazi", "douji", "luodo"],
  hasVoiceService: () => configured,
  getVoiceService: () => ({
    textToSpeech: async (text: string, options: { voice?: string; speed?: number }) => {
      lastCall = { text, voice: options.voice, speed: options.speed }
      if (upstreamFail) throw new Error("upstream down")
      if (fallbackMode) return { audio: new Blob(), format: "fallback" }
      return { audio: new Blob([new Uint8Array([1, 2, 3])]), format: "wav" }
    },
    uploadAndTranscribe: async () => "转写结果",
  }),
}))

const ttsRoute = await import("../../app/api/ai/text-to-speech/route")

const token = () => generateToken({ userId: "u-tts", email: "tts@t.cn", role: "parent" })

const post = (body: unknown, withAuth = true) =>
  new Request("http://localhost/api/ai/text-to-speech", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(withAuth ? { authorization: `Bearer ${token()}` } : {}),
    },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  resetRateLimits()
  configured = true
  upstreamFail = false
  fallbackMode = false
  lastCall = null
})

describe("POST /api/ai/text-to-speech", () => {
  test("未认证 → 401", async () => {
    const res = await ttsRoute.POST(post({ text: "你好" }, false))
    expect(res.status).toBe(401)
  })

  test("未配置语音密钥 → 503", async () => {
    configured = false
    const res = await ttsRoute.POST(post({ text: "你好" }))
    expect(res.status).toBe(503)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toContain("未配置")
  })

  test("空文本 → 400", async () => {
    const res = await ttsRoute.POST(post({ text: "" }))
    expect(res.status).toBe(400)
  })

  test("超长文本（>2000）→ 400", async () => {
    const res = await ttsRoute.POST(post({ text: "啊".repeat(2001) }))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toContain("文本过长")
  })

  test("非法音色 → 400（白名单拦截）", async () => {
    const res = await ttsRoute.POST(post({ text: "你好", voice: "evil-voice" }))
    expect(res.status).toBe(400)
    expect(lastCall).toBeNull()
  })

  test("非法语速（越界）→ 400", async () => {
    const res = await ttsRoute.POST(post({ text: "你好", speed: 9 }))
    expect(res.status).toBe(400)
  })

  test("请求体非 JSON → 400", async () => {
    const res = await ttsRoute.POST(
      new Request("http://localhost/api/ai/text-to-speech", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token()}` },
        body: "not-json",
      }),
    )
    expect(res.status).toBe(400)
  })

  test("成功 → 200 音频二进制 + no-store + 音色透传", async () => {
    const res = await ttsRoute.POST(post({ text: "你好呀", voice: "chuichui", speed: 1.2 }))
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("audio/wav")
    expect(res.headers.get("Cache-Control")).toContain("no-store")
    expect(res.headers.get("X-Audio-Format")).toBe("wav")
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(bytes.length).toBe(3)
    expect(lastCall).toEqual({ text: "你好呀", voice: "chuichui", speed: 1.2 })
  })

  test("默认音色为 tongtong", async () => {
    await ttsRoute.POST(post({ text: "默认音色" }))
    expect(lastCall?.voice).toBe("tongtong")
  })

  test("上游抛错 → 502", async () => {
    upstreamFail = true
    const res = await ttsRoute.POST(post({ text: "你好" }))
    expect(res.status).toBe(502)
  })

  test("上游返回 fallback 标记 → 502（服务端不应走浏览器降级路径）", async () => {
    fallbackMode = true
    const res = await ttsRoute.POST(post({ text: "你好" }))
    expect(res.status).toBe(502)
  })
})
