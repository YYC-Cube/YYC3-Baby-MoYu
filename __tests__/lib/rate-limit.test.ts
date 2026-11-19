/**
 * 限流器单元测试（lib/rate-limit）
 * 覆盖：内存固定窗口行为（放行/超限/隔离/过期/清扫）、
 *   Upstash REST 存储的窗口计数与 Retry-After、存储故障回退、环境变量选择存储。
 */

import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test"
import {
  MemoryRateLimitStore,
  UpstashRateLimitStore,
  checkRateLimit,
  createStoreFromEnv,
  resetRateLimits,
  setRateLimitStore,
} from "@/lib/rate-limit"

const originalFetch = globalThis.fetch

beforeEach(() => {
  setRateLimitStore(new MemoryRateLimitStore())
  resetRateLimits()
})

afterAll(() => {
  globalThis.fetch = originalFetch
  setRateLimitStore(null)
})

describe("内存存储（默认）", () => {
  test("窗口内应放行至限额", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await checkRateLimit("k1", 3, 60_000)
      expect(r.allowed).toBe(true)
    }
    const r = await checkRateLimit("k1", 3, 60_000)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  test("remaining 应递减", async () => {
    expect((await checkRateLimit("k2", 5, 60_000)).remaining).toBe(4)
    expect((await checkRateLimit("k2", 5, 60_000)).remaining).toBe(3)
  })

  test("不同 key 互不影响", async () => {
    await checkRateLimit("a", 1, 60_000)
    const a = await checkRateLimit("a", 1, 60_000)
    const b = await checkRateLimit("b", 1, 60_000)
    expect(a.allowed).toBe(false)
    expect(b.allowed).toBe(true)
  })

  test("超限时应返回正的 retryAfterSec", async () => {
    await checkRateLimit("k3", 1, 60_000)
    const r = await checkRateLimit("k3", 1, 60_000)
    expect(r.allowed).toBe(false)
    expect(r.retryAfterSec).toBeGreaterThanOrEqual(1)
    expect(r.retryAfterSec).toBeLessThanOrEqual(60)
  })

  test("窗口过期后应重置计数", async () => {
    await checkRateLimit("k4", 1, 1)
    expect((await checkRateLimit("k4", 1, 1)).allowed).toBe(false)
    await new Promise((r) => setTimeout(r, 5))
    expect((await checkRateLimit("k4", 1, 1)).allowed).toBe(true)
  })

  test("超过 MAX_KEYS 上限时触发全量过期清理", async () => {
    for (let i = 0; i < 10_005; i++) {
      await checkRateLimit(`sweep:${i}`, 1, 5)
    }
    await new Promise((r) => setTimeout(r, 10))
    const r = await checkRateLimit("sweep:final", 1, 5)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(0)
  })
})

describe("Upstash 存储", () => {
  const calls: Array<Array<string | number>> = []
  let replies: number[] = []

  function useUpstash() {
    calls.length = 0
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(JSON.parse(String(init?.body)) as Array<string | number>)
      const result = replies.shift() ?? 0
      return new Response(JSON.stringify({ result }), { status: 200 })
    }) as unknown as typeof fetch
    setRateLimitStore(new UpstashRateLimitStore("https://example.upstash.io", "test-token"))
  }

  test("首次命中写入 INCR + PEXPIRE，键带命名空间", async () => {
    replies = [1, 1]
    useUpstash()

    const r = await checkRateLimit("ai:chat:u1", 5, 60_000)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(4)
    expect(calls[0]).toEqual(["INCR", "yyc3:rl:ai:chat:u1"])
    expect(calls[1]).toEqual(["PEXPIRE", "yyc3:rl:ai:chat:u1", 60_000])
    expect(calls).toHaveLength(2)
  })

  test("窗口内后续命中只发 INCR", async () => {
    replies = [2]
    useUpstash()

    const r = await checkRateLimit("ai:chat:u2", 5, 60_000)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(3)
    expect(calls).toEqual([["INCR", "yyc3:rl:ai:chat:u2"]])
  })

  test("超限时读取 PTTL 计算 Retry-After", async () => {
    replies = [6, 30_000]
    useUpstash()

    const r = await checkRateLimit("ai:chat:u3", 5, 60_000)
    expect(r.allowed).toBe(false)
    expect(r.retryAfterSec).toBe(30)
    expect(calls.at(-1)).toEqual(["PTTL", "yyc3:rl:ai:chat:u3"])
  })

  test("存储故障回退内存，保证可用性", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("network down")
    }) as unknown as typeof fetch
    setRateLimitStore(new UpstashRateLimitStore("https://example.upstash.io", "test-token"))

    const warn = mock(() => {})
    const originalWarn = console.warn
    console.warn = warn
    try {
      const r = await checkRateLimit("fallback:k", 2, 60_000)
      expect(r.allowed).toBe(true)
      expect(warn).toHaveBeenCalledTimes(1)
    } finally {
      console.warn = originalWarn
    }
  })
})

describe("存储选择", () => {
  test("未配置 Upstash 时使用内存", () => {
    expect(createStoreFromEnv({} as NodeJS.ProcessEnv).kind).toBe("memory")
  })

  test("配置成对变量后使用 Upstash", () => {
    const store = createStoreFromEnv({
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
    } as NodeJS.ProcessEnv)
    expect(store.kind).toBe("upstash")
  })

  test("只配 URL 不配令牌时仍回退内存（避免半配置误连）", () => {
    const store = createStoreFromEnv({
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    } as NodeJS.ProcessEnv)
    expect(store.kind).toBe("memory")
  })
})
