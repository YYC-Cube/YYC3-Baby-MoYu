/**
 * @fileoverview 健康检查端点（供容器/K8s/监控探活）
 * @description 设计原则：
 *   - **匿名可访问**（探活方通常无凭据），因此只暴露「是否健康」与最小元信息；
 *   - 不返回连接串、文件路径、密钥名、表数据等内部细节；
 *   - 检查项包含数据库可读性（一次只读 count），失败时返回 503 以便编排系统重启/摘流。
 * @author YYC³
 * @version 1.0.0
 * @created 2026-11-02
 * @license MIT
 */

import { getServerDB } from "@/lib/db/server"
import { NextResponse } from "next/server"

/** 进程启动时间（模块首次加载即固定，用于 uptime） */
const STARTED_AT = Date.now()

export const dynamic = "force-dynamic"

export async function GET() {
  const checks: Record<string, "ok" | "fail"> = {}

  try {
    // 只读探针：不触发写入，不依赖种子数据
    await getServerDB().count("users")
    checks.database = "ok"
  } catch (error) {
    console.error("[health] 数据库探针失败：", error)
    checks.database = "fail"
  }

  const healthy = Object.values(checks).every((v) => v === "ok")

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
      uptimeSec: Math.round((Date.now() - STARTED_AT) / 1000),
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      // 探活结果不得被 CDN/代理缓存
      headers: { "Cache-Control": "no-store" },
    },
  )
}
