import { requireAuth } from "@/lib/auth/guard"
import { getOwnedChildIds } from "@/lib/api/ownership"
import { countRowsIn } from "@/lib/db/server"
import { NextResponse } from "next/server"

/**
 * 当前用户的聚合统计（首页卡片）：孩子数 / 成长记录 / 里程碑 / 评估
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const childIds = await getOwnedChildIds(auth.user.id)

    // 单次 IN 聚合（原实现为「每个孩子一次 count」的 N+1）
    const [records, milestones, assessments] = await Promise.all([
      countRowsIn("growth_records", "child_id", childIds),
      countRowsIn("milestones", "child_id", childIds),
      countRowsIn("growth_assessments", "child_id", childIds),
    ])

    return NextResponse.json({
      data: { children: childIds.length, records, milestones, assessments },
      success: true,
    })
  } catch (error) {
    console.error("[api] Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats", success: false }, { status: 500 })
  }
}
