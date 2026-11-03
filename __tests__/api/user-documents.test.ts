/**
 * @fileoverview /api/user-documents 行为测试
 * @description 覆盖：未认证 401、kind 白名单、重复 doc_id 拒绝、单条体积 413、条数上限 400、
 *   写入→读取往返、跨用户隔离、DELETE 清空。
 *   DB 层走模块 mock（与 data-routes.test.ts 同一范式，导出为**超集**以避免跨文件 mock 冲突）。
 */

import { beforeEach, describe, expect, mock, test } from "bun:test"
import { NextRequest } from "next/server"
import { generateToken, type JWTPayload } from "@/lib/auth/jwt"

interface DocRow {
  id: string
  user_id: string
  kind: string
  doc_id: string
  payload: Record<string, unknown>
  updated_at?: string | null
}

const db = {
  users: [] as Array<{ id: string; email: string; is_active?: number }>,
  user_documents: [] as DocRow[],
  children: [] as Array<Record<string, unknown>>,
  growth_records: [] as Array<Record<string, unknown>>,
  homework_tasks: [] as Array<Record<string, unknown>>,
  createdCalls: [] as Array<{ table: string; data: Record<string, unknown> }>,
  updatedCalls: [] as Array<{ table: string; id: string; data: Record<string, unknown> }>,
  deleted: [] as string[],
}

