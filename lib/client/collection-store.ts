/**
 * @fileoverview 客户端集合存储适配层（localStorage 缓存 + 服务端持久化）
 * @description 解决「数据只在浏览器」的结构性问题，同时不破坏现有 Hook 的同步读写模型：
 *   - **读**：命中内存缓存 → 直接返回；否则读 localStorage 旧数据（首屏不阻塞）；
 *   - **写**：先写内存 + localStorage（即时、离线可用），再 600ms 防抖推服务端（整组替换）；
 *   - **登录用户**：以服务端为准；服务端为空而本地有数据时执行**一次性迁移上传**；
 *   - **游客（401/403）**：降级为 localOnly，不发起写入，登录后再次 hydrate 即自动迁移。
 *
 * 取舍说明：采用整组 replace-all 而非逐条 diff，与 Hook 的「数组状态」模型一致；
 * 并发多标签页可能以「后写覆盖」，本产品为家庭单用户场景，接受该权衡（已在文档标注）。
 * @author YYC³
 * @version 1.0.0
 * @created 2026-11-02
 * @license MIT
 */

import { authFetch } from "@/lib/api/auth-fetch"

export type CollectionKind = "schedule" | "curriculum" | "interaction" | "video" | "assessment"

const MAX_ITEMS = 500
const PUSH_DEBOUNCE_MS = 600

interface KindState {
  data: unknown[] | null
  hydrated: boolean
  hydrating: boolean
  localOnly: boolean
  dirty: boolean
  timer: ReturnType<typeof setTimeout> | null
  onHydrate?: Promise<void>
}

const states = new Map<CollectionKind, KindState>()
const listeners = new Map<CollectionKind, Set<() => void>>()

function stateOf(kind: CollectionKind): KindState {
  let st = states.get(kind)
  if (!st) {
    st = { data: null, hydrated: false, hydrating: false, localOnly: false, dirty: false, timer: null }
    states.set(kind, st)
  }
  return st
}

function notify(kind: CollectionKind): void {
  const set = listeners.get(kind)
  if (!set) return
  for (const cb of set) {
    try {
      cb()
    } catch (err) {
      console.error("[collection-store] 订阅回调失败：", err)
    }
  }
}

/** 订阅某个集合的「服务端数据已就绪」事件；返回取消函数 */
export function subscribeCollection(kind: CollectionKind, cb: () => void): () => void {
  let set = listeners.get(kind)
  if (!set) {
    set = new Set()
    listeners.set(kind, set)
  }
  set.add(cb)
  return () => set?.delete(cb)
}

function readLocal<T>(storageKey: string): T[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as T[]) : null
  } catch {
    return null
  }
}

function writeLocal(storageKey: string, items: unknown[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items))
  } catch {
    // 配额满/隐私模式：缓存失败不应阻塞主流程
  }
}

/** 读取：内存缓存优先，其次 localStorage（可能为 null） */
export function readCollection<T>(kind: CollectionKind, storageKey: string): T[] | null {
  const st = stateOf(kind)
  if (st.data) return st.data as T[]
  return readLocal<T>(storageKey)
}

/** 写入：内存 + localStorage 立即生效，并防抖推送服务端 */
export function writeCollection<T>(kind: CollectionKind, storageKey: string, items: T[]): void {
  const st = stateOf(kind)
  st.data = items
  st.dirty = true
  writeLocal(storageKey, items)
  schedulePush(kind, storageKey)
}

function schedulePush(kind: CollectionKind, storageKey: string): void {
  const st = stateOf(kind)
  if (st.localOnly) return
  if (st.timer) clearTimeout(st.timer)
  st.timer = setTimeout(() => {
    st.timer = null
    void push(kind, storageKey)
  }, PUSH_DEBOUNCE_MS)
}

async function push(kind: CollectionKind, storageKey: string): Promise<void> {
  const st = stateOf(kind)
  if (st.localOnly) return

  const source = (st.data ?? readLocal<{ id?: string }>(storageKey) ?? []) as Array<Record<string, unknown>>
  // 只提交带 id 的项（服务端以 doc_id 去重）；截断到服务端配额，避免 413
  const items = source
    .filter((it) => typeof it?.["id"] === "string" && it["id"].length > 0)
    .slice(0, MAX_ITEMS)
    .map((it) => ({ id: String(it["id"]), data: it }))

  try {
    const res = await authFetch("/api/user-documents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, items }),
    })
    if (res.status === 401 || res.status === 403) {
      // 游客/会话失效：保持本地可用，登录后再迁移
      st.localOnly = true
      return
    }
    if (!res.ok) {
      console.warn(`[collection-store] ${kind} 同步失败（HTTP ${res.status}），已保留本地副本`)
      return
    }
    st.dirty = false
  } catch (err) {
    console.warn(`[collection-store] ${kind} 同步异常（离线？），已保留本地副本`, err)
  }
}

/**
 * 首次使用某集合前调用：拉取服务端数据并与本地合并
 * 规则：服务端有数据 → 以服务端为准（但本地若有未同步改动则本地优先并回传）；
 *      服务端为空且本地有数据 → 把本地数据迁移上传（旧版本用户的平滑过渡）。
 */
export async function hydrateCollection(kind: CollectionKind, storageKey: string): Promise<void> {
  const st = stateOf(kind)
  if (st.hydrated) return
  if (st.onHydrate) return st.onHydrate

  st.hydrating = true
  st.onHydrate = (async () => {
    try {
      const res = await authFetch(`/api/user-documents?kind=${kind}`, { cache: "no-store" })
      if (res.status === 401 || res.status === 403) {
        st.localOnly = true
        return
      }
      if (!res.ok) {
        // 5xx / 网络异常：不覆盖本地，等下次会话重试
        console.warn(`[collection-store] ${kind} 载入失败（HTTP ${res.status}），使用本地副本`)
        return
      }

      const body = (await res.json()) as { success?: boolean; data?: Array<{ id: string; data: unknown }> }
      const serverItems = (body.data ?? []).map((row) => row.data)
      const localItems = readLocal<unknown>(storageKey)

      if (serverItems.length > 0) {
        if (st.dirty && localItems && localItems.length > 0) {
          // 用户已在本次会话中改动过 → 本地为准，回传覆盖
          st.data = localItems
          writeLocal(storageKey, localItems)
          schedulePush(kind, storageKey)
        } else {
          st.data = serverItems
          writeLocal(storageKey, serverItems)
        }
      } else if (localItems && localItems.length > 0) {
        // 迁移：服务端为空、本地有历史数据 → 上传并保持本地
        st.data = localItems
        st.dirty = true
        schedulePush(kind, storageKey)
      } else {
        st.data = null
      }
    } catch (err) {
      console.warn(`[collection-store] ${kind} 载入异常，使用本地副本`, err)
    } finally {
      st.hydrated = true
      st.hydrating = false
      st.onHydrate = undefined
      notify(kind)
    }
  })()

  return st.onHydrate
}

/** 仅测试用：清空内存状态（不影响 localStorage） */
export function __resetCollectionStoreForTest(): void {
  states.clear()
  listeners.clear()
}
