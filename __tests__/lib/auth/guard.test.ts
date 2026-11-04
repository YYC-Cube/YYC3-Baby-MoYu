/**
 * lib/auth/guard.ts 分支补测
 * requireAuth：401 缺令牌/无效/过期/类型不符/用户不存在、403 CSRF 拒绝/账号停用、
 * Bearer 与 Cookie 双通道、Origin 同源/受信源/严格模式判定；requireRole 单/多角色。
 * service mock 遵循跨文件导出并集约定（findUserById/findUserByEmail/toAuthUser/
 * createUser/verifyPassword/touchLastLogin）。
 */

import { afterEach, describe, expect, mock, test } from "bun:test"
import type { JWTPayload } from "../../../lib/auth/jwt"

interface Row { id: string; email: string; is_active?: number; role?: string; created_at?: string }
const users: Row[] = []

mock.module("@/lib/auth/service", () => ({
  findUserById: async (id: string) => users.find((u) => u.id === id) ?? null,
  findUserByEmail: async (email: string) => users.find((u) => u.email === email) ?? null,
  toAuthUser: (row: Row) => ({
    id: row.id, email: row.email, firstName: "", lastName: "",
    role: row.role ?? "parent", emailVerified: false,
    isActive: (row.is_active ?? 1) === 1, createdAt: row.created_at ?? "",
  }),
  createUser: async () => { throw new Error("unused") },
  verifyPassword: async () => true,
  touchLastLogin: async () => {},
}))

const { requireAuth, requireRole } = await import("../../../lib/auth/guard")
const { generateToken, generateRefreshToken } = await import("../../../lib/auth/jwt")

function tokenFor(userId: string): string {
  const payload: JWTPayload = { userId, email: `${userId}@t.cn`, role: "parent" }
  return generateToken(payload)
}

const j = async (res: Response) => ({ status: res.status, body: await res.json() })

afterEach(() => {
  users.length = 0
  delete process.env.CSRF_TRUSTED_ORIGINS
  delete process.env.CSRF_REQUIRE_ORIGIN
})

