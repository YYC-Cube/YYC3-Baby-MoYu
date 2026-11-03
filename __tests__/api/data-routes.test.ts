/**
 * 数据 API 路由安全行为测试（children / growth-records / homework）
 * 用 mock.module 隔离 DB 层（bun 不支持 node:sqlite），认证链走真实 JWT + mock 用户表。
 * 覆盖：401 未认证、租户隔离、IDOR 403、user_id 批量赋值剥离、字段白名单。
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import { NextRequest } from "next/server"
import { generateToken, type JWTPayload } from "@/lib/auth/jwt"

// —— 内存数据库 mock（模块级，供路由经 @/lib/db/server 间接读写） ——
// 注意：Bun 的 mock.module 在同一进程内跨文件共享，本 mock 因此需覆盖其他测试文件
// （如 user-documents.test.ts）所需的 getServerDB/事务/批量删除与管理表，
// 否则先加载的 mock 会让后者的 `import { getServerDB }` 解析失败。
interface Row { id: string; user_id?: string; [k: string]: unknown }
const db = {
  users: [] as Array<Row & { email: string; is_active?: number }>,
  children: [] as Row[],
  growth_records: [] as Row[],
  homework_tasks: [] as Row[],
  user_documents: [] as Row[],
  createdCalls: [] as Array<{ table: string; data: Record<string, unknown> }>,
  updatedCalls: [] as Array<{ table: string; id: string; data: Record<string, unknown> }>,
  deleted: [] as string[],
}

function tableOf(table: string): Row[] {
  return (db as unknown as Record<string, Row[]>)[table]
}

mock.module("@/lib/db/server", () => ({
  listRows: async (table: string, conditions: Record<string, unknown> = {}) =>
    (db as any)[table].filter((r: Row) =>
      Object.entries(conditions).every(([k, v]) => r[k] === v)),
  getRow: async (table: string, id: string) =>
    ((db as any)[table].find((r: Row) => r.id === id) ?? null),
  createRow: async (table: string, data: Record<string, unknown>) => {
    db.createdCalls.push({ table, data: { ...data } })
    const row = { ...data, id: `new-${Date.now()}-${db.createdCalls.length}` }
    ;(db as any)[table].push(row)
    return row
  },
  updateRow: async (table: string, id: string, data: Record<string, unknown>) => {
    db.updatedCalls.push({ table, id, data: { ...data } })
    const row = (db as any)[table].find((r: Row) => r.id === id)
    if (!row) return null
    Object.assign(row, data)
    return row
  },
  deleteRow: async (_table: string, id: string) => {
    db.deleted.push(id)
    return true
  },
  isForeignKeyError: () => false,
  assertTable: () => {},
  // 供聚合查询端点使用（growth-records / stats / growth-assessments 走 IN 查询）
  listRowsIn: async (
    table: string,
    column: string,
    values: string[],
    options: { limit?: number; offset?: number; orderBy?: { column: string; direction?: "ASC" | "DESC" }; equal?: Record<string, unknown> } = {},
  ) => {
    const equal = options.equal ?? {}
    let rows = tableOf(table).filter(
      (r) =>
        values.includes(String(r[column])) &&
        Object.entries(equal).every(([k, v]) => r[k] === v),
    )
    if (options.orderBy) {
      const { column: sortCol, direction } = options.orderBy
      rows = [...rows].sort((a, b) => {
        const av = String(a[sortCol] ?? "")
        const bv = String(b[sortCol] ?? "")
        return direction === "ASC" ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    if (options.limit !== undefined) {
      const offset = options.offset ?? 0
      rows = rows.slice(offset, offset + options.limit)
    }
    return rows
  },
  countRowsIn: async (table: string, column: string, values: string[], equal: Record<string, unknown> = {}) =>
    tableOf(table).filter(
      (r) =>
        values.includes(String(r[column])) &&
        Object.entries(equal).every(([k, v]) => r[k] === v),
    ).length,
  // 供 /api/user-documents 使用：事务为直通（内存 mock 无需回滚语义），批量删除按 id 过滤
  getServerDB: () => ({
    transaction: async <T>(cb: () => Promise<T>) => cb(),
    deleteMany: async (table: string, ids: string[]) => {
      const list = tableOf(table)
      for (const id of ids) {
        const idx = list.findIndex((r) => r.id === id)
        if (idx >= 0) list.splice(idx, 1)
      }
      return ids.length
    },
    count: async () => 0,
  }),
}))

mock.module("@/lib/auth/service", () => ({
  findUserById: async (id: string) => db.users.find((u) => u.id === id) ?? null,
  findUserByEmail: async (email: string) => db.users.find((u) => u.email === email) ?? null,
  toAuthUser: (row: Row) => ({
    id: row.id, email: String(row.email), firstName: "", lastName: "",
    role: String(row.role ?? "parent"), emailVerified: false,
    isActive: (row.is_active ?? 1) === 1,
    createdAt: row.created_at as string,
  }),
  createUser: async () => { throw new Error("本测试不覆盖注册") },
  verifyPassword: async () => true,
  touchLastLogin: async () => {},
}))

// mock 就位后再加载路由模块
const childrenRoute = await import("../../app/api/children/route")
const childrenIdRoute = await import("../../app/api/children/[id]/route")
const growthRoute = await import("../../app/api/growth-records/route")
const growthIdRoute = await import("../../app/api/growth-records/[id]/route")
const homeworkRoute = await import("../../app/api/homework/route")
const homeworkIdRoute = await import("../../app/api/homework/[id]/route")

function tokenFor(userId: string): string {
  const payload: JWTPayload = { userId, email: `${userId}@t.cn`, role: "parent" }
  return generateToken(payload)
}

function authed(url: string, userId: string, init: RequestInit = {}): NextRequest {
  return new NextRequest(url, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${tokenFor(userId)}`, ...init.headers as Record<string, string> },
  })
}

const j = async (res: Response) => ({ status: res.status, body: await res.json() })

beforeEach(() => {
  db.user_documents = []
  db.users = [
    { id: "user-a", email: "a@t.cn", is_active: 1 },
    { id: "user-b", email: "b@t.cn", is_active: 1 },
  ]
  db.children = [
    { id: "child-a1", user_id: "user-a", name: "A的孩子", birth_date: "2019-01-01", gender: "male" },
    { id: "child-b1", user_id: "user-b", name: "B的孩子", birth_date: "2019-01-01", gender: "female" },
  ]
  db.growth_records = [
    { id: "gr-a", child_id: "child-a1", title: "A记录", content: "x", type: "milestone", recorded_at: "2026-01-01" },
    { id: "gr-b", child_id: "child-b1", title: "B记录", content: "x", type: "milestone", recorded_at: "2026-01-01" },
  ]
  db.homework_tasks = [
    { id: "hw-b", child_id: "child-b1", subject: "数学", title: "B作业", status: "pending", priority: "normal" },
    { id: "hw-a", child_id: "child-a1", subject: "语文", title: "A作业", status: "pending", priority: "normal" },
  ]
  db.createdCalls = []
  db.updatedCalls = []
  db.deleted = []
})

describe("GET /api/children", () => {
  test("未认证 → 401", async () => {
    const { status } = await j(await childrenRoute.GET(new Request("http://x/api/children")))
    expect(status).toBe(401)
  })

  test("httpOnly Cookie 认证同样生效", async () => {
    const cookie = `yyc3_at=${tokenFor("user-a")}`
    const { status, body } = await j(await childrenRoute.GET(
      new NextRequest("http://x/api/children", { headers: { cookie } })
    ))
    expect(status).toBe(200)
    expect(body.data.map((c: Row) => c.id)).toEqual(["child-a1"])
  })

  test("Cookie 认证的跨源写请求 → 403（CSRF 防护）", async () => {
    const cookie = `yyc3_at=${tokenFor("user-a")}`
    const req = new NextRequest("http://x/api/children", {
      method: "POST",
      headers: { cookie, "content-type": "application/json", origin: "https://evil.example" },
      body: JSON.stringify({ name: "x", birth_date: "2020-01-01" }),
    })
    const { status } = await j(await childrenRoute.POST(req))
    expect(status).toBe(403)
  })

  test("CSRF_TRUSTED_ORIGINS 显式放行受信源；严格模式拒绝缺失 Origin", async () => {
    const prevTrusted = process.env.CSRF_TRUSTED_ORIGINS
    const prevRequire = process.env.CSRF_REQUIRE_ORIGIN
    try {
      process.env.CSRF_TRUSTED_ORIGINS = "https://miniapp.example"
      const ok = new NextRequest("http://x/api/children", {
        method: "POST",
        headers: { cookie: `yyc3_at=${tokenFor("user-a")}`, "content-type": "application/json", origin: "https://miniapp.example" },
        body: JSON.stringify({ name: "x", birth_date: "2020-01-01" }),
      })
      const { status } = await j(await childrenRoute.POST(ok))
      expect(status).toBe(201)

      process.env.CSRF_TRUSTED_ORIGINS = ""
      process.env.CSRF_REQUIRE_ORIGIN = "true"
      const noOrigin = new NextRequest("http://x/api/children", {
        method: "POST",
        headers: { cookie: `yyc3_at=${tokenFor("user-a")}`, "content-type": "application/json" },
        body: JSON.stringify({ name: "x", birth_date: "2020-01-01" }),
      })
      const strict = await j(await childrenRoute.POST(noOrigin))
      expect(strict.status).toBe(403)
    } finally {
      process.env.CSRF_TRUSTED_ORIGINS = prevTrusted
      process.env.CSRF_REQUIRE_ORIGIN = prevRequire
    }
  })

  test("只返回当前用户的孩子（租户隔离）", async () => {
    const { status, body } = await j(await childrenRoute.GET(authed("http://x/api/children", "user-a")))
    expect(status).toBe(200)
    expect(body.data.map((c: Row) => c.id)).toEqual(["child-a1"])
  })
})

describe("POST /api/children", () => {
  test("伪造 user_id 被剥离，归属取自令牌；未知字段被白名单丢弃", async () => {
    const { status, body } = await j(await childrenRoute.POST(authed("http://x/api/children", "user-a", {
      method: "POST",
      body: JSON.stringify({
        name: "新孩子", birth_date: "2020-02-02", gender: "female",
        user_id: "attacker", id: "evil", "user_id) VALUES (1)--": "x",
      }),
    })))
    expect(status).toBe(201)
    expect(body.data.user_id).toBe("user-a")
    const call = db.createdCalls.find((c) => c.table === "children")
    expect(call!.data.user_id).toBe("user-a")
    expect(Object.keys(call!.data).sort()).toEqual(["birth_date", "gender", "name", "user_id"])
  })
})

describe("GET /api/growth-records", () => {
  test("按用户孩子集合过滤，看不到他人记录", async () => {
    const { body } = await j(await growthRoute.GET(authed("http://x/api/growth-records", "user-a")))
    expect(body.data.map((r: Row) => r.id)).toEqual(["gr-a"])
  })

  test("childId 探测他人孩子 → 403", async () => {
    const { status } = await j(await growthRoute.GET(authed("http://x/api/growth-records?childId=child-b1", "user-a")))
    expect(status).toBe(403)
  })
})

describe("POST /api/growth-records", () => {
  test("写他人孩子 → 403 且不落库", async () => {
    const { status } = await j(await growthRoute.POST(authed("http://x/api/growth-records", "user-a", {
      method: "POST",
      body: JSON.stringify({ child_id: "child-b1", title: "hack", content: "hack", type: "milestone" }),
    })))
    expect(status).toBe(403)
    expect(db.createdCalls.length).toBe(0)
  })

  test("写自己孩子 → 201", async () => {
    const { status } = await j(await growthRoute.POST(authed("http://x/api/growth-records", "user-a", {
      method: "POST",
      body: JSON.stringify({ child_id: "child-a1", title: "t", content: "c", type: "milestone" }),
    })))
    expect(status).toBe(201)
  })
})

describe("GET /api/homework", () => {
  test("按用户孩子集合过滤", async () => {
    const { body } = await j(await homeworkRoute.GET(authed("http://x/api/homework", "user-b")))
    expect(body.data.map((r: Row) => r.id)).toEqual(["hw-b"])
  })
})

describe("PATCH/DELETE /api/children/[id]", () => {
  const P = (id: string) => ({ params: Promise.resolve({ id }) })

  test("改他人档案 → 403 且未更新", async () => {
    const req = authed("http://x/api/children/child-b1", "user-a", {
      method: "PATCH", body: JSON.stringify({ name: "hack" }),
    })
    const { status } = await j(await childrenIdRoute.PATCH(req, P("child-b1")))
    expect(status).toBe(403)
    expect(db.updatedCalls.length).toBe(0)
  })

  test("改自己档案 → 200；user_id/id 不可变更", async () => {
    const req = authed("http://x/api/children/child-a1", "user-a", {
      method: "PATCH", body: JSON.stringify({ name: "改名", user_id: "evil", id: "evil" }),
    })
    const { status } = await j(await childrenIdRoute.PATCH(req, P("child-a1")))
    expect(status).toBe(200)
    const call = db.updatedCalls.at(-1)!
    expect(call.data.name).toBe("改名")
    expect(call.data).not.toHaveProperty("user_id")
    expect(call.data).not.toHaveProperty("id")
  })

  test("删自己档案 → 200；删他人 → 403；不存在 → 404", async () => {
    const ok = await j(await childrenIdRoute.DELETE(authed("http://x/api/children/child-a1", "user-a", { method: "DELETE" }), P("child-a1")))
    expect(ok.status).toBe(200)
    expect(db.deleted).toContain("child-a1")

    const cross = await j(await childrenIdRoute.DELETE(authed("http://x/api/children/child-b1", "user-a", { method: "DELETE" }), P("child-b1")))
    expect(cross.status).toBe(403)

    const ghost = await j(await childrenIdRoute.DELETE(authed("http://x/api/children/ghost", "user-a", { method: "DELETE" }), P("ghost")))
    expect(ghost.status).toBe(404)
  })
})

describe("DELETE /api/growth-records/[id]", () => {
  const P = (id: string) => ({ params: Promise.resolve({ id }) })

  test("删他人记录 → 403；删自己的 → 200", async () => {
    const cross = await j(await growthIdRoute.DELETE(authed("http://x/api/growth-records/gr-b", "user-a", { method: "DELETE" }), P("gr-b")))
    expect(cross.status).toBe(403)
    expect(db.deleted.length).toBe(0)

    const ok = await j(await growthIdRoute.DELETE(authed("http://x/api/growth-records/gr-a", "user-a", { method: "DELETE" }), P("gr-a")))
    expect(ok.status).toBe(200)
    expect(db.deleted).toContain("gr-a")
  })

  test("不存在 → 404", async () => {
    const { status } = await j(await growthIdRoute.DELETE(authed("http://x/api/growth-records/ghost", "user-a", { method: "DELETE" }), P("ghost")))
    expect(status).toBe(404)
  })
})

describe("PATCH/DELETE /api/homework/[id]", () => {
  test("改他人作业 → 403 且未更新", async () => {
    const req = authed("http://x/api/homework/hw-b", "user-a", {
      method: "PATCH", body: JSON.stringify({ status: "completed" }),
    })
    const { status } = await j(await homeworkIdRoute.PATCH(req, { params: Promise.resolve({ id: "hw-b" }) }))
    expect(status).toBe(403)
    expect(db.updatedCalls.length).toBe(0)
  })

  test("删他人作业 → 403", async () => {
    const req = authed("http://x/api/homework/hw-b", "user-a", { method: "DELETE" })
    const { status } = await j(await homeworkIdRoute.DELETE(req, { params: Promise.resolve({ id: "hw-b" }) }))
    expect(status).toBe(403)
    expect(db.deleted.length).toBe(0)
  })

  test("改自己作业 → 200 且 completed_at 自动填充", async () => {
    const req = authed("http://x/api/homework/hw-a", "user-a", {
      method: "PATCH", body: JSON.stringify({ status: "completed" }),
    })
    const { status, body } = await j(await homeworkIdRoute.PATCH(req, { params: Promise.resolve({ id: "hw-a" }) }))
    expect(status).toBe(200)
    expect(body.data.completed_at).toBeTruthy()
  })

  test("PATCH 不能变更 child_id/id/created_at", async () => {
    const req = authed("http://x/api/homework/hw-a", "user-a", {
      method: "PATCH",
      body: JSON.stringify({ child_id: "child-b1", id: "evil", created_at: "1970", title: "改标题" }),
    })
    await homeworkIdRoute.PATCH(req, { params: Promise.resolve({ id: "hw-a" }) })
    const call = db.updatedCalls.at(-1)!
    expect(call.data).not.toHaveProperty("child_id")
    expect(call.data).not.toHaveProperty("id")
    expect(call.data).not.toHaveProperty("created_at")
    expect(call.data.title).toBe("改标题")
  })
})
