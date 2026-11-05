/**
 * @fileoverview PostgreSQL 数据访问实现（与 SQLiteDatabase 同接口）
 * @description 迁移目标：本机 PG15（5433）。设计要点：
 *   - **零业务改动**：字段类型沿用 SQLite 口径（日期/JSON 为 TEXT，布尔为 INTEGER），
 *     `lib/db/server.ts` 的序列化/反序列化无需分支；
 *   - **标识符安全**：表名/列名复用 `assertSQLIdentifier`，值一律参数化（$n）；
 *   - **事务正确性**：PG 连接池下用 AsyncLocalStorage 绑定事务客户端，
 *     保证 `transaction()` 内部的所有查询走同一连接（SQLite 单连接天然满足）；
 *   - **不自动种演示数据**：PG 面向部署环境，`seedMockData` 默认跳过。
 * @author YYC³
 * @version 1.0.0
 * @created 2026-11-02
 * @license MIT
 */

import { AsyncLocalStorage } from "node:async_hooks"
import { Pool, type PoolClient } from "pg"
import { assertSQLIdentifier } from "./identifier"
import { POSTGRES_SCHEMA_SQL } from "./postgres-schema"
import { error as logQueryError } from "@/lib/logger/server"

type Row = Record<string, unknown>

const txStorage = new AsyncLocalStorage<PoolClient>()

/** `=`/`IN` 条件的统一构造，避免各处重复拼接 */
interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: { column: string; direction?: "ASC" | "DESC" }
  equal?: Record<string, unknown>
}

