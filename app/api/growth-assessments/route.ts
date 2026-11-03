/**
 * @fileoverview 发展评估结果（growth_assessments）读写端点
 * @description 评估页此前只在前端计算并展示，结果不落库（刷新即丢、无法形成成长轨迹）。
 *   本端点补齐写路径：POST 需登录 + child 归属校验；GET 按孩子整组读取并支持分页。
 * @author YYC³
 * @version 1.0.0
 * @created 2026-11-02
 * @license MIT
 */

import { requireAuth } from "@/lib/auth/guard"
import { isChildOwnedBy, getOwnedChildIds } from "@/lib/api/ownership"
import { countRowsIn, createRow, isForeignKeyError, listRowsIn } from "@/lib/db/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const dimensionSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(64),
  score: z.number().min(0).max(100),
  max_score: z.number().min(0).max(100).optional(),
  level: z.string().max(32).optional(),
})

const createSchema = z.object({
  child_id: z.string().min(1).max(64),
  stage_id: z.string().min(1).max(32),
  dimensions: z.array(dimensionSchema).min(1).max(12),
  overall_score: z.number().int().min(0).max(100),
  ai_summary: z.string().max(4000).optional(),
  recommendations: z.array(z.string().max(500)).max(20).optional(),
})

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function parsePaging(searchParams: URLSearchParams): { limit: number; offset: number } {
  const rawLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT)
  const rawOffset = Number(searchParams.get("offset") ?? 0)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(1, Math.trunc(rawLimit)), MAX_LIMIT) : DEFAULT_LIMIT
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.trunc(rawOffset)) : 0
  return { limit, offset }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const searchParams = request.nextUrl.searchParams
    const childId = searchParams.get("childId")
    const { limit, offset } = parsePaging(searchParams)

    let childIds: string[]
    if (childId) {
      // 指定孩子需先校验归属，避免用 childId 探测他人数据
      if (!(await isChildOwnedBy(childId, auth.user.id))) {
        return NextResponse.json(
          { success: false, error: "Forbidden", message: "孩子档案不存在或无权访问" },
          { status: 403 },
        )
      }
      childIds = [childId]
    } else {
      childIds = await getOwnedChildIds(auth.user.id)
    }

    // 单次 IN 查询 + 库内排序分页（替代逐孩子循环）
    const [data, total] = await Promise.all([
      listRowsIn("growth_assessments", "child_id", childIds, {
        limit,
        offset,
        orderBy: { column: "created_at", direction: "DESC" },
      }),
      countRowsIn("growth_assessments", "child_id", childIds),
    ])

    return NextResponse.json({ data, meta: { total, limit, offset }, success: true })
  } catch (error) {
    console.error("[api] 读取评估记录失败：", error)
    return NextResponse.json({ success: false, error: "Server Error", message: "读取失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Bad Request", message: "请求体必须是 JSON" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation Error", message: parsed.error.issues[0]?.message ?? "参数错误" },
      { status: 400 },
    )
  }

  const { child_id, stage_id, dimensions, overall_score, ai_summary, recommendations } = parsed.data

  // P0 越权防护：child 必须归属当前用户
  if (!(await isChildOwnedBy(child_id, auth.user.id))) {
    return NextResponse.json(
      { success: false, error: "Forbidden", message: "孩子档案不存在或无权访问" },
      { status: 403 },
    )
  }

  try {
    const created = await createRow("growth_assessments", {
      child_id,
      stage_id,
      dimensions,
      overall_score,
      ai_summary: ai_summary ?? "",
      recommendations: recommendations ?? [],
    })
    return NextResponse.json({ data: created, success: true }, { status: 201 })
  } catch (error) {
    console.error("[api] 写入评估记录失败：", error)
    if (isForeignKeyError(error)) {
      return NextResponse.json({ success: false, error: "Bad Request", message: "关联的孩子不存在" }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: "Server Error", message: "保存失败" }, { status: 500 })
  }
}