mock.module("@/lib/db/server", () => ({
  listRows: async (table: string, conditions: Record<string, unknown> = {}) =>
    (db as unknown as Record<string, Array<Record<string, unknown>>>)[table].filter((r) =>
      Object.entries(conditions).every(([k, v]) => r[k] === v),
    ),
  getRow: async (table: string, id: string) =>
    (db as unknown as Record<string, Array<Record<string, unknown>>>)[table].find((r) => r.id === id) ?? null,
  createRow: async (table: string, data: Record<string, unknown>) => {
    db.createdCalls.push({ table, data: { ...data } })
    const row = { ...data, id: `row-${db.createdCalls.length}` }
    ;(db as unknown as Record<string, Array<Record<string, unknown>>>)[table].push(row)
    return row
  },
  updateRow: async (table: string, id: string, data: Record<string, unknown>) => {
    db.updatedCalls.push({ table, id, data: { ...data } })
    const row = (db as unknown as Record<string, Array<Record<string, unknown>>>)[table].find((r) => r.id === id)
    if (!row) return null
    Object.assign(row, data)
    return row
  },
  deleteRow: async (table: string, id: string) => {
    db.deleted.push(id)
    const list = (db as unknown as Record<string, Array<Record<string, unknown>>>)[table]
    const idx = list.findIndex((r) => r.id === id)
    if (idx >= 0) list.splice(idx, 1)
    return idx >= 0
  },
  isForeignKeyError: () => false,
  assertTable: () => {},
  listRowsIn: async (table: string, column: string, values: string[], options: { equal?: Record<string, unknown> } = {}) => {
    const equal = options.equal ?? {}
    return (db as unknown as Record<string, Array<Record<string, unknown>>>)[table].filter(
      (r) =>
        values.includes(String(r[column])) &&
        Object.entries(equal).every(([k, v]) => r[k] === v),
    )
  },
  countRowsIn: async (table: string, column: string, values: string[], equal: Record<string, unknown> = {}) =>
    (db as unknown as Record<string, Array<Record<string, unknown>>>)[table].filter(
      (r) =>
        values.includes(String(r[column])) &&
        Object.entries(equal).every(([k, v]) => r[k] === v),
    ).length,
  getServerDB: () => ({
    transaction: async <T>(cb: () => Promise<T>) => cb(),
    deleteMany: async (table: string, ids: string[]) => {
      const list = (db as unknown as Record<string, Array<Record<string, unknown>>>)[table]
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
  toAuthUser: (row: { id: string; email: string; is_active?: number }) => ({
    id: row.id,
    email: row.email,
    firstName: "",
    lastName: "",
    role: "parent",
    emailVerified: false,
    isActive: (row.is_active ?? 1) === 1,
    createdAt: "2026-01-01",
  }),
  createUser: async () => {
    throw new Error("本测试不覆盖注册")
  },
  verifyPassword: async () => true,
  touchLastLogin: async () => {},
}))

mock.module("@/lib/logger/server", () => ({ error: () => {}, info: () => {}, warn: () => {} }))

// mock 就位后再加载路由
const route = await import("../../app/api/user-documents/route")

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

beforeEach(() => {
  db.users = [
    { id: "user-a", email: "a@t.cn", is_active: 1 },
    { id: "user-b", email: "b@t.cn", is_active: 1 },
  ]
  db.user_documents = []
  db.createdCalls = []
})

describe("/api/user-documents", () => {
  test("未认证 → 401（GET/PUT/DELETE 全部）", async () => {
    const g = await route.GET(req("http://x/api/user-documents?kind=schedule"))
    expect(g.status).toBe(401)
    const p = await route.PUT(req("http://x/api/user-documents", undefined, {
      method: "PUT",
      body: JSON.stringify({ kind: "schedule", items: [] }),
    }))
    expect(p.status).toBe(401)
    const d = await route.DELETE(req("http://x/api/user-documents?kind=schedule"))
    expect(d.status).toBe(401)
  })

  test("kind 不在白名单 → 400", async () => {
    const g = await route.GET(req("http://x/api/user-documents?kind=hack", "user-a"))
    expect(g.status).toBe(400)
    const p = await route.PUT(req("http://x/api/user-documents", "user-a", {
      method: "PUT",
      body: JSON.stringify({ kind: "hack", items: [] }),
    }))
    expect(p.status).toBe(400)
  })

  test("PUT → GET 往返，且跨用户不可见", async () => {
    const put = await route.PUT(req("http://x/api/user-documents", "user-a", {
      method: "PUT",
      body: JSON.stringify({
        kind: "schedule",
        items: [{ id: "s1", data: { title: "起床", type: "rest" } }],
      }),
    }))
    expect(put.status).toBe(200)

    const mine = await route.GET(req("http://x/api/user-documents?kind=schedule", "user-a"))
    const mineBody = (await mine.json()) as { data: Array<{ id: string; data: Record<string, unknown> }> }
    expect(mine.status).toBe(200)
    expect(mineBody.data).toHaveLength(1)
    expect(mineBody.data[0]?.id).toBe("s1")

    const other = await route.GET(req("http://x/api/user-documents?kind=schedule", "user-b"))
    const otherBody = (await other.json()) as { data: unknown[] }
    expect(otherBody.data).toHaveLength(0)
  })

  test("PUT 覆盖语义：再次提交只保留最新一组", async () => {
    await route.PUT(req("http://x/api/user-documents", "user-a", {
      method: "PUT",
      body: JSON.stringify({ kind: "interaction", items: [{ id: "i1", data: { a: 1 } }, { id: "i2", data: { a: 2 } }] }),
    }))
    await route.PUT(req("http://x/api/user-documents", "user-a", {
      method: "PUT",
      body: JSON.stringify({ kind: "interaction", items: [{ id: "i2", data: { a: 9 } }] }),
    }))
    const res = await route.GET(req("http://x/api/user-documents?kind=interaction", "user-a"))
    const body = (await res.json()) as { data: Array<{ id: string; data: { a: number } }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0]?.id).toBe("i2")
    expect(body.data[0]?.data.a).toBe(9)
  })

  test("重复 doc_id → 400（整组覆盖下重复会丢数据）", async () => {
    const res = await route.PUT(req("http://x/api/user-documents", "user-a", {
      method: "PUT",
      body: JSON.stringify({
        kind: "video",
        items: [{ id: "v1", data: {} }, { id: "v1", data: {} }],
      }),
    }))
    expect(res.status).toBe(400)
  })

  test("单条超过 64 KB → 413", async () => {
    const big = "x".repeat(70 * 1024)
    const res = await route.PUT(req("http://x/api/user-documents", "user-a", {
      method: "PUT",
      body: JSON.stringify({ kind: "video", items: [{ id: "v1", data: { blob: big } }] }),
    }))
    expect(res.status).toBe(413)
  })

  test("超过 500 条 → 400（zod 上限）", async () => {
    const items = Array.from({ length: 501 }, (_, i) => ({ id: `d${i}`, data: { i } }))
    const res = await route.PUT(req("http://x/api/user-documents", "user-a", {
      method: "PUT",
      body: JSON.stringify({ kind: "curriculum", items }),
    }))
    expect(res.status).toBe(400)
  })

  test("DELETE 清空后 GET 为空", async () => {
    await route.PUT(req("http://x/api/user-documents", "user-a", {
      method: "PUT",
      body: JSON.stringify({ kind: "schedule", items: [{ id: "s1", data: {} }] }),
    }))
    const del = await route.DELETE(req("http://x/api/user-documents?kind=schedule", "user-a"))
    expect(del.status).toBe(200)
    const res = await route.GET(req("http://x/api/user-documents?kind=schedule", "user-a"))
    const body = (await res.json()) as { data: unknown[] }
    expect(body.data).toHaveLength(0)
  })
})
