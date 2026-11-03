/**
 * @fileoverview 客户端集合的服务端化端点（课表 / 日程 / 互动 / 视频 / 评估）
 * @description 这些集合在客户端以「整组数组」维护（增删改后整体重算），
 *   因此契约采用 **replace-all**（PUT 全量替换），而不是逐条 PATCH：
 *   - 与前端现有状态模型一致，避免为 4 类异构结构写 20+ 端点；
 *   - 代价是「整组覆盖」，故用事务 + 唯一索引保证不产生半写状态。
 *   安全约束：登录必需、按用户隔离、单次 ≤500 条、单条 ≤64 KB、总量 ≤1 MB。
 * @author YYC³
 * @version 1.0.0
 * @created 2026-11-02
 * @license MIT
 */

import { requireAuth } from "@/lib/auth/guard"
import { createRow, listRows } from "@/lib/db/server"
import { getServerDB } from "@/lib/db/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

/** 允许的集合类型（新增类型必须在此登记，防止把表当通用 KV 滥用） */
const KINDS = ["schedule", "curriculum", "interaction", "video", "assessment"] as const
type Kind = (typeof KINDS)[number]

const MAX_ITEMS = 500
const MAX_ITEM_BYTES = 64 * 1024
const MAX_TOTAL_BYTES = 1024 * 1024

const kindSchema = z.enum(KINDS)

const putSchema = z.object({
  kind: kindSchema,
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(128),
        data: z.record(z.string(), z.unknown()),
      }),
    )
    .max(MAX_ITEMS),
})

interface DocumentRow {
  id: string
  doc_id: string
  payload: Record<string, unknown>
  updated_at?: string | null
}

function jsonSize(value: unknown): number {
  try {
    return JSON.stringify(value).length
  } catch {
    // 循环引用等不可序列化结构：按超限处理，避免无界写入
    return Number.MAX_SAFE_INTEGER
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const kindParam = request.nextUrl.searchParams.get("kind")
  const parsedKind = kindSchema.safeParse(kindParam)
  if (!parsedKind.success) {
    return NextResponse.json(
      { success: false, error: "Validation Error", message: `kind 必须为 ${KINDS.join("/")} 之一` },
      { status: 400 },
    )
  }

  try {
    const rows = await listRows<DocumentRow>("user_documents", {
      user_id: auth.user.id,
      kind: parsedKind.data,
    })
    return NextResponse.json({
      data: rows.map((r) => ({ id: r.doc_id, data: r.payload, updatedAt: r.updated_at ?? null })),
      success: true,
    })
  } catch (error) {
    console.error("[api] user-documents 读取失败：", error)
    return NextResponse.json({ success: false, error: "Server Error", message: "读取失败" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Bad Request", message: "请求体必须是 JSON" }, { status: 400 })
  }

  const parsed = putSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation Error", message: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    )
  }

  const { kind, items } = parsed.data

  // 体积护栏：单条与总量双限，防止把 JSON 列当文件存储
  let totalBytes = 0
  for (const item of items) {
    const size = jsonSize(item.data)
    if (size > MAX_ITEM_BYTES) {
      return NextResponse.json(
        { success: false, error: "Payload Too Large", message: `单条数据超过 ${MAX_ITEM_BYTES} 字节` },
        { status: 413 },
      )
    }
    totalBytes += size
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { success: false, error: "Payload Too Large", message: `集合总量超过 ${MAX_TOTAL_BYTES} 字节` },
      { status: 413 },
    )
  }

  // 同一 kind 内 doc_id 不得重复，否则整组覆盖语义会丢数据
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) {
      return NextResponse.json(
        { success: false, error: "Validation Error", message: `重复的集合项 id: ${item.id}` },
        { status: 400 },
      )
    }
    seen.add(item.id)
  }

  try {
    const db = getServerDB()
    await db.transaction(async () => {
      const existing = await listRows<{ id: string }>("user_documents", {
        user_id: auth.user.id,
        kind,
      })
      if (existing.length > 0) {
        await db.deleteMany("user_documents", existing.map((r) => r.id))
      }
      for (const item of items) {
        await createRow("user_documents", {
          user_id: auth.user.id,
          kind,
          doc_id: item.id,
          payload: item.data,
        })
      }
    })

    return NextResponse.json({ success: true, data: { kind, count: items.length } })
  } catch (error) {
    console.error("[api] user-documents 写入失败：", error)
    return NextResponse.json({ success: false, error: "Server Error", message: "保存失败" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const parsedKind = kindSchema.safeParse(request.nextUrl.searchParams.get("kind"))
  if (!parsedKind.success) {
    return NextResponse.json(
      { success: false, error: "Validation Error", message: `kind 必须为 ${KINDS.join("/")} 之一` },
      { status: 400 },
    )
  }

  try {
    const db = getServerDB()
    await db.transaction(async () => {
      const existing = await listRows<{ id: string }>("user_documents", {
        user_id: auth.user.id,
        kind: parsedKind.data,
      })
      if (existing.length > 0) {
        await db.deleteMany("user_documents", existing.map((r) => r.id))
      }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[api] user-documents 清空失败：", error)
    return NextResponse.json({ success: false, error: "Server Error", message: "删除失败" }, { status: 500 })
  }
}
