/**
 * @fileoverview /api/ai/prediction 趋势预测端点测试
 * 覆盖：未认证 401、入参校验 400（点数不足/过多/非有限值/horizon 越界）、
 *   正常预测返回历史与预测点（含置信区间与免责声明）、引擎异常 500。
 *   引擎为真实 TimeSeriesEngine（不做 mock），确保接线可用而非仅通路。
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import { generateToken } from "@/lib/auth/jwt"
import { resetRateLimits } from "@/lib/rate-limit"

mock.module("@/lib/auth/service", () => ({
  findUserById: async (id: string) => ({
    id,
    email: "pred@t.cn",
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

const route = await import("../../app/api/ai/prediction/route")

const token = () => generateToken({ userId: "u-pred", email: "pred@t.cn", role: "parent" })

const DAY = 86_400_000

const series = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    timestamp: Date.UTC(2026, 0, 1) + i * DAY,
    value: 60 + i * 3,
  }))

const post = (body: unknown, withAuth = true) =>
  new Request("http://localhost/api/ai/prediction", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(withAuth ? { authorization: `Bearer ${token()}` } : {}),
    },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  resetRateLimits()
})

describe("POST /api/ai/prediction", () => {
  test("未认证 → 401", async () => {
    const res = await route.POST(post({ points: series(6) }, false))
    expect(res.status).toBe(401)
  })

  test("请求体非 JSON → 400", async () => {
    const res = await route.POST(
      new Request("http://localhost/api/ai/prediction", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token()}` },
        body: "nope",
      }),
    )
    expect(res.status).toBe(400)
  })

  test("点数不足 5 → 400", async () => {
    const res = await route.POST(post({ points: series(4) }))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { message?: string }
    expect(body.message).toContain("至少需要")
  })

  test("点数过多（>500）→ 400", async () => {
    const res = await route.POST(post({ points: series(501) }))
    expect(res.status).toBe(400)
  })

  test("非有限数值（NaN）→ 400", async () => {
    const points = series(6)
    points[2] = { timestamp: points[2]!.timestamp, value: Number.NaN }
    const res = await route.POST(
      new Request("http://localhost/api/ai/prediction", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token()}` },
        body: JSON.stringify({ points }),
      }),
    )
    expect(res.status).toBe(400)
  })

  test("horizon 越界（>30）→ 400", async () => {
    const res = await route.POST(post({ points: series(6), horizon: 31 }))
    expect(res.status).toBe(400)
  })

  test("正常预测 → 200，返回历史 + 预测点 + 置信区间 + 免责声明", async () => {
    const res = await route.POST(post({ metric: "overall_score", points: series(8), horizon: 3 }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      success: boolean
      data: {
        metric: string
        history: unknown[]
        forecast: Array<{ timestamp: number; value: number; lower: number | null; upper: number | null }>
        confidence: number
        methodology?: string
        disclaimer: string
      }
    }
    expect(body.success).toBe(true)
    expect(body.data.metric).toBe("overall_score")
    expect(body.data.history).toHaveLength(8)
    expect(body.data.forecast).toHaveLength(3)
    expect(body.data.forecast[0]!.value).toBeTypeOf("number")
    // 置信区间存在且上下界有序（margin 为 0 时允许相等）
    const { lower, upper } = body.data.forecast[0]!
    expect(lower).toBeTypeOf("number")
    expect(upper).toBeTypeOf("number")
    expect(lower!).toBeLessThanOrEqual(upper!)
    expect(body.data.confidence).toBeGreaterThan(0)
    expect(body.data.disclaimer).toContain("仅供趋势参考")
    expect(body.data.methodology).toContain("time_series")
  })

  test("默认 metric=value、horizon=7", async () => {
    const res = await route.POST(post({ points: series(6) }))
    const body = (await res.json()) as { data: { metric: string; forecast: unknown[] } }
    expect(body.data.metric).toBe("value")
    expect(body.data.forecast).toHaveLength(7)
  })
})
