/**
 * @fileoverview 评估落库 + 健康检查端点测试
 * @description 覆盖：401、入参校验、跨用户 403、写入→读取往返、分页参数夹取、健康探针 200/503。
 *   DB 层 mock 为**超集导出**（Bun mock.module 跨文件共享，缺一个导出就会让别的测试文件 import 失败）。
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import { NextRequest } from "next/server"
import { generateToken, type JWTPayload } from "@/lib/auth/jwt"

interface Row { id: string; [k: string]: unknown }

const db = {
  users: [] as Row[],
  children: [] as Row[],
  growth_records: [] as Row[],
  growth_assessments: [] as Row[],
  homework_tasks: [] as Row[],
  user_documents: [] as Row[],
  failCount: false,
}

function tableOf(table: string): Row[] {
  return (db as unknown as Record<string, Row[]>)[table]
}

mock.module("@/lib/db/server", () => ({
  listRows: async (table: string, conditions: Record<string, unknown> = {}) =>
    tableOf(table).filter((r) => Object.entries(conditions).every(([k, v]) => r[k] === v)),
  getRow: async (table: string, id: string) => tableOf(table).find((r) => r.id === id) ?? null,
  createRow: async (table: string, data: Record<string, unknown>) => {
    const row = { ...data, id: `row-${tableOf(table).length + 1}` }
    tableOf(table).push(row)
    return row
  },
  updateRow: async (table: string, id: string, data: Record<string, unknown>) => {
    const row = tableOf(table).find((r) => r.id === id)
    if (!row) return null
    Object.assign(row, data)
    return row
  },
  deleteRow: async (table: string, id: string) => {
    const list = tableOf(table)
    const idx = list.findIndex((r) => r.id === id)
    if (idx >= 0) list.splice(idx, 1)
    return idx >= 0
  },
  isForeignKeyError: () => false,
  assertTable: () => {},
  listRowsIn: async (
    table: string,
    column: string,
    values: string[],
    options: { limit?: number; offset?: number; orderBy?: { column: string; direction?: "ASC" | "DESC" }; equal?: Record<string, unknown> } = {},
  ) => {
    const equal = options.equal ?? {}
    let rows = tableOf(table).filter(
      (r) => values.includes(String(r[column])) && Object.entries(equal).every(([k, v]) => r[k] === v),
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
      (r) => values.includes(String(r[column])) && Object.entries(equal).every(([k, v]) => r[k] === v),
    ).length,
  getServerDB: () => ({
    count: async () => {
      if (db.failCount) throw new Error("db down")
      return tableOf("users").length
    },
    transaction: async <T>(cb: () => Promise<T>) => cb(),
    deleteMany: async (table: string, ids: string[]) => {
      const list = tableOf(table)
      for (const id of ids) {
        const idx = list.findIndex((r) => r.id === id)
        if (idx >= 0) list.splice(idx, 1)
      }
      return ids.length
    },
  }),
}))

mock.module("@/lib/auth/service", () => ({
  findUserById: async (id: string) => tableOf("users").find((u) => u.id === id) ?? null,
  findUserByEmail: async (email: string) => tableOf("users").find((u) => u.email === email) ?? null,
  toAuthUser: (row: Row) => ({
    id: String(row.id),
    email: String(row.email),
    firstName: "",
    lastName: "",
    role: "parent",
    emailVerified: false,
    isActive: true,
    createdAt: "2026-01-01",
  }),
  createUser: async () => {
    throw new Error("本测试不覆盖注册")
  },
  verifyPassword: async () => true,
  touchLastLogin: async () => {},
}))

mock.module("@/lib/logger/server", () => ({ error: () => {}, info: () => {}, warn: () => {} }))

const assessmentsRoute = await import("../../app/api/growth-assessments/route")
const healthRoute = await import("../../app/api/health/route")

function tokenFor(userId: string): string {
  const payload: JWTPayload = { userId, email: `${userId}@t.cn`, role: "parent" }
  return generateToken(payload)
}

function req(url: string, userId?: string, init: RequestInit = {}): NextRequest {
  return new NextRequest(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(userId ? { authorization: `Bearer ${tokenFor(userId)}` } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  })
}

const validBody = {
  child_id: "child-a1",
  stage_id: "3-6",
  dimensions: [
    { id: "cognitive", name: "认知发展", score: 82 },
    { id: "language", name: "语言能力", score: 74 },
  ],
  overall_score: 78,
  recommendations: ["每天亲子共读 15 分钟"],
}

beforeEach(() => {
  db.users = [
    { id: "user-a", email: "a@t.cn" },
    { id: "user-b", email: "b@t.cn" },
  ]
  db.children = [
    { id: "child-a1", user_id: "user-a", name: "A宝" },
    { id: "child-b1", user_id: "user-b", name: "B宝" },
  ]
  db.growth_assessments = []
  db.failCount = false
})

describe("/api/growth-assessments", () => {
  test("未认证 → 401", async () => {
    const g = await assessmentsRoute.GET(req("http://x/api/growth-assessments"))
    expect(g.status).toBe(401)
    const p = await assessmentsRoute.POST(req("http://x/api/growth-assessments", undefined, {
      method: "POST",
      body: JSON.stringify(validBody),
    }))
    expect(p.status).toBe(401)
  })

  test("入参不合法 → 400（缺 child_id / score 越界）", async () => {
    const missing = await assessmentsRoute.POST(req("http://x/api/growth-assessments", "user-a", {
      method: "POST",
      body: JSON.stringify({ ...validBody, child_id: "" }),
    }))
    expect(missing.status).toBe(400)

    const outOfRange = await assessmentsRoute.POST(req("http://x/api/growth-assessments", "user-a", {
      method: "POST",
      body: JSON.stringify({ ...validBody, overall_score: 120 }),
    }))
    expect(outOfRange.status).toBe(400)
  })

  test("写他人孩子 → 403 且不落库", async () => {
    const res = await assessmentsRoute.POST(req("http://x/api/growth-assessments", "user-a", {
      method: "POST",
      body: JSON.stringify({ ...validBody, child_id: "child-b1" }),
    }))
    expect(res.status).toBe(403)
    expect(db.growth_assessments).toHaveLength(0)
  })

  test("写自己的孩子 → 201，GET 可读回且 total 正确", async () => {
    const created = await assessmentsRoute.POST(req("http://x/api/growth-assessments", "user-a", {
      method: "POST",
      body: JSON.stringify(validBody),
    }))
    expect(created.status).toBe(201)

    const list = await assessmentsRoute.GET(
      req("http://x/api/growth-assessments?childId=child-a1", "user-a"),
    )
    const body = (await list.json()) as {
      data: Array<Record<string, unknown>>
      meta: { total: number; limit: number; offset: number }
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.overall_score).toBe(78)
    expect(body.meta.total).toBe(1)
  })

  test("按他人 childId 查询 → 403（防探测）", async () => {
    const res = await assessmentsRoute.GET(
      req("http://x/api/growth-assessments?childId=child-b1", "user-a"),
    )
    expect(res.status).toBe(403)
  })

  test("分页参数被夹取：limit=9999 → 200，offset 负数 → 0", async () => {
    const res = await assessmentsRoute.GET(
      req("http://x/api/growth-assessments?limit=9999&offset=-5", "user-a"),
    )
    const body = (await res.json()) as { meta: { limit: number; offset: number } }
    expect(body.meta.limit).toBe(200)
    expect(body.meta.offset).toBe(0)
  })
})

describe("/api/health", () => {
  test("数据库可用 → 200 且 status=ok", async () => {
    const res = await healthRoute.GET()
    const body = (await res.json()) as { status: string; checks: Record<string, string> }
    expect(res.status).toBe(200)
    expect(body.status).toBe("ok")
    expect(body.checks.database).toBe("ok")
  })

  test("数据库异常 → 503 且 status=degraded", async () => {
    db.failCount = true
    const res = await healthRoute.GET()
    const body = (await res.json()) as { status: string; checks: Record<string, string> }
    expect(res.status).toBe(503)
    expect(body.status).toBe("degraded")
    expect(body.checks.database).toBe("fail")
  })
})
