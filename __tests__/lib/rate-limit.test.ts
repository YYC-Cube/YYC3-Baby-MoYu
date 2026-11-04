/**
 * 限流器单元测试（lib/rate-limit）
 * 覆盖：窗口内计数、超限拒绝、不同 key 隔离、retryAfterSec 计算
 */

import { beforeEach, describe, expect, test } from "bun:test"
import { checkRateLimit, resetRateLimits } from "@/lib/rate-limit"

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimits()
  })

  test("窗口内应放行至限额", () => {
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit("k1", 3, 60_000)
      expect(r.allowed).toBe(true)
    }
    const r = checkRateLimit("k1", 3, 60_000)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  test("remaining 应递减", () => {
    expect(checkRateLimit("k2", 5, 60_000).remaining).toBe(4)
    expect(checkRateLimit("k2", 5, 60_000).remaining).toBe(3)
  })

  test("不同 key 互不影响", () => {
    checkRateLimit("a", 1, 60_000)
    const a = checkRateLimit("a", 1, 60_000)
    const b = checkRateLimit("b", 1, 60_000)
    expect(a.allowed).toBe(false)
    expect(b.allowed).toBe(true)
  })

  test("超限时应返回正的 retryAfterSec", () => {
    checkRateLimit("k3", 1, 60_000)
    const r = checkRateLimit("k3", 1, 60_000)
    expect(r.allowed).toBe(false)
    expect(r.retryAfterSec).toBeGreaterThanOrEqual(1)
    expect(r.retryAfterSec).toBeLessThanOrEqual(60)
  })

  test("窗口过期后应重置计数", async () => {
    checkRateLimit("k4", 1, 1)
    const first = checkRateLimit("k4", 1, 1)
    expect(first.allowed).toBe(false)
    await new Promise((r) => setTimeout(r, 5))
    const second = checkRateLimit("k4", 1, 1)
    expect(second.allowed).toBe(true)
  })

  test("超过 MAX_KEYS 上限时触发全量过期清理", async () => {
    try {
      // 灌入 > 10000 个 key，随后令其全部过期
      for (let i = 0; i < 10_005; i++) {
        checkRateLimit(`sweep:${i}`, 1, 5)
      }
      await new Promise((r) => setTimeout(r, 10))
      // 该次检查触发 sweep 分支（buckets.size > MAX_KEYS）
      const r = checkRateLimit("sweep:final", 1, 5)
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBe(0)
    } finally {
      resetRateLimits()
    }
  })
})
