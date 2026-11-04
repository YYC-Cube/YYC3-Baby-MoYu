/**
 * @fileoverview PostgreSQL 建表语句（与 SQLite 版保持同构）
 * @description 字段类型刻意与 SQLite 保持一致（日期/JSON 用 TEXT，布尔用 INTEGER），
 *   使 `lib/db/server.ts` 的序列化/反序列化与业务代码零改动即可切换驱动。
 * @author YYC³
 * @version 1.0.0
 * @created 2026-11-02
 * @license MIT
 */

export const POSTGRES_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'parent',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  password_hash TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  is_active INTEGER DEFAULT 1,
  email_verified INTEGER DEFAULT 0,
  last_login_at TEXT
);

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

CREATE TABLE IF NOT EXISTS growth_records (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('milestone', 'observation', 'emotion', 'learning')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT,
  tags TEXT,
  emotion TEXT,
  ai_analysis TEXT,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS growth_assessments (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  dimensions TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  ai_summary TEXT,
  recommendations TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  child_id TEXT NOT NULL,
  milestone_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  achieved_at TEXT NOT NULL,
  celebration_data TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  child_id TEXT,
  user_id TEXT NOT NULL,
  messages TEXT NOT NULL,
  session_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
  updated_at TEXT,
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  age_group TEXT,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  content TEXT,
  media_urls TEXT,
  tags TEXT,
  is_free INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

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

CREATE TABLE IF NOT EXISTS user_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
