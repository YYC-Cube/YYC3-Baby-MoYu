#!/usr/bin/env node
/**
 * SQLite → PostgreSQL 一次性数据迁移
 *
 * 用法：
 *   node scripts/migrate-sqlite-to-pg.mjs \
 *     --sqlite data/yyc3.db \
 *     --pg postgres://yanyu@127.0.0.1:5433/yyc3_baby_moyu \
 *     [--truncate]
 *
 * 设计说明：
 * - 只做「整表复制 + 幂等插入（ON CONFLICT (id) DO NOTHING）」，不做字段变换：
 *   两套 schema 刻意同构（日期/JSON 为 TEXT，布尔为 INTEGER）。
 * - 顺序按外键依赖排列（users → children → 业务表），避免 FK 违约。
 * - `--truncate` 会先清空目标库同名表（**破坏性**，需显式传参）。
 * - 迁移后打印各表行数并做一次比对，失败即非零退出。
 */

import { DatabaseSync } from "node:sqlite"
import { readFileSync } from "node:fs"
import { Client } from "pg"

const args = process.argv.slice(2)
const argOf = (name, fallback) => {
  const idx = args.indexOf(name)
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback
}

const sqlitePath = argOf("--sqlite", process.env.SQLITE_PATH ?? "data/yyc3.db")
const pgUrl = argOf("--pg", process.env.PG_URL ?? process.env.DATABASE_URL)
const truncate = args.includes("--truncate")
const initSchema = !args.includes("--no-schema")

/**
 * 从 TS 常量中提取 DDL（保持「单一事实源」：schema 定义只在 lib/db/postgres-schema.ts 一处）
 * @description 该脚本刻意不依赖 TS 运行时：一次性运维脚本用正则抽取文本即可，避免引入 tsx/bun 依赖。
 */
function loadSchemaSql() {
  const source = readFileSync("lib/db/postgres-schema.ts", "utf8")
  const match = source.match(/export const POSTGRES_SCHEMA_SQL = `([\s\S]*?)`\n/)
  if (!match) throw new Error("无法从 lib/db/postgres-schema.ts 提取 DDL")
  return match[1]
}

if (!pgUrl || !/^postgres(ql)?:\/\//.test(pgUrl)) {
  console.error("❌ 需要 --pg postgres://user@host:port/db（或环境变量 PG_URL）")
  process.exit(1)
}

/** 外键安全顺序 */
const TABLE_ORDER = [
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
]

const sqlite = new DatabaseSync(sqlitePath, { readOnly: true })
const pg = new Client({ connectionString: pgUrl })

function sqliteRows(table) {
  try {
    return sqlite.prepare(`SELECT * FROM ${table}`).all()
  } catch (err) {
    if (String(err).includes("no such table")) return null
    throw err
  }
}

function sqliteCount(table) {
  try {
    return Number(sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c)
  } catch {
    return 0
  }
}

async function main() {
  await pg.connect()
  console.log(`📦 源：${sqlitePath}\n🐘 目标：${pgUrl.replace(/\/\/.*@/, "//***@")}`)

  if (initSchema) {
    // 目标库为空时必须先建表（应用首次启动也会建，此处在迁移前保证幂等就绪）
    await pg.query(loadSchemaSql())
    console.log("🧱 目标库表结构已就绪（IF NOT EXISTS）")
  }

  if (truncate) {
    console.log("⚠️  --truncate：先清空目标库同名表")
    for (const table of [...TABLE_ORDER].reverse()) {
      await pg.query(`DELETE FROM ${table}`).catch(() => {})
    }
  }

  const report = []
  for (const table of TABLE_ORDER) {
    const rows = sqliteRows(table)
    if (rows === null) {
      console.log(`- ${table}: 源库无此表，跳过`)
      continue
    }
    if (rows.length === 0) {
      console.log(`- ${table}: 0 行`)
      continue
    }

    const columns = Object.keys(rows[0])
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ")
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`

    let inserted = 0
    for (const row of rows) {
      const result = await pg.query(sql, columns.map((c) => row[c]))
      inserted += result.rowCount ?? 0
    }

    const target = Number((await pg.query(`SELECT COUNT(*) AS c FROM ${table}`)).rows[0].c)
    report.push({ table, source: sqliteCount(table), inserted, target })
    console.log(`- ${table}: 源 ${sqliteCount(table)} 行 → 新插入 ${inserted}，目标现有 ${target} 行`)
  }

  const mismatch = report.filter((r) => r.source !== r.target)
  if (mismatch.length > 0) {
    console.error("\n❌ 行数不一致：", mismatch.map((m) => `${m.table}(${m.source}→${m.target})`).join(", "))
    process.exitCode = 1
  } else {
    console.log("\n✅ 迁移完成，行数一致")
  }
}

main()
  .catch((err) => {
    console.error("❌ 迁移失败：", err)
    process.exitCode = 1
  })
  .finally(async () => {
    await pg.end().catch(() => {})
    sqlite.close()
  })
