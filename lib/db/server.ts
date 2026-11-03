// 服务端数据访问层：API Route 专用
// 职责：SQLite 单例、种子数据确保、JSON 列的序列化/反序列化归一

import { getDatabase, SQLiteDatabase } from "./sqlite-client"

// 各表中以 JSON 字符串存储的列
const JSON_COLUMNS: Record<string, string[]> = {
  growth_records: ["media_urls", "tags"],
  growth_assessments: ["dimensions", "recommendations"],
  milestones: ["celebration_data"],
  ai_conversations: ["messages"],
  courses: ["content", "media_urls", "tags"],
  user_documents: ["payload"],
}

// 写入方向：对象/数组 → JSON 字符串
function serializeRow(table: string, data: Record<string, unknown>): Record<string, unknown> {
  const cols = JSON_COLUMNS[table]
  if (!cols) return { ...data }
  const out = { ...data }
  for (const col of cols) {
    if (out[col] !== undefined && out[col] !== null && typeof out[col] !== "string") {
      out[col] = JSON.stringify(out[col])
    }
  }
  return out
}

// 读取方向：JSON 字符串 → 对象/数组（坏值容错为原值/空数组）
function deserializeRow(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const cols = JSON_COLUMNS[table]
  if (!cols) return { ...row }
  const out = { ...row }
  for (const col of cols) {
    const v = out[col]
    if (typeof v === "string" && v.length > 0) {
      try {
        out[col] = JSON.parse(v)
      } catch {
        out[col] = []
      }
    } else if (v === null || v === undefined) {
      out[col] = []
    }
  }
  return out
}

let seedPromise: Promise<void> | null = null

// API 路由统一入口：拿到已初始化种子的数据库
export function getServerDB(): SQLiteDatabase {
  return getDatabase()
}

// 确保种子数据就绪（每个数据操作前 await，只执行一次）
async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = getDatabase()
      .seedMockData()
      .catch((err) => {
        console.error("[db] 种子数据初始化失败:", err)
        seedPromise = null
      })
  }
  await seedPromise
}

// 将 SQLite 底层错误翻译为对 API 友好的错误信息
// 只匹配外键错误；NOT NULL/UNIQUE 等其他约束错误不属于"关联记录不存在"
export function isForeignKeyError(error: unknown): boolean {
  const msg = String(error).toLowerCase(); return msg.includes("foreign key")
}

// 类型安全的表名白名单（防 SQL 注入：表名无法参数化）
const ALLOWED_TABLES = new Set([
  "users",
  "children",
  "growth_records",
  "growth_assessments",
  "milestones",
  "ai_conversations",
  "homework_tasks",
  "courses",
  "stage_transitions",
  "user_documents",
])

export function assertTable(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`非法表名: ${table}`)
  }
}

// —— 以下为面向 API 路由的便捷方法（自动处理 JSON 列） ——

export async function listRows<T = Record<string, unknown>>(
  table: string,
  conditions: Record<string, unknown> = {}
): Promise<T[]> {
  assertTable(table)
  await ensureSeeded()
  const rows = await getServerDB().findMany<Record<string, unknown>>(table, conditions)
  return rows.map((r) => deserializeRow(table, r)) as T[]
}

export async function createRow<T = Record<string, unknown>>(
  table: string,
  data: Record<string, unknown>
): Promise<T> {
  assertTable(table)
  await ensureSeeded()
  const created = await getServerDB().create(table, serializeRow(table, data))
  return deserializeRow(table, created) as T
}

export async function getRow<T = Record<string, unknown>>(table: string, id: string): Promise<T | null> {
  assertTable(table)
  await ensureSeeded()
  const row = await getServerDB().findOne<Record<string, unknown>>(table, id)
  return row ? (deserializeRow(table, row) as T) : null
}

export async function updateRow<T = Record<string, unknown>>(
  table: string,
  id: string,
  data: Record<string, unknown>
): Promise<T | null> {
  assertTable(table)
  await ensureSeeded()
  const updated = await getServerDB().update(table, id, serializeRow(table, data))
  return updated ? (deserializeRow(table, updated) as T) : null
}

export async function deleteRow(table: string, id: string): Promise<boolean> {
  assertTable(table)
  await ensureSeeded()
  return getServerDB().delete(table, id)
}

/**
 * 多孩子聚合查询（column IN 集合），替代逐孩子循环。
 * 表名经白名单校验，列名与排序经 SQL 标识符校验，适配层负责 JSON 列反序列化。
 */
export async function listRowsIn<T = Record<string, unknown>>(
  table: string,
  column: string,
  values: string[],
  options: {
    limit?: number
    offset?: number
    orderBy?: { column: string; direction?: "ASC" | "DESC" }
    equal?: Record<string, unknown>
  } = {}
): Promise<T[]> {
  assertTable(table)
  await ensureSeeded()
  const rows = await getServerDB().findManyIn<Record<string, unknown>>(table, column, values, options)
  return rows.map((r) => deserializeRow(table, r)) as T[]
}

/** 多孩子聚合计数（分页 total 用） */
export async function countRowsIn(
  table: string,
  column: string,
  values: string[],
  equal: Record<string, unknown> = {}
): Promise<number> {
  assertTable(table)
  await ensureSeeded()
  return getServerDB().countIn(table, column, values, equal)
}
