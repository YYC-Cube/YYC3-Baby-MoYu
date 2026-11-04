/**
 * postgres-client 直测（Node 子运行器）
 * 运行：PG_TEST_URL=postgres://yanyu@127.0.0.1:5433/yyc3_baby_moyu_test bun run test:node
 * 无 PG_TEST_URL 时整组跳过（CI 默认不依赖 PostgreSQL）。
 * 覆盖：CRUD / 事务回滚 / IN 查询与计数 / 唯一索引 / 标识符拒绝
 */

import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"

import { PostgresDatabase } from "@/lib/db/postgres-client"

const url = process.env.PG_TEST_URL
const enabled = Boolean(url)

describe("PostgresDatabase（需 PG_TEST_URL）", { skip: !enabled }, () => {
  let db: PostgresDatabase

  before(async () => {
    db = new PostgresDatabase(url as string)
    await db.clearAll()
  })

  after(async () => {
    await db.clearAll()
    await db.close()
  })

  test("CRUD 往返：create → findMany/findOne → update → delete", async () => {
    const user = await db.create<{ id?: string }>("users", {
      email: `pg${Date.now()}@t.cn`,
      name: "PG 测试",
      role: "parent",
      is_active: 1,
    })
    const list = await db.findMany("users", { email: `pg${Date.now()}@t.cn` })
    assert.ok(user.id)
    assert.equal(list.length, 0) // email 不同（时间戳再取一次），验证条件过滤确实生效

    const one = await db.findOne<{ id: string; name?: string }>("users", String(user.id))
    assert.equal(one?.name, "PG 测试")

    const updated = await db.update<{ id: string; name?: string }>("users", String(user.id), { name: "PG 测试改" })
    assert.equal(updated?.name, "PG 测试改")
    assert.equal(await db.count("users"), 1)

    assert.equal(await db.delete("users", String(user.id)), true)
    assert.equal(await db.count("users"), 0)
  })

  test("IN 查询 + 等值过滤 + 分页排序", async () => {
    const user = await db.create<{ id: string }>("users", { email: "in@t.cn", name: "IN", role: "parent" })
    const c1 = await db.create<{ id: string }>("children", {
      user_id: user.id, name: "A", birth_date: "2020-01-01", gender: "female",
    })
    const c2 = await db.create<{ id: string }>("children", {
      user_id: user.id, name: "B", birth_date: "2021-01-01", gender: "male",
    })
    await db.create("growth_records", {
      child_id: c1.id, type: "milestone", title: "t1", content: "c", recorded_at: "2026-01-01T00:00:00Z",
    })
    await db.create("growth_records", {
      child_id: c2.id, type: "observation", title: "t2", content: "c", recorded_at: "2026-02-01T00:00:00Z",
    })

    const rows = await db.findManyIn("growth_records", "child_id", [c1.id, c2.id], {
      orderBy: { column: "recorded_at", direction: "DESC" },
      limit: 1,
      offset: 0,
    })
    assert.equal(rows.length, 1)
    assert.equal(rows[0]!["title"], "t2")

    assert.equal(await db.countIn("growth_records", "child_id", [c1.id, c2.id]), 2)
    assert.equal(await db.countIn("growth_records", "child_id", [c1.id, c2.id], { type: "milestone" }), 1)
    const empty = await db.findManyIn("growth_records", "child_id", [])
    assert.equal(empty.length, 0)
  })

  test("事务在抛错时整体回滚（连接绑定正确）", async () => {
    await assert.rejects(
      db.transaction(async () => {
        await db.create("users", { email: "rollback@t.cn", name: "回滚", role: "parent" })
        throw new Error("force rollback")
      }),
    )
    assert.equal(await db.count("users", { email: "rollback@t.cn" }), 0)
  })

  test("唯一索引生效：同一 user+kind+doc_id 重复插入报错", async () => {
    const user = await db.create<{ id: string }>("users", { email: "uniq@t.cn", name: "U", role: "parent" })
    await db.create("user_documents", {
      user_id: user.id, kind: "schedule", doc_id: "s1", payload: JSON.stringify({ a: 1 }),
    })
    await assert.rejects(
      db.create("user_documents", {
        user_id: user.id, kind: "schedule", doc_id: "s1", payload: JSON.stringify({ a: 2 }),
      }),
    )
  })

  test("非法表名被拒绝（不静默执行）", async () => {
    await assert.rejects(db.create("users; DROP TABLE users", { email: "x@t.cn" }))
  })
})
