/**
 * @fileoverview 数据库驱动选择（SQLite 默认 / PostgreSQL 可选）
 * @description 迁移策略采用「双驱动 + 同接口」：
 *   - 默认仍为 SQLite（单实例、零运维、CI 无需 PG）；
 *   - 设置 `DB_DRIVER=postgres`（或让 `DATABASE_URL` 以 `postgres://` 开头）即切换到 PG15；
 *   - 业务代码与 `lib/db/server.ts` 的类型保持不变（PG 实现按 SQLite 的方法签名对齐）。
 *
 * 这样做的原因：一次性重写 688 行数据访问的风险远高于「同签名第二实现」，
 * 且可在同一进程内通过环境变量回滚，符合「可灰度、可回退」的发布要求。
 * @author YYC³
 * @version 1.0.0
 * @created 2026-11-02
 * @license MIT
 */

import { PostgresDatabase } from "./postgres-client"
import { SQLiteDatabase } from "./sqlite-client"

let dbInstance: SQLiteDatabase | null = null

export type { SQLiteDatabase }

/** 是否使用 PostgreSQL（显式 DB_DRIVER 优先；否则看连接串协议） */
export function isPostgresMode(): boolean {
  const driver = (process.env.DB_DRIVER ?? "").toLowerCase()
  if (driver === "postgres" || driver === "pg") return true
  if (driver === "sqlite") return false
  return /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL ?? "")
}

export function getDriverName(): "postgres" | "sqlite" {
  return isPostgresMode() ? "postgres" : "sqlite"
}

/**
 * 获取数据库单例
 * @description PG 实现与 SQLiteDatabase 方法签名对齐（含事务/分页/IN 查询/批量删除），
 *   因此这里做一次类型收窄，避免上层出现两套类型分支。
 */
export function getDatabase(): SQLiteDatabase {
  if (!dbInstance) {
    if (isPostgresMode()) {
      const url = process.env.DATABASE_URL
      if (!url) {
        throw new Error("DB_DRIVER=postgres 时必须提供 DATABASE_URL（postgres://…）")
      }
      console.log("🐘 数据库驱动：PostgreSQL")
      dbInstance = new PostgresDatabase(url) as unknown as SQLiteDatabase
    } else {
      const dbPath = process.env.DATABASE_URL || `${process.cwd()}/data/yyc3.db`
      console.log(`🗄️ 数据库驱动：SQLite（${dbPath}）`)
      dbInstance = new SQLiteDatabase(dbPath)
    }
  }
  return dbInstance
}

/** 仅测试用：重置单例（切换驱动后重新初始化） */
export function __resetDatabaseForTest(): void {
  dbInstance = null
}
