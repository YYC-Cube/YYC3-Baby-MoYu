// SQLite数据库客户端 - 真正的数据库解决方案
// 使用 Node.js 内置的 node:sqlite（Node >= 22.13），文件级持久化

// DB 客户端方法按异步 API 契约保留 async 签名（部分内部 await this.findMany 等），
// 其余同步实现，定向豁免 require-await。
/* eslint-disable @typescript-eslint/require-await */

import { existsSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import bcrypt from "bcryptjs"
import { assertSQLIdentifier } from "./identifier"
import { error as logQueryError } from "@/lib/logger/server"
import type { Assessment, Child, GrowthRecord, Milestone } from "./types"

// 数据库表创建SQL
const CREATE_TABLES_SQL = `
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'parent',
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- 儿童档案表
CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT,
  birth_date TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  avatar_url TEXT,
  current_stage TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 成长记录表
CREATE TABLE IF NOT EXISTS growth_records (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('milestone', 'observation', 'emotion', 'learning')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT, -- JSON数组
  tags TEXT, -- JSON数组
  emotion TEXT,
  ai_analysis TEXT,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 评估记录表
CREATE TABLE IF NOT EXISTS growth_assessments (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  dimensions TEXT NOT NULL, -- JSON数组
  overall_score INTEGER NOT NULL,
  ai_summary TEXT,
  recommendations TEXT, -- JSON数组
  created_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 里程碑记录表
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  milestone_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  achieved_at TEXT NOT NULL,
  celebration_data TEXT, -- JSON对象
  created_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- AI对话记录表
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  child_id TEXT,
  user_id TEXT NOT NULL,
  messages TEXT NOT NULL, -- JSON数组
  session_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 作业任务表
CREATE TABLE IF NOT EXISTS homework_tasks (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ai_feedback TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 课程表
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  age_group TEXT,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  content TEXT, -- JSON对象
  media_urls TEXT, -- JSON数组
  tags TEXT, -- JSON数组
  is_free BOOLEAN DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

-- 阶段转换记录表
CREATE TABLE IF NOT EXISTS stage_transitions (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  transition_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 用户文档集合表（客户端轻量集合的服务端化：课表/日程/互动/视频/评估）
-- 设计取舍：这些集合无服务端查询需求（仅按用户+类型整取），故采用「JSON 文档」而非逐字段建表，
-- 避免为 4 类异构结构引入 4 张宽表；后续若需聚合查询，再迁移为专用表。
CREATE TABLE IF NOT EXISTS user_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  payload TEXT NOT NULL, -- JSON 对象
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_records_child_id ON growth_records(child_id);
CREATE INDEX IF NOT EXISTS idx_growth_records_recorded_at ON growth_records(recorded_at);
CREATE INDEX IF NOT EXISTS idx_growth_assessments_child_id ON growth_assessments(child_id);
CREATE INDEX IF NOT EXISTS idx_milestones_child_id ON milestones(child_id);
CREATE INDEX IF NOT EXISTS idx_milestones_achieved_at ON milestones(achieved_at);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_child_id ON ai_conversations(child_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_homework_tasks_child_id ON homework_tasks(child_id);
CREATE INDEX IF NOT EXISTS idx_homework_tasks_due_date ON homework_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_homework_tasks_status ON homework_tasks(status);
CREATE INDEX IF NOT EXISTS idx_courses_subject ON courses(subject);
CREATE INDEX IF NOT EXISTS idx_stage_transitions_child_id ON stage_transitions(child_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_owner_kind ON user_documents(user_id, kind);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_documents_unique ON user_documents(user_id, kind, doc_id);
`

export class SQLiteDatabase {
  private db: DatabaseSync

  constructor(dbPath: string = ":memory:") {
    // 确保父目录存在（文件型数据库）
    const dir = dirname(dbPath)
    if (dbPath !== ":memory:" && dir && dir !== "." && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    this.db = new DatabaseSync(dbPath)
    this.initializeDatabase()
  }

  private initializeDatabase() {
    try {
      // 并发防护前置：等待锁 + WAL 模式
      this.db.exec("PRAGMA busy_timeout = 8000")
      this.db.exec("PRAGMA journal_mode = WAL")

      // 创建所有表（并发初始化时短暂锁库则重试）
      let attempts = 0
      while (true) {
        try {
          this.db.exec(CREATE_TABLES_SQL)
          break
        } catch (err) {
          if (++attempts >= 5) throw err
          const msg = String(err)
          if (msg.includes("locked") || msg.includes("busy")) {
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200)
            continue
          }
          throw err
        }
      }

      // 启用外键约束
      this.db.exec("PRAGMA foreign_keys = ON")

      // 兼容迁移：旧库 users 表补齐鉴权字段（P0-1 鉴权中间件融合）
      this.migrateUserAuthColumns()

      // 兼容迁移：growth_records/homework_tasks 补齐 updated_at 列。
      // 通用 update() 恒写 updated_at，缺列会导致更新静默失败（返回 null）。
      this.migrateUpdatedAtColumns()

      console.log("✅ SQLite数据库初始化成功")
    } catch (error) {
      console.error("❌ SQLite数据库初始化失败:", error)
      throw error
    }
  }

  // 通用查询方法
  async findMany<T>(table: string, conditions: Record<string, unknown> = {}): Promise<T[]> {
    try {
      assertSQLIdentifier(table, "table")
      for (const key of Object.keys(conditions)) assertSQLIdentifier(key)

      let query = `SELECT * FROM ${table}`
      const params: SQLInputValue[] = []

      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map(key => `${key} = ?`)
          .join(" AND ")
        query += ` WHERE ${whereClause}`
        params.push(...(Object.values(conditions) as SQLInputValue[]))
      }

      const stmt = this.db.prepare(query)
      return stmt.all(...params) as T[]
    } catch (error) {
      logQueryError(`查询失败 ${table}`, error, { module: "db", function: "findMany" })
      return []
    }
  }

  async findOne<T>(table: string, id: string): Promise<T | null> {
    try {
      assertSQLIdentifier(table, "table")
      const stmt = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`)
      const result = stmt.get(id) as T | undefined
      return result || null
    } catch (error) {
      logQueryError(`查询单条记录失败 ${table}`, error, { module: "db", function: "findOne" })
      return null
    }
  }

  async findFirst<T>(table: string, conditions: Record<string, unknown>): Promise<T | null> {
    try {
      const results = await this.findMany<T>(table, conditions)
      return results[0] || null
    } catch (error) {
      logQueryError(`查询首条记录失败 ${table}`, error, { module: "db", function: "findFirst" })
      return null
    }
  }

  async create<T extends Record<string, unknown>>(
    table: string,
    data: Omit<T, "id" | "created_at">
  ): Promise<T> {
    try {
      assertSQLIdentifier(table, "table")
      const id = crypto.randomUUID()
      const created_at = new Date().toISOString()
      const item = { ...data, id, created_at } as unknown as T

      const columns = Object.keys(item)
      for (const col of columns) assertSQLIdentifier(col)
      const columnList = columns.join(", ")
      const placeholders = columns.map(() => `?`).join(", ")
      const values = Object.values(item) as SQLInputValue[]

      const query = `INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`
      const stmt = this.db.prepare(query)
      stmt.run(...values)

      return item
    } catch (error) {
      logQueryError(`创建记录失败 ${table}`, error, { module: "db", function: "create" })
      throw error
    }
  }

  async createMany<T extends Record<string, unknown>>(
    table: string,
    dataArray: Omit<T, "id" | "created_at">[]
  ): Promise<T[]> {
    try {
      const items = dataArray.map((data) => ({
        ...data,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      })) as unknown as T[]

      for (const item of items) {
        await this.create(table, item)
      }

      return items
    } catch (error) {
      console.error(`批量创建记录失败 ${table}:`, error)
      throw error
    }
  }

  async update<T extends Record<string, unknown>>(
    table: string,
    id: string,
    data: Partial<Omit<T, "id" | "created_at">>
  ): Promise<T | null> {
    try {
      assertSQLIdentifier(table, "table")
      const updated_at = new Date().toISOString()
      const updateData = { ...data, updated_at }

      const columns = Object.keys(updateData)
      for (const col of columns) assertSQLIdentifier(col)
      const setClause = columns.map(key => `${key} = ?`).join(", ")
      const values: SQLInputValue[] = [...(Object.values(updateData) as SQLInputValue[]), id]

      const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`
      const stmt = this.db.prepare(query)
      stmt.run(...values)

      return this.findOne<T>(table, id)
    } catch (error) {
      logQueryError(`更新记录失败 ${table}`, error, { module: "db", function: "update" })
      return null
    }
  }

  async upsert<T extends Record<string, unknown>>(
    table: string,
    id: string,
    data: Omit<T, "id" | "created_at" | "updated_at">
  ): Promise<T> {
    try {
      const existing = await this.findOne<T>(table, id)
      if (existing) {
        return (await this.update<T>(table, id, data as unknown as Partial<Omit<T, "id" | "created_at">>)) as T
      }
      return this.create<T>(table, { ...data, id } as unknown as Omit<T, "id" | "created_at">)
    } catch (error) {
      console.error(`upsert记录失败 ${table}:`, error)
      throw error
    }
  }

  async delete(table: string, id: string): Promise<boolean> {
    try {
      assertSQLIdentifier(table, "table")
      const stmt = this.db.prepare(`DELETE FROM ${table} WHERE id = ?`)
      const result = stmt.run(id)
      return result.changes > 0
    } catch (error) {
      logQueryError(`删除记录失败 ${table}`, error, { module: "db", function: "delete" })
      return false
    }
  }

  async deleteMany(table: string, ids: string[]): Promise<number> {
    try {
      if (ids.length === 0) return 0
      assertSQLIdentifier(table, "table")

      const placeholders = ids.map(() => `?`).join(", ")
      const query = `DELETE FROM ${table} WHERE id IN (${placeholders})`
      const stmt = this.db.prepare(query)
      const result = stmt.run(...ids)
      return Number(result.changes)
    } catch (error) {
      logQueryError(`批量删除记录失败 ${table}`, error, { module: "db", function: "deleteMany" })
      return 0
    }
  }

  async count(table: string, conditions: Record<string, unknown> = {}): Promise<number> {
    try {
      assertSQLIdentifier(table, "table")
      for (const key of Object.keys(conditions)) assertSQLIdentifier(key)

      let query = `SELECT COUNT(*) as count FROM ${table}`
      const params: SQLInputValue[] = []

      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions)
          .map(key => `${key} = ?`)
          .join(" AND ")
        query += ` WHERE ${whereClause}`
        params.push(...(Object.values(conditions) as SQLInputValue[]))
      }

      const stmt = this.db.prepare(query)
      const result = stmt.get(...params) as { count: number }
      return result.count
    } catch (error) {
      logQueryError(`统计记录数失败 ${table}`, error, { module: "db", function: "count" })
      return 0
    }
  }

  // 分页查询
  async paginate<T>(
    table: string,
    options: {
      page: number
      pageSize: number
      filter?: Record<string, unknown>
      sort?: string
      order?: "ASC" | "DESC"
    }
  ): Promise<{ data: T[]; total: number; totalPages: number }> {
    try {
      const { page, pageSize, filter = {}, sort = "created_at", order = "DESC" } = options
      assertSQLIdentifier(table, "table")
      assertSQLIdentifier(sort, "column")
      if (order !== "ASC" && order !== "DESC") throw new Error(`非法排序方向: ${String(order)}`)
      for (const key of Object.keys(filter)) assertSQLIdentifier(key)
      const offset = (page - 1) * pageSize

      // 查询总数
      const total = await this.count(table, filter)

      // 查询分页数据
      let query = `SELECT * FROM ${table}`
      const params: SQLInputValue[] = []

      if (Object.keys(filter).length > 0) {
        const whereClause = Object.keys(filter)
          .map(key => `${key} = ?`)
          .join(" AND ")
        query += ` WHERE ${whereClause}`
        params.push(...(Object.values(filter) as SQLInputValue[]))
      }

      query += ` ORDER BY ${sort} ${order}`
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(pageSize, offset)

      const stmt = this.db.prepare(query)
      const data = stmt.all(...params) as T[]

      const totalPages = Math.ceil(total / pageSize)

      return { data, total, totalPages }
    } catch (error) {
      logQueryError(`分页查询失败 ${table}`, error, { module: "db", function: "paginate" })
      return { data: [], total: 0, totalPages: 0 }
    }
  }

  /**
   * 按集合条件批量查询（column IN (...)），可选排序与分页
   * @description 用于「多孩子聚合」场景：替代逐个孩子循环查询（N+1）。
   *   column 与排序列均经标识符校验；空集合直接返回 []，不发 SQL。
   */
  async findManyIn<T>(
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
    try {
      assertSQLIdentifier(table, "table")
      assertSQLIdentifier(column)
      if (values.length === 0) return []
      const { limit, offset = 0, orderBy, equal = {} } = options

      const placeholders = values.map(() => "?").join(", ")
      let query = `SELECT * FROM ${table} WHERE ${column} IN (${placeholders})`
      const params: SQLInputValue[] = [...values]

      for (const [key, value] of Object.entries(equal)) {
        assertSQLIdentifier(key)
        query += ` AND ${key} = ?`
        params.push(value as SQLInputValue)
      }

      if (orderBy) {
        assertSQLIdentifier(orderBy.column)
        const direction = orderBy.direction === "ASC" ? "ASC" : "DESC"
        query += ` ORDER BY ${orderBy.column} ${direction}`
      }
      if (limit !== undefined) {
        query += ` LIMIT ? OFFSET ?`
        params.push(Math.max(1, limit), Math.max(0, offset))
      }

      const stmt = this.db.prepare(query)
      return stmt.all(...params) as T[]
    } catch (error) {
      logQueryError(`批量查询失败 ${table}.${column}`, error, { module: "db", function: "findManyIn" })
      return []
    }
  }

  /** 按集合条件计数（与 findManyIn 同语义，供分页 total 使用） */
  async countIn(table: string, column: string, values: string[], equal: Record<string, unknown> = {}): Promise<number> {
    try {
      assertSQLIdentifier(table, "table")
      assertSQLIdentifier(column)
      if (values.length === 0) return 0

      const placeholders = values.map(() => "?").join(", ")
      let query = `SELECT COUNT(*) as count FROM ${table} WHERE ${column} IN (${placeholders})`
      const params: SQLInputValue[] = [...values]
      for (const [key, value] of Object.entries(equal)) {
        assertSQLIdentifier(key)
        query += ` AND ${key} = ?`
        params.push(value as SQLInputValue)
      }

      const stmt = this.db.prepare(query)
      const result = stmt.get(...params) as { count: number }
      return result.count
    } catch (error) {
      logQueryError(`批量计数失败 ${table}.${column}`, error, { module: "db", function: "countIn" })
      return 0
    }
  }

  // 原子性事务支持
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    this.db.exec("BEGIN")
    try {
      const result = await callback()
      this.db.exec("COMMIT")
      return result
    } catch (error) {
      this.db.exec("ROLLBACK")
      throw error
    }
  }

  // 数据库备份
  backup(backupPath: string): boolean {
    try {
      const dir = dirname(backupPath)
      if (dir && dir !== "." && !existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      this.db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`)
      console.log(`✅ 数据库备份成功: ${backupPath}`)
      return true
    } catch (error) {
      console.error(`❌ 数据库备份失败:`, error)
      return false
    }
  }

  // 数据库优化
  optimize(): void {
    try {
      this.db.exec("VACUUM")
      this.db.exec("ANALYZE")
      console.log("✅ 数据库优化完成")
    } catch (error) {
      console.error("❌ 数据库优化失败:", error)
    }
  }

  // 兼容迁移：users 表补齐鉴权字段（P0-1 鉴权中间件融合，幂等）
  private migrateUserAuthColumns(): void {
    const authColumns: Array<{ name: string; ddl: string }> = [
      { name: "password_hash", ddl: "password_hash TEXT" },
      { name: "first_name", ddl: "first_name TEXT" },
      { name: "last_name", ddl: "last_name TEXT" },
      { name: "phone", ddl: "phone TEXT" },
      { name: "is_active", ddl: "is_active INTEGER DEFAULT 1" },
      { name: "email_verified", ddl: "email_verified INTEGER DEFAULT 0" },
      { name: "last_login_at", ddl: "last_login_at TEXT" },
    ]
    for (const col of authColumns) {
      try {
        this.db.exec(`ALTER TABLE users ADD COLUMN ${col.ddl}`)
        console.log(`✅ 迁移: users 表新增列 ${col.name}`)
      } catch (err) {
        // 列已存在时忽略（幂等），其余错误才抛出
        if (!String(err).includes("duplicate column")) throw err
      }
    }
  }

  // 兼容迁移：数据表补齐 updated_at（幂等）
  private migrateUpdatedAtColumns(): void {
    for (const table of ["growth_records", "homework_tasks"]) {
      try {
        this.db.exec(`ALTER TABLE ${table} ADD COLUMN updated_at TEXT`)
        console.log(`✅ 迁移: ${table} 表新增列 updated_at`)
      } catch (err) {
        if (!String(err).includes("duplicate column")) throw err
      }
    }
  }

  // 关闭数据库连接
  close(): void {
    this.db.close()
    console.log("✅ 数据库连接已关闭")
  }

  // 初始化示例数据
  async seedMockData(): Promise<void> {
    try {
      // 生产环境禁止种入演示账号（parent@yyc3.com 公开口令不可进生产）
      if (process.env.NODE_ENV === "production") {
        console.log("📋 生产环境：跳过演示数据初始化")
        return
      }

      // 检查是否已有数据
      const userCount = await this.count("users")
      if (userCount > 0) {
        console.log("📋 数据库已有数据，跳过初始化")
        return
      }

      console.log("🌱 开始初始化示例数据...")

      await this.transaction(async () => {
        // 创建示例用户（演示账号 parent@yyc3.com / demo123456，供登录后查看种子数据）
        const user = await this.create("users", {
          email: "parent@yyc3.com",
          name: "张女士",
          avatar_url: "/placeholder.svg?height=100&width=100",
          role: "parent",
          password_hash: bcrypt.hashSync("demo123456", 12),
        })

        // 创建示例儿童档案
        const child = await this.create("children", {
          user_id: user.id,
          name: "小语",
          nickname: "小语",
          birth_date: "2018-09-15",
          gender: "female",
          avatar_url: "/placeholder.svg?height=100&width=100",
          current_stage: "6-9岁学术奠基期",
        })

        // 创建示例成长记录
        await this.create("growth_records", {
          child_id: child.id,
          type: "milestone",
          title: "第一次独立完成数学作业",
          content: "今天小语第一次不需要任何帮助就完成了所有数学作业，展现了很强的独立学习能力。",
          media_urls: JSON.stringify([]),
          tags: JSON.stringify(["学习", "独立"]),
          emotion: "proud",
          recorded_at: new Date().toISOString(),
        })

        // 创建示例作业任务
        await this.createMany("homework_tasks", [
          {
            child_id: child.id,
            subject: "数学",
            title: "完成练习册第15-18页",
            description: "重点复习分数加减法",
            due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
            status: "in_progress",
            priority: "high",
          },
          {
            child_id: child.id,
            subject: "语文",
            title: "背诵古诗《春晓》",
            description: "理解诗意并能默写",
            due_date: new Date(Date.now() + 172800000).toISOString().split("T")[0],
            status: "pending",
            priority: "normal",
          },
        ])

        // 创建示例课程
        await this.createMany("courses", [
          {
            title: "趣味数学入门",
            description: "通过游戏和故事学习基础数学概念",
            subject: "数学",
            age_group: "6-9岁",
            difficulty_level: 2,
            content: JSON.stringify({
              chapters: ["数字认知", "简单加法", "趣味减法", "实际应用"],
              duration: "4周",
            }),
            media_urls: JSON.stringify([]),
            tags: JSON.stringify(["基础", "游戏化", "互动"]),
          },
          {
            title: "语文阅读启蒙",
            description: "培养阅读兴趣和理解能力",
            subject: "语文",
            age_group: "6-9岁",
            difficulty_level: 1,
            content: JSON.stringify({
              chapters: ["字母认知", "拼音基础", "简单词汇", "阅读理解"],
              duration: "6周",
            }),
            media_urls: JSON.stringify([]),
            tags: JSON.stringify(["启蒙", "阅读", "基础"]),
          },
        ])
      })

      console.log("✅ 示例数据初始化完成")
    } catch (error) {
      console.error("❌ 示例数据初始化失败:", error)
      throw error
    }
  }

  // 清除所有数据（开发用）
  async clearAll(): Promise<void> {
    try {
      const tables = [
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
          this.db.exec(`DELETE FROM ${table}`)
        }
      })

      console.log("✅ 所有数据已清除")
    } catch (error) {
      console.error("❌ 清除数据失败:", error)
      throw error
    }
  }
}

// 创建并导出数据库实例
let dbInstance: SQLiteDatabase | null = null

export function getDatabase(): SQLiteDatabase {
  if (!dbInstance) {
    const dbPath = process.env.DATABASE_URL || `${process.cwd()}/data/yyc3.db`
    dbInstance = new SQLiteDatabase(dbPath)
  }
  return dbInstance
}

// 注意：不再提供模块级饿汉式导出（构建期多 worker 并发求值会锁库），
// 一律通过 getDatabase() 懒加载获取实例。

// 类型导出
export type { Assessment, Child, GrowthRecord, Milestone }
