import { requireAuth } from "@/lib/auth/guard"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  return NextResponse.json({
    success: true,
    data: {
      user: auth.user,
      stats: {
        childrenCount: 0,
        growthRecordsCount: 0,
        aiConversationsCount: 0,
        unreadNotificationsCount: 0,
      },
    },
    meta: { timestamp: new Date().toISOString() },
  })
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const body = (await request.json().catch(() => ({}))) as {
    firstName?: string
    lastName?: string
    phone?: string
    avatarUrl?: string
  }
  const { firstName, lastName, phone, avatarUrl } = body

  const { getServerDB } = await import("@/lib/db/server")
  const db = getServerDB()
  const row = await db.findOne<Record<string, unknown>>("users", auth.user.id)

  const updated = await db.update("users", auth.user.id, {
    first_name: firstName ?? row?.first_name ?? null,
    last_name: lastName ?? row?.last_name ?? null,
    phone: phone ?? row?.phone ?? null,
    avatar_url: avatarUrl ?? row?.avatar_url ?? null,
  })

  return NextResponse.json({
    success: true,
    data: { user: updated },
    meta: { timestamp: new Date().toISOString() },
  })
}
