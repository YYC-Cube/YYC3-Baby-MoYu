/**
 * 认证 API 路由测试（login / register / refresh）
 * mock 用户服务与日志，认证链走真实 JWT（含 type 声明）。
 * 覆盖：登录错误泛化、注册防枚举（响应不可区分）、auth 限流、令牌类型混用拒绝。
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import { verifyToken } from "@/lib/auth/jwt"
import { resetRateLimits } from "@/lib/rate-limit"

const users = new Map<string, { id: string; email: string; password_hash: string; role: string; is_active: number }>()

// 故障注入：用户查询抛错 → 验证路由 500 兜底
let failUserLookup = false

mock.module("@/lib/auth/service", () => ({
  findUserByEmail: async (email: string) => users.get(email) ?? null,
  findUserById: async (id: string) => {
    if (failUserLookup) throw new Error("db down")
    return [...users.values()].find((u) => u.id === id) ?? null
  },
  toAuthUser: (row: any) => ({
    id: row.id, email: row.email, firstName: "", lastName: "", role: row.role ?? "parent",
    emailVerified: false, isActive: (row.is_active ?? 1) === 1, createdAt: "2026-01-01",
  }),
  // 演示语义：密码等于 "right-pass" 视为正确
  verifyPassword: async (plain: string, hash: string | null) => hash === `hash:${plain}`,
  createUser: async (data: any) => {
    if (users.has(data.email)) throw new Error("该邮箱已注册")
    const u = { id: `u-${data.email}`, email: data.email, password_hash: `hash:${data.password}`, role: "parent", is_active: 1 }
    users.set(data.email, u)
    return u
  },
  touchLastLogin: async () => {},
}))

// 日志 mock：避免测试写文件
mock.module("@/lib/logger/server", () => ({ error: () => {}, info: () => {}, warn: () => {} }))

const loginRoute = await import("../../app/api/auth/login/route")
const registerRoute = await import("../../app/api/auth/register/route")
const refreshRoute = await import("../../app/api/auth/refresh/route")

const post = (url: string, body: unknown) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

const j = async (res: Response) => ({ status: res.status, body: await res.json() })

beforeEach(() => {
  users.clear()
  users.set("known@t.cn", { id: "u-known", email: "known@t.cn", password_hash: "hash:right-pass", role: "parent", is_active: 1 })
  failUserLookup = false
  resetRateLimits()
})

describe("POST /api/auth/login", () => {
  test("正确凭据 → tokens 且类型声明正确", async () => {
    const res = await loginRoute.POST(post("http://x/login", { email: "known@t.cn", password: "right-pass" }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(verifyToken(body.data.tokens.accessToken, "access").userId).toBe("u-known")
    expect(verifyToken(body.data.tokens.refreshToken, "refresh").userId).toBe("u-known")
    // httpOnly Cookie 传输：access + refresh 都应设置
    const setCookie = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""]
    const all = setCookie.join("\n")
    expect(all).toContain("yyc3_at=")
    expect(all).toContain("yyc3_rt=")
    expect(all).toContain("HttpOnly")
  })

  test("错误密码与不存在邮箱的响应不可区分", async () => {
    const wrong = await j(await loginRoute.POST(post("http://x/login", { email: "known@t.cn", password: "wrong" })))
    const absent = await j(await loginRoute.POST(post("http://x/login", { email: "ghost@t.cn", password: "whatever" })))
    expect(wrong.status).toBe(absent.status)
    expect(wrong.body.message).toBe(absent.body.message)
    expect(wrong.body.message).toBe("邮箱或密码错误")
  })

  test("同邮箱连续失败 5 次后 → 429", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await loginRoute.POST(post("http://x/login", { email: "known@t.cn", password: "wrong" }))
      expect(r.status).toBe(401)
    }
    const { status, body } = await j(await loginRoute.POST(post("http://x/login", { email: "known@t.cn", password: "right-pass" })))
    expect(status).toBe(429)
    expect(body.message).toContain("频繁")
  })
})

describe("POST /api/auth/register", () => {
  test("新注册与重复注册的响应不可区分（防枚举），且均无 tokens", async () => {
    const fresh = await j(await registerRoute.POST(post("http://x/reg", { email: "new@t.cn", password: "password123", firstName: "N" })))
    const dup = await j(await registerRoute.POST(post("http://x/reg", { email: "new@t.cn", password: "password456", firstName: "E" })))
    expect(fresh.status).toBe(201)
    expect(dup.status).toBe(201)
    expect(fresh.body.message).toBe(dup.body.message)
    expect(JSON.stringify(fresh.body)).not.toContain("accessToken")
    expect(JSON.stringify(dup.body)).not.toContain("accessToken")
    expect(JSON.stringify(dup.body)).not.toContain("u-new@t.cn") // 不泄露已有用户 id
  })

  test("注册后原密码可登录、枚举者密码不可登录", async () => {
    await registerRoute.POST(post("http://x/reg", { email: "own@t.cn", password: "password123", firstName: "O" }))
    const ok = await j(await loginRoute.POST(post("http://x/login", { email: "own@t.cn", password: "password123" })))
    const evil = await j(await loginRoute.POST(post("http://x/login", { email: "own@t.cn", password: "attacker-pass" })))
    expect(ok.status).toBe(200)
    expect(evil.status).toBe(401)
  })
})

describe("POST /api/auth/refresh", () => {
  test("access 令牌不可用于刷新", async () => {
    const login = await j(await loginRoute.POST(post("http://x/login", { email: "known@t.cn", password: "right-pass" })))
    const { status } = await j(await refreshRoute.POST(post("http://x/refresh", { refreshToken: login.body.data.tokens.accessToken })))
    expect(status).toBe(401)
  })

  test("refresh 令牌换取新 access", async () => {
    const login = await j(await loginRoute.POST(post("http://x/login", { email: "known@t.cn", password: "right-pass" })))
    const { status, body } = await j(await refreshRoute.POST(post("http://x/refresh", { refreshToken: login.body.data.tokens.refreshToken })))
    expect(status).toBe(200)
    expect(verifyToken(body.data.token, "access").userId).toBe("u-known")
  })

  test("429：超过每 IP 15 次/分钟限流（无效请求同样计入窗口）", async () => {
    for (let i = 0; i < 15; i++) {
      const r = await refreshRoute.POST(post("http://x/refresh", {}))
      expect(r.status).toBe(400)
    }
    const { status, body } = await j(await refreshRoute.POST(post("http://x/refresh", {})))
    expect(status).toBe(429)
    expect(body.message).toContain("频繁")
  })

  test("400：refreshToken 类型非法（schema 校验失败）", async () => {
    const { status } = await j(await refreshRoute.POST(post("http://x/refresh", { refreshToken: 123 })))
    expect(status).toBe(400)
  })

  test("400：body 与 Cookie 均无 refreshToken", async () => {
    const { status, body } = await j(await refreshRoute.POST(post("http://x/refresh", {})))
    expect(status).toBe(400)
    expect(body.message).toBe("refreshToken 为必填")
  })

  test("400：Cookie 存在但无 yyc3_rt 字段", async () => {
    const req = new Request("http://x/refresh", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "sid=1; yyc3_at=stolen-access" },
      body: JSON.stringify({}),
    })
    const { status } = await j(await refreshRoute.POST(req))
    expect(status).toBe(400)
  })

  test("Cookie 浏览器路径：yyc3_rt 换取新 access 并重设 httpOnly Cookie", async () => {
    const loginRes = await loginRoute.POST(post("http://x/login", { email: "known@t.cn", password: "right-pass" }))
    const rt = (loginRes.headers.getSetCookie?.() ?? [])
      .find((c) => c.startsWith("yyc3_rt="))
      ?.split(";")[0]
      ?.slice("yyc3_rt=".length)
    expect(rt).toBeTruthy()

    const req = new Request("http://x/refresh", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `sid=1; yyc3_rt=${rt}` },
      body: JSON.stringify({}),
    })
    const res = await refreshRoute.POST(req)
    const { status, body } = await j(res)
    expect(status).toBe(200)
    expect(verifyToken(body.data.token, "access").userId).toBe("u-known")
    const all = (res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""]).join("\n")
    expect(all).toContain("yyc3_at=")
    expect(all).toContain("HttpOnly")
  })

  test("401：令牌有效但用户已被删除", async () => {
    const login = await j(await loginRoute.POST(post("http://x/login", { email: "known@t.cn", password: "right-pass" })))
    users.clear()
    const { status, body } = await j(await refreshRoute.POST(post("http://x/refresh", { refreshToken: login.body.data.tokens.refreshToken })))
    expect(status).toBe(401)
    expect(body.message).toBe("用户不存在")
  })

  test("403：账号已停用", async () => {
    const login = await j(await loginRoute.POST(post("http://x/login", { email: "known@t.cn", password: "right-pass" })))
    const row = users.get("known@t.cn")
    if (row) row.is_active = 0
    const { status, body } = await j(await refreshRoute.POST(post("http://x/refresh", { refreshToken: login.body.data.tokens.refreshToken })))
    expect(status).toBe(403)
    expect(body.message).toBe("账号已停用")
  })

  test("500：用户查询抛错走兜底日志路径", async () => {
    const login = await j(await loginRoute.POST(post("http://x/login", { email: "known@t.cn", password: "right-pass" })))
    failUserLookup = true
    const { status, body } = await j(await refreshRoute.POST(post("http://x/refresh", { refreshToken: login.body.data.tokens.refreshToken })))
    expect(status).toBe(500)
    expect(body.message).toBe("刷新令牌失败")
  })
})