describe("requireAuth · 认证守卫", () => {
  test("无任何令牌 → 401 缺少认证令牌", async () => {
    const { status, body } = await j(await requireAuth(new Request("http://x/api")))
    expect(status).toBe(401)
    expect(body.message).toBe("缺少认证令牌")
  })

  test("Bearer 有效令牌 → AuthContext（user + payload）", async () => {
    users.push({ id: "user-a", email: "a@t.cn", is_active: 1 })
    const req = new Request("http://x/api", { headers: { authorization: `Bearer ${tokenFor("user-a")}` } })
    const auth = await requireAuth(req)
    expect(auth).not.toBeInstanceOf(Response)
    const ctx = auth as { user: { id: string }; payload: { userId: string } }
    expect(ctx.user.id).toBe("user-a")
    expect(ctx.payload.userId).toBe("user-a")
  })

  test("无效令牌 → 401 无效令牌", async () => {
    const { status, body } = await j(await requireAuth(
      new Request("http://x/api", { headers: { authorization: "Bearer not-a-jwt" } })
    ))
    expect(status).toBe(401)
    expect(body.message).toBe("无效令牌")
  })

  test("过期令牌 → 401 令牌已过期", async () => {
    const prev = process.env.JWT_EXPIRES_IN
    try {
      process.env.JWT_EXPIRES_IN = "1" // 1ms，立即过期
      const expired = tokenFor("user-a")
      await new Promise((r) => setTimeout(r, 30))
      const { status, body } = await j(await requireAuth(
        new Request("http://x/api", { headers: { authorization: `Bearer ${expired}` } })
      ))
      expect(status).toBe(401)
      expect(body.message).toBe("令牌已过期")
    } finally {
      if (prev === undefined) delete process.env.JWT_EXPIRES_IN
      else process.env.JWT_EXPIRES_IN = prev
    }
  })

  test("refresh 令牌不得当 access 用 → 401（类型声明校验）", async () => {
    const payload: JWTPayload = { userId: "user-a", email: "a@t.cn", role: "parent" }
    const { status } = await j(await requireAuth(
      new Request("http://x/api", { headers: { authorization: `Bearer ${generateRefreshToken(payload)}` } })
    ))
    expect(status).toBe(401)
  })

  test("用户不存在 → 401 用户不存在", async () => {
    const { status, body } = await j(await requireAuth(
      new Request("http://x/api", { headers: { authorization: `Bearer ${tokenFor("ghost")}` } })
    ))
    expect(status).toBe(401)
    expect(body.message).toBe("用户不存在")
  })

  test("账号停用 → 403 账号已停用", async () => {
    users.push({ id: "user-x", email: "x@t.cn", is_active: 0 })
    const { status, body } = await j(await requireAuth(
      new Request("http://x/api", { headers: { authorization: `Bearer ${tokenFor("user-x")}` } })
    ))
    expect(status).toBe(403)
    expect(body.message).toBe("账号已停用")
  })

  test("Cookie 认证跨源写请求 → 403 CSRF 拒绝", async () => {
    users.push({ id: "user-a", email: "a@t.cn" })
    const req = new Request("http://x/api", {
      method: "POST",
      headers: { cookie: `yyc3_at=${tokenFor("user-a")}`, origin: "https://evil.example" },
    })
    const { status, body } = await j(await requireAuth(req))
    expect(status).toBe(403)
    expect(body.message).toBe("跨站请求被拒绝")
  })

  test("Cookie 认证同源写请求 → 通过并认证成功", async () => {
    users.push({ id: "user-a", email: "a@t.cn" })
    const req = new Request("http://x/api", {
      method: "POST",
      headers: { cookie: `yyc3_at=${tokenFor("user-a")}`, origin: "http://x", host: "x" },
    })
    const auth = await requireAuth(req)
    expect(auth).not.toBeInstanceOf(Response)
  })

  test("Cookie 认证跨源写但 Origin 在受信名单 → 通过", async () => {
    users.push({ id: "user-a", email: "a@t.cn" })
    process.env.CSRF_TRUSTED_ORIGINS = "https://miniapp.example, https://other.example"
    const req = new Request("http://x/api", {
      method: "POST",
      headers: { cookie: `yyc3_at=${tokenFor("user-a")}`, origin: "https://miniapp.example" },
    })
    const auth = await requireAuth(req)
    expect(auth).not.toBeInstanceOf(Response)
  })

  test("Origin 反向代理场景：x-forwarded-host 与 Origin host 一致 → 通过", async () => {
    users.push({ id: "user-a", email: "a@t.cn" })
    const req = new Request("http://internal/api", {
      method: "POST",
      headers: {
        cookie: `yyc3_at=${tokenFor("user-a")}`,
        origin: "https://baby.yyc3.vip",
        "x-forwarded-host": "baby.yyc3.vip",
      },
    })
    const auth = await requireAuth(req)
    expect(auth).not.toBeInstanceOf(Response)
  })

  test("Origin 为非法 URL → 403", async () => {
    users.push({ id: "user-a", email: "a@t.cn" })
    const req = new Request("http://x/api", {
      method: "POST",
      headers: { cookie: `yyc3_at=${tokenFor("user-a")}`, origin: "::not-a-url::" },
    })
    const { status } = await j(await requireAuth(req))
    expect(status).toBe(403)
  })

  test("严格模式（CSRF_REQUIRE_ORIGIN=true）缺失 Origin 的 Cookie 写请求 → 403", async () => {
    users.push({ id: "user-a", email: "a@t.cn" })
    process.env.CSRF_REQUIRE_ORIGIN = "true"
    const req = new Request("http://x/api", {
      method: "POST",
      headers: { cookie: `yyc3_at=${tokenFor("user-a")}` },
    })
    const { status } = await j(await requireAuth(req))
    expect(status).toBe(403)
  })

  test("默认宽松模式：缺失 Origin 的 Cookie 写请求放行", async () => {
    users.push({ id: "user-a", email: "a@t.cn" })
    const req = new Request("http://x/api", {
      method: "POST",
      headers: { cookie: `yyc3_at=${tokenFor("user-a")}` },
    })
    const auth = await requireAuth(req)
    expect(auth).not.toBeInstanceOf(Response)
  })

  test("Cookie 通道的 GET 请求不做 CSRF 校验（跨源也放行）", async () => {
    users.push({ id: "user-a", email: "a@t.cn" })
    const req = new Request("http://x/api", {
      method: "GET",
      headers: { cookie: `yyc3_at=${tokenFor("user-a")}`, origin: "https://evil.example" },
    })
    const auth = await requireAuth(req)
    expect(auth).not.toBeInstanceOf(Response)
  })
})

describe("requireRole · 角色检查", () => {
  const user = { id: "u1", email: "u@t.cn", firstName: "", lastName: "", role: "parent", emailVerified: true, isActive: true, createdAt: "" }

  test("单角色字符串匹配 → true", () => {
    expect(requireRole(user, "parent")).toBe(true)
  })

  test("多角色数组包含 → true", () => {
    expect(requireRole(user, ["admin", "parent"])).toBe(true)
  })

  test("角色不匹配 → 403 NextResponse", async () => {
    const result = requireRole(user, "admin")
    expect(result).not.toBe(true)
    const { status, body } = await j(result as unknown as Response)
    expect(status).toBe(403)
    expect(body.message).toBe("权限不足")
  })
})