export class PostgresDatabase {
  private pool: Pool
  private ready: Promise<void>

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_MAX ?? 10),
      // 单实例应用：连接空闲 30s 回收，避免长期占用 PG 连接名额
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
    this.ready = this.initialize()
  }

  private async initialize(): Promise<void> {
    try {
      await this.pool.query(POSTGRES_SCHEMA_SQL)
      console.log("✅ PostgreSQL 表结构就绪")
    } catch (err) {
      console.error("❌ PostgreSQL 初始化失败：", err)
      throw err
    }
  }

  /** 统一查询入口：事务上下文优先，否则用连接池 */
  private async query<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
    await this.ready
    const client = txStorage.getStore()
    const result = client ? await client.query(sql, params) : await this.pool.query(sql, params)
    return result.rows as T[]
  }

  async findMany<T extends Row = Row>(table: string, conditions: Record<string, unknown> = {}): Promise<T[]> {
    try {
      assertSQLIdentifier(table, "table")
      const keys = Object.keys(conditions)
      keys.forEach((k) => { assertSQLIdentifier(k) })
      const where = keys.length ? ` WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(" AND ")}` : ""
      return await this.query<T>(`SELECT * FROM ${table}${where}`, keys.map((k) => conditions[k]))
    } catch (err) {
      logQueryError(`PG 查询失败 ${table}`, err, { module: "db", function: "findMany" })
      return []
    }
  }

  async findOne<T extends Row = Row>(table: string, id: string): Promise<T | null> {
    try {
      assertSQLIdentifier(table, "table")
      const rows = await this.query<T>(`SELECT * FROM ${table} WHERE id = $1 LIMIT 1`, [id])
      return rows[0] ?? null
    } catch (err) {
      logQueryError(`PG 单条查询失败 ${table}`, err, { module: "db", function: "findOne" })
      return null
    }
  }

  async findFirst<T extends Row = Row>(table: string, conditions: Record<string, unknown>): Promise<T | null> {
    const rows = await this.findMany<T>(table, conditions)
    return rows[0] ?? null
  }

  async create<T extends Row = Row>(table: string, data: Omit<T, "id" | "created_at">): Promise<T> {
    try {
      assertSQLIdentifier(table, "table")
      const item: Row = {
        ...(data as Row),
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      }
      const columns = Object.keys(item)
      columns.forEach((c) => { assertSQLIdentifier(c) })
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ")
      const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
      await this.query(sql, columns.map((c) => item[c]))
      return item as T
    } catch (err) {
      console.error(`PG 写入失败 ${table}:`, err)
      throw err
    }
  }

  async createMany<T extends Row = Row>(table: string, dataArray: Omit<T, "id" | "created_at">[]): Promise<T[]> {
    const out: T[] = []
    for (const item of dataArray) out.push(await this.create<T>(table, item))
    return out
  }

  async update<T extends Row = Row>(table: string, id: string, data: Partial<Omit<T, "id" | "created_at">>): Promise<T | null> {
    try {
      assertSQLIdentifier(table, "table")
      const patch: Row = { ...(data as Row), updated_at: new Date().toISOString() }
      const keys = Object.keys(patch)
      keys.forEach((k) => { assertSQLIdentifier(k) })
      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ")
      const existing = await this.query(`SELECT id FROM ${table} WHERE id = $1`, [id])
      if (existing.length === 0) return null
      await this.query(`UPDATE ${table} SET ${sets} WHERE id = $${keys.length + 1}`, [...keys.map((k) => patch[k]), id])
      return await this.findOne<T>(table, id)
    } catch (err) {
      logQueryError(`PG 更新失败 ${table}`, err, { module: "db", function: "update" })
      return null
    }
  }

  async upsert<T extends Row = Row>(table: string, id: string, data: Omit<T, "id" | "created_at" | "updated_at">): Promise<T> {
    const existing = await this.findOne<T>(table, id)
    if (existing) return (await this.update<T>(table, id, data as Partial<Omit<T, "id" | "created_at">>)) as T
    return this.create<T>(table, { ...(data as Row), id } as unknown as Omit<T, "id" | "created_at">)
  }

  async delete(table: string, id: string): Promise<boolean> {
    try {
      assertSQLIdentifier(table, "table")
      const rows = await this.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id])
      return rows.length > 0
    } catch (err) {
      logQueryError(`PG 删除失败 ${table}`, err, { module: "db", function: "delete" })
      return false
    }
  }

  async deleteMany(table: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0
    try {
      assertSQLIdentifier(table, "table")
      // ANY($1) 需要显式数组参数，避免超长 SQL
      const rows = await this.query(`DELETE FROM ${table} WHERE id = ANY($1::text[]) RETURNING id`, [ids])
      return rows.length
    } catch (err) {
      logQueryError(`PG 批量删除失败 ${table}`, err, { module: "db", function: "deleteMany" })
      return 0
    }
  }

  async count(table: string, conditions: Record<string, unknown> = {}): Promise<number> {
    try {
      assertSQLIdentifier(table, "table")
      const keys = Object.keys(conditions)
      keys.forEach((k) => { assertSQLIdentifier(k) })
      const where = keys.length ? ` WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(" AND ")}` : ""
      const rows = await this.query<{ count: string | number }>(
        `SELECT COUNT(*) AS count FROM ${table}${where}`,
        keys.map((k) => conditions[k]),
      )
      return Number(rows[0]?.count ?? 0)
    } catch (err) {
      logQueryError(`PG 计数失败 ${table}`, err, { module: "db", function: "count" })
      return 0
    }
  }

  async paginate<T extends Row = Row>(
    table: string,
    options: { page: number; pageSize: number; filter?: Record<string, unknown>; sort?: string; order?: "ASC" | "DESC" },
  ): Promise<{ data: T[]; total: number; totalPages: number }> {
    try {
      assertSQLIdentifier(table, "table")
      const { page, pageSize, filter = {}, sort = "created_at", order = "DESC" } = options
      assertSQLIdentifier(sort, "column")
      Object.keys(filter).forEach((k) => { assertSQLIdentifier(k) })
      const total = await this.count(table, filter)
      const keys = Object.keys(filter)
      const where = keys.length ? ` WHERE ${keys.map((k, i) => `${k} = $${i + 1}`).join(" AND ")}` : ""
      const offset = (Math.max(1, page) - 1) * pageSize
      const data = await this.query<T>(
        `SELECT * FROM ${table}${where} ORDER BY ${sort} ${order === "ASC" ? "ASC" : "DESC"} LIMIT $${keys.length + 1} OFFSET $${keys.length + 2}`,
        [...keys.map((k) => filter[k]), pageSize, offset],
      )
      return { data, total, totalPages: Math.ceil(total / pageSize) }
    } catch (err) {
      logQueryError(`PG 分页失败 ${table}`, err, { module: "db", function: "paginate" })
      return { data: [], total: 0, totalPages: 0 }
    }
  }

  async findManyIn<T extends Row = Row>(table: string, column: string, values: string[], options: QueryOptions = {}): Promise<T[]> {
    try {
      assertSQLIdentifier(table, "table")
      assertSQLIdentifier(column)
      if (values.length === 0) return []
      const { limit, offset = 0, orderBy, equal = {} } = options

      let sql = `SELECT * FROM ${table} WHERE ${column} = ANY($1::text[])`
      const params: unknown[] = [values]
      let idx = 2
      for (const [key, value] of Object.entries(equal)) {
        assertSQLIdentifier(key)
        sql += ` AND ${key} = $${idx++}`
        params.push(value)
      }
      if (orderBy) {
        assertSQLIdentifier(orderBy.column)
        sql += ` ORDER BY ${orderBy.column} ${orderBy.direction === "ASC" ? "ASC" : "DESC"}`
      }
      if (limit !== undefined) {
        sql += ` LIMIT $${idx++} OFFSET $${idx}`
        params.push(Math.max(1, limit), Math.max(0, offset))
      }
      return await this.query<T>(sql, params)
    } catch (err) {
      logQueryError(`PG 批量查询失败 ${table}.${column}`, err, { module: "db", function: "findManyIn" })
      return []
    }
  }

  async countIn(table: string, column: string, values: string[], equal: Record<string, unknown> = {}): Promise<number> {
    try {
      assertSQLIdentifier(table, "table")
      assertSQLIdentifier(column)
      if (values.length === 0) return 0
      let sql = `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ANY($1::text[])`
      const params: unknown[] = [values]
      let idx = 2
      for (const [key, value] of Object.entries(equal)) {
        assertSQLIdentifier(key)
        sql += ` AND ${key} = $${idx++}`
        params.push(value)
      }
      const rows = await this.query<{ count: string | number }>(sql, params)
      return Number(rows[0]?.count ?? 0)
    } catch (err) {
      logQueryError(`PG 批量计数失败 ${table}.${column}`, err, { module: "db", function: "countIn" })
      return 0
    }
  }

  /**
   * 事务：用 AsyncLocalStorage 绑定专用连接
   * @description 若不绑定连接，池化环境下的 BEGIN/COMMIT 与业务查询会落在不同连接上，
   *   导致「事务无效但看起来成功」——这是从 SQLite 迁移最容易踩的坑。
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.ready
    const client = await this.pool.connect()
    try {
      await client.query("BEGIN")
      const result = await txStorage.run(client, callback)
      await client.query("COMMIT")
      return result
    } catch (err) {
      try {
        await client.query("ROLLBACK")
      } catch (rollbackErr) {
        console.error("PG 回滚失败：", rollbackErr)
      }
      throw err
    } finally {
      client.release()
    }
  }

  /**
   * 备份：PG 不走 VACUUM INTO
   * @returns false 并提示使用 pg_dump（避免误以为已备份）
   */
  backup(_backupPath: string): boolean {
    console.warn("[db] PostgreSQL 模式请使用 pg_dump 备份，例如：pg_dump --format=custom")
    return false
  }

  optimize(): void {
    this.query("ANALYZE").catch((err) => { console.error("PG ANALYZE 失败：", err) })
  }

  async close(): Promise<void> {
    await this.pool.end()
    console.log("✅ PostgreSQL 连接池已关闭")
  }

  /**
   * 演示数据：PG 面向部署环境，默认**不种子化**
   * （生产禁止公开演示口令；开发需要示例数据请显式 `SEED_DEMO=true`）
   */
  async seedMockData(): Promise<void> {
    if (process.env.NODE_ENV === "production" || process.env.SEED_DEMO !== "true") return
    const existing = await this.count("users")
    if (existing > 0) return
    console.log("🌱 PG 模式：SEED_DEMO=true，写入最小演示数据（仅用户/孩子/一条记录）")
    await this.transaction(async () => {
      const user = await this.create("users", {
        email: "parent@yyc3.com",
        name: "演示家长",
        role: "parent",
        password_hash: "",
        is_active: 1,
        email_verified: 1,
      })
      const child = await this.create("children", {
        user_id: user["id"],
        name: "小语",
        birth_date: "2020-01-01",
        gender: "female",
        current_stage: "3-6",
      })
      await this.create("growth_records", {
        child_id: child["id"],
        type: "milestone",
        title: "第一次独立完成数学作业",
        content: "演示数据：记录一条成长里程碑。",
        media_urls: JSON.stringify([]),
        tags: JSON.stringify(["演示"]),
        recorded_at: new Date().toISOString(),
      })
    })
  }

  async clearAll(): Promise<void> {
    const tables = [
      "user_documents",
      "stage_transitions",
      "courses",
      "homework_tasks",
      "ai_conversations",
      "milestones",
      "growth_assessments",
      "growth_records",
      "children",
      "users",
    ]
    await this.transaction(async () => {
      for (const table of tables) {
        assertSQLIdentifier(table, "table")
        await this.query(`DELETE FROM ${table}`)
      }
    })
    console.log("✅ PostgreSQL 数据已清空")
  }
}
