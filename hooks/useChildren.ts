"use client"

import type { Child } from "@/lib/db/types"
import { authFetch } from "@/lib/api/auth-fetch"
import { useCallback, useEffect, useState } from "react"

/**
 * 儿童档案 Hook（服务端 API 版）
 * 2026-08 数据统一：原 localStorage mock 层（lib/db/client.ts）已移除，
 * 数据一律经 /api/children（httpOnly Cookie 认证 + 租户隔离）。
 * 当前选中孩子在本地仅持久化 id，列表以服务端为准。
 */

const SELECTED_KEY = "yyc3_selected_child"

interface UseChildrenReturn {
  children: Child[]
  currentChild: Child | null
  isLoading: boolean
  error: string | null
  setCurrentChild: (child: Child | null) => void
  addChild: (data: Omit<Child, "id" | "created_at" | "user_id">) => Promise<Child | null>
  updateChild: (id: string, data: Partial<Child>) => Promise<Child | null>
  deleteChild: (id: string) => Promise<boolean>
  refreshChildren: () => void
}

function readSelectedId(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(SELECTED_KEY)
}

function persistSelectedId(id: string | null): void {
  if (typeof window === "undefined") return
  if (id) window.localStorage.setItem(SELECTED_KEY, id)
  else window.localStorage.removeItem(SELECTED_KEY)
}

export function useChildren(): UseChildrenReturn {
  const [children, setChildren] = useState<Child[]>([])
  const [currentChild, setCurrentChildState] = useState<Child | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const applySelection = useCallback((list: Child[]) => {
    const selectedId = readSelectedId()
    const match = selectedId ? list.find((c) => c.id === selectedId) : null
    setCurrentChildState(match ?? list[0] ?? null)
  }, [])

  const loadChildren = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await authFetch("/api/children")
      const result = (await res.json()) as { success?: boolean; data?: Child[]; message?: string }
      if (!res.ok || !result.success) {
        // 未登录（401）按空列表渲染，页面引导登录
        if (res.status !== 401) {
          setError(result.message ?? `加载失败 (${res.status})`)
        }
        setChildren([])
        setCurrentChildState(null)
        return
      }
      const data = result.data ?? []
      setChildren(data)
      applySelection(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败")
    } finally {
      setIsLoading(false)
    }
  }, [applySelection])

  // 挂载即拉取：loadChildren 内部 setState 均发生在 await 之后（异步回调），
  // 非同步 effect 体内的 setState；编译器对间接引用保守告警，此处安全豁免
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadChildren()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setCurrentChild = useCallback(
    (child: Child | null) => {
      setCurrentChildState(child)
      persistSelectedId(child?.id ?? null)
    },
    [],
  )

  const addChild = useCallback(
    async (data: Omit<Child, "id" | "created_at" | "user_id">): Promise<Child | null> => {
      const res = await authFetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = (await res.json()) as { success?: boolean; data?: Child; message?: string }
      if (!res.ok || !result.success || !result.data) {
        throw new Error(result.message ?? "添加失败，请先登录")
      }
      await loadChildren()
      return result.data
    },
    [loadChildren],
  )

  const updateChild = useCallback(
    async (id: string, data: Partial<Child>): Promise<Child | null> => {
      const res = await authFetch(`/api/children/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = (await res.json()) as { success?: boolean; data?: Child; message?: string }
      if (!res.ok || !result.success || !result.data) {
        throw new Error(result.message ?? "更新失败")
      }
      const updated = result.data
      setChildren((prev) => prev.map((c) => (c.id === id ? updated : c)))
      setCurrentChildState((prev) => (prev?.id === id ? updated : prev))
      return updated
    },
    [],
  )

  const deleteChild = useCallback(
    async (id: string): Promise<boolean> => {
      const res = await authFetch(`/api/children/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const result = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(result.message ?? "删除失败")
      }
      setChildren((prev) => {
        const next = prev.filter((c) => c.id !== id)
        if (readSelectedId() === id) {
          persistSelectedId(next[0]?.id ?? null)
          setCurrentChildState(next[0] ?? null)
        }
        return next
      })
      return true
    },
    [],
  )

  return {
    children,
    currentChild,
    isLoading,
    error,
    setCurrentChild,
    addChild,
    updateChild,
    deleteChild,
    refreshChildren: () => {
      void loadChildren()
    },
  }
}
