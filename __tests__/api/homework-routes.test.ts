/**
 * 作业 API 分支补测（app/api/homework/route.ts + [id]/route.ts）
 * 在 data-routes.test.ts 主链之外补齐：GET childId 定向过滤 / status 过滤 /
 * POST 全链（400 校验 · 403 越权 · 白名单剥离 · 默认值 · FK 错误 · 500）/
 * PATCH/DELETE 404 与 500 分支。
 * 独立 mock（Bun mock.module 跨文件共享模块作用域，避免互相依赖 mock 导出集）。
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import { NextRequest, NextResponse } from "next/server"
import { generateToken, type JWTPayload } from "@/lib/auth/jwt"

interface Row { id?: string; user_id?: string; child_id?: string; [k: string]: unknown }

const db = {
  users: [] as Array<Row & { email: string }>,
  children: [] as Row[],
  homework_tasks: [] as Row[],
  createdCalls: [] as Array<{ table: string; data: Record<string, unknown> }>,
  updatedCalls: [] as Array<{ table: string; id: string; data: Record<string, unknown> }>,
  deletedCalls: [] as Array<{ table: string; id: string }>,
  // 故障注入开关
  failList: false,
  failCreate: false,
  failUpdate: false,
  failDelete: false,
  // createRow 可注入抛出错误
  createError: null as unknown,
}

function tableOf(table: string): Row[] {
  return (db as unknown as Record<string, Row[]>)[table]
}

mock.module("@/lib/db/server", () => ({
  listRows: async (table: string, conditions: Record<string, unknown> = {}) => {
    if (db.failList) throw new Error("db list down")
    return tableOf(table).filter((r) =>
      Object.entries(conditions).every(([k, v]) => r[k] === v))
  },
  getRow: async (table: string, id: string) =>
    tableOf(table).find((r) => r.id === id) ?? null,
  createRow: async (table: string, data: Record<string, unknown>) => {
    if (db.failCreate) throw new Error("db create down")
    if (db.createError) throw db.createError
    db.createdCalls.push({ table, data: { ...data } })
    const row = { ...data, id: `new-${db.createdCalls.length}` }
    ;(tableOf(table) as Row[]).push(row)
    return row
  },
  updateRow: async (table: string, id: string, data: Record<string, unknown>) => {
    if (db.failUpdate) throw new Error("db update down")
    db.updatedCalls.push({ table, id, data: { ...data } })
    const row = tableOf(table).find((r) => r.id === id)
    if (!row) return null
    Object.assign(row, data)
    return row
  },
  deleteRow: async (table: string, id: string) => {
    if (db.failDelete) throw new Error("db delete down")
    db.deletedCalls.push({ table, id })
    return true
  },
  isForeignKeyError: (e: unknown) =>
    e instanceof Error && e.message === "FOREIGN KEY constraint failed",
  assertTable: () => {},
  // ↓ 以下导出为其他测试文件（data-routes / user-documents / growth-assessments）所需：
  // Bun mock.module 跨文件共享同一模块作用域，mock 必须导出并集（见项目记忆教训）
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
  findUserByEmail: async () => null,
  toAuthUser: (row: Row) => ({
    id: row.id, email: String(row.email), firstName: "", lastName: "",
    role: "parent", emailVerified: false, isActive: true, createdAt: "",
  }),
  createUser: async () => { throw new Error("unused") },
  verifyPassword: async () => true,
  touchLastLogin: async () => {},
}))

const homeworkRoute = await import("../../app/api/homework/route")
const homeworkIdRoute = await import("../../app/api/homework/[id]/route")
const cookiesMod = await import("../../lib/auth/cookies")

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
  db.users = [
    { id: "user-a", email: "a@t.cn" },
    { id: "user-b", email: "b@t.cn" },
  ]
  db.children = [
    { id: "child-a1", user_id: "user-a" },
    { id: "child-a2", user_id: "user-a" },
    { id: "child-b1", user_id: "user-b" },
  ]
  db.homework_tasks = [
    { id: "hw-a1", child_id: "child-a1", subject: "语文", title: "抄写", status: "pending", priority: "normal" },
    { id: "hw-a2", child_id: "child-a2", subject: "数学", title: "口算", status: "completed", priority: "high" },
    { id: "hw-b1", child_id: "child-b1", subject: "英语", title: "跟读", status: "pending", priority: "low" },
  ]
  db.createdCalls = []
  db.updatedCalls = []
  db.deletedCalls = []
  db.failList = false
  db.failCreate = false
  db.failUpdate = false
  db.failDelete = false
  db.createError = null
})

describe("GET /api/homework · 分支补测", () => {
  test("childId 定向过滤：只返回指定孩子的作业", async () => {
    const { status, body } = await j(await homeworkRoute.GET(
      authed("http://x/api/homework?childId=child-a1", "user-a")
    ))
    expect(status).toBe(200)
    expect(body.data.map((r: Row) => r.id)).toEqual(["hw-a1"])
  })

  test("status 过滤：列表接口按状态筛选", async () => {
    const { body } = await j(await homeworkRoute.GET(
      authed("http://x/api/homework?status=completed", "user-a")
    ))
    // user-a 两个孩子的 completed 作业
    expect(body.data.map((r: Row) => r.id)).toEqual(["hw-a2"])
  })

  test("childId + status 组合过滤", async () => {
    const { body } = await j(await homeworkRoute.GET(
      authed("http://x/api/homework?childId=child-a2&status=completed", "user-a")
    ))
    expect(body.data.map((r: Row) => r.id)).toEqual(["hw-a2"])
  })

  test("无孩子用户返回空数组", async () => {
    db.children = []
    const { status, body } = await j(await homeworkRoute.GET(authed("http://x/api/homework", "user-a")))
    expect(status).toBe(200)
    expect(body.data).toEqual([])
  })

  test("DB 异常 → 500", async () => {
    db.failList = true
    const { status, body } = await j(await homeworkRoute.GET(authed("http://x/api/homework", "user-a")))
    expect(status).toBe(500)
    expect(body.success).toBe(false)
  })
})

describe("POST /api/homework · 全链补测", () => {
  const base = { child_id: "child-a1", subject: "科学", title: "观察日记" }

  test("缺 child_id → 400", async () => {
    const { status, body } = await j(await homeworkRoute.POST(authed("http://x/api/homework", "user-a", {
      method: "POST", body: JSON.stringify({ subject: "x", title: "t" }),
    })))
    expect(status).toBe(400)
    expect(body.error).toContain("child_id")
  })

  test("缺 subject → 400", async () => {
    const { status } = await j(await homeworkRoute.POST(authed("http://x/api/homework", "user-a", {
      method: "POST", body: JSON.stringify({ child_id: "child-a1", title: "t" }),
    })))
    expect(status).toBe(400)
  })

  test("缺 title → 400", async () => {
    const { status } = await j(await homeworkRoute.POST(authed("http://x/api/homework", "user-a", {
      method: "POST", body: JSON.stringify({ child_id: "child-a1", subject: "x" }),
    })))
    expect(status).toBe(400)
  })

  test("child_id 越权 → 403 且不落库", async () => {
    const { status, body } = await j(await homeworkRoute.POST(authed("http://x/api/homework", "user-a", {
      method: "POST", body: JSON.stringify({ ...base, child_id: "child-b1" }),
    })))
    expect(status).toBe(403)
    expect(body.error).toContain("无权")
    expect(db.createdCalls.length).toBe(0)
  })

  test("成功创建 → 201；白名单剥离未知字段；status/priority 默认值生效", async () => {
    const { status, body } = await j(await homeworkRoute.POST(authed("http://x/api/homework", "user-a", {
      method: "POST",
      body: JSON.stringify({ ...base, evil: "注入", id: "evil", user_id: "attacker", ai_feedback: "好" }),
    })))
    expect(status).toBe(201)
    expect(body.data.status).toBe("pending")
    expect(body.data.priority).toBe("normal")
    const call = db.createdCalls.find((c) => c.table === "homework_tasks")!
    expect(call.data).not.toHaveProperty("evil")
    expect(call.data).not.toHaveProperty("id")
    expect(call.data).not.toHaveProperty("user_id")
    expect(call.data.child_id).toBe("child-a1")
  })

  test("显式传入 status/priority 不被默认值覆盖", async () => {
    const { body } = await j(await homeworkRoute.POST(authed("http://x/api/homework", "user-a", {
      method: "POST", body: JSON.stringify({ ...base, status: "in_progress", priority: "high" }),
    })))
    expect(body.data.status).toBe("in_progress")
    expect(body.data.priority).toBe("high")
  })

  test("FK 约束错误 → 400（关联 child 不存在）", async () => {
    db.createError = new Error("FOREIGN KEY constraint failed")
    const { status, body } = await j(await homeworkRoute.POST(authed("http://x/api/homework", "user-a", {
      method: "POST", body: JSON.stringify(base),
    })))
    expect(status).toBe(400)
    expect(body.error).toContain("child_id")
  })

  test("其他 DB 异常 → 500", async () => {
    db.failCreate = true
    const { status } = await j(await homeworkRoute.POST(authed("http://x/api/homework", "user-a", {
      method: "POST", body: JSON.stringify(base),
    })))
    expect(status).toBe(500)
  })
})

describe("PATCH /api/homework/[id] · 分支补测", () => {
  const P = (id: string) => ({ params: Promise.resolve({ id }) })

  test("任务不存在 → 404", async () => {
    const req = authed("http://x/api/homework/ghost", "user-a", {
      method: "PATCH", body: JSON.stringify({ title: "x" }),
    })
    const { status } = await j(await homeworkIdRoute.PATCH(req, P("ghost")))
    expect(status).toBe(404)
  })

  test("ai_feedback 在白名单内可更新", async () => {
    const req = authed("http://x/api/homework/hw-a1", "user-a", {
      method: "PATCH", body: JSON.stringify({ ai_feedback: "书写工整" }),
    })
    const { status, body } = await j(await homeworkIdRoute.PATCH(req, P("hw-a1")))
    expect(status).toBe(200)
    expect(body.data.ai_feedback).toBe("书写工整")
  })

  test("DB 异常 → 500", async () => {
    db.failUpdate = true
    const req = authed("http://x/api/homework/hw-a1", "user-a", {
      method: "PATCH", body: JSON.stringify({ title: "x" }),
    })
    const { status } = await j(await homeworkIdRoute.PATCH(req, P("hw-a1")))
    expect(status).toBe(500)
  })
})

describe("DELETE /api/homework/[id] · 分支补测", () => {
  const P = (id: string) => ({ params: Promise.resolve({ id }) })

  test("任务不存在 → 404", async () => {
    const { status } = await j(await homeworkIdRoute.DELETE(authed("http://x/api/homework/ghost", "user-a", { method: "DELETE" }), P("ghost")))
    expect(status).toBe(404)
  })

  test("自己的任务 → 200 且删除落库", async () => {
    const { status } = await j(await homeworkIdRoute.DELETE(authed("http://x/api/homework/hw-a1", "user-a", { method: "DELETE" }), P("hw-a1")))
    expect(status).toBe(200)
    expect(db.deletedCalls).toContainEqual({ table: "homework_tasks", id: "hw-a1" })
  })

  test("DB 异常 → 500", async () => {
    db.failDelete = true
    const { status } = await j(await homeworkIdRoute.DELETE(authed("http://x/api/homework/hw-a1", "user-a", { method: "DELETE" }), P("hw-a1")))
    expect(status).toBe(500)
  })
})

describe("lib/auth/cookies.ts · Cookie 传输", () => {
  // cookies.ts 只依赖 NextResponse.cookies.set —— 用真实 NextResponse 验证调用参数
  test("setAuthCookies 双令牌：access 全站 httpOnly，refresh 限 /api/auth", () => {
    const res = NextResponse.json({})
    cookiesMod.setAuthCookies(res, "at-token", "rt-token")

    const at = res.cookies.get(cookiesMod.ACCESS_COOKIE)!
    expect(at.value).toBe("at-token")
    expect(at.httpOnly).toBe(true)
    expect(at.path).toBe("/")

    const rt = res.cookies.get(cookiesMod.REFRESH_COOKIE)!
    expect(rt.value).toBe("rt-token")
    expect(rt.httpOnly).toBe(true)
    expect(rt.path).toBe("/api/auth")

    // SameSite=Lax（防 CSRF；Next 序列化为小写 lax）
    const raw = res.headers.getSetCookie().join("\n")
    expect(raw).toContain("SameSite=lax")
  })

  test("setAuthCookies 不传 refreshToken 时只写 access", () => {
    const res = NextResponse.json({})
    cookiesMod.setAuthCookies(res, "only-at")
    expect(res.cookies.get(cookiesMod.ACCESS_COOKIE)?.value).toBe("only-at")
    expect(res.cookies.get(cookiesMod.REFRESH_COOKIE)).toBeUndefined()
  })

  test("clearAuthCookies 双令牌 maxAge=0 立即过期", () => {
    const res = NextResponse.json({})
    cookiesMod.clearAuthCookies(res)

    const raw = res.headers.getSetCookie().join("\n")
    expect(raw).toContain(`${cookiesMod.ACCESS_COOKIE}=`)
    expect(raw).toContain(`${cookiesMod.REFRESH_COOKIE}=`)
    expect(raw).toContain("Max-Age=0")
    // refresh 清除也限定 /api/auth 路径
    const rtLine = res.headers.getSetCookie().find((c) => c.startsWith(cookiesMod.REFRESH_COOKIE))
    expect(rtLine).toContain("Path=/api/auth")
  })
})
