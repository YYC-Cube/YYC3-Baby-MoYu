/**
 * @fileoverview 限流器（可插拔存储）
 * @description 默认进程内固定窗口；配置 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
 *   后自动切换到 Upstash Redis REST，实现多实例共享配额。
 *   存储异常时回退到进程内存储（可用性优先），并输出告警日志。
 *
 * 语义：固定窗口；每次检查即占用一次配额（超限请求也会计入窗口）。
 */

export interface RateLimitResult {
  allowed: boolean
  /** 当前窗口剩余次数（0 表示已用尽） */
  remaining: number
  /** 距窗口重置的秒数 */
  retryAfterSec: number
}

export interface RateLimitCounter {
  /** 当前窗口已计数（含本次） */
  count: number
  /** 距窗口重置毫秒；存储无法提供时为 null */
  ttlMs: number | null
}

export interface RateLimitStore {
  /** 占用一次配额并返回窗口计数 */
  increment(key: string, windowMs: number): Promise<RateLimitCounter>
  /** 清空（仅内存实现有意义） */
  reset(): void
  /** 存储标识，便于日志与诊断 */
  readonly kind: "memory" | "upstash"
}

interface WindowState {
  count: number
  windowStart: number
}

// 防止 key 无限增长：每次检查顺带清理过期桶；超过上限时强制全量清理
const MAX_KEYS = 10_000

/** 进程内固定窗口存储 */
export class MemoryRateLimitStore implements RateLimitStore {
  readonly kind = "memory" as const
  private readonly buckets = new Map<string, WindowState>()

  private sweep(now: number, windowMs: number): void {
    for (const [key, state] of this.buckets) {
      if (now - state.windowStart >= windowMs) this.buckets.delete(key)
    }
  }

  increment(key: string, windowMs: number): Promise<RateLimitCounter> {
    const now = Date.now()
    if (this.buckets.size > MAX_KEYS) this.sweep(now, windowMs)

    let state = this.buckets.get(key)
    if (!state || now - state.windowStart >= windowMs) {
      state = { count: 0, windowStart: now }
      this.buckets.set(key, state)
    }

    state.count += 1
    return Promise.resolve({ count: state.count, ttlMs: Math.max(0, state.windowStart + windowMs - now) })
  }

  reset(): void {
    this.buckets.clear()
  }
}

/**
 * Upstash Redis REST 存储（多实例共享）
 * 使用 INCR + 首次命中设置 PEXPIRE 的固定窗口；超限时读取 PTTL 计算 Retry-After。
 */
export class UpstashRateLimitStore implements RateLimitStore {
  readonly kind = "upstash" as const

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly prefix = "yyc3:rl:",
  ) {}

  private async command<T>(args: Array<string | number>): Promise<T> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    })
    if (!response.ok) throw new Error(`Upstash ${response.status}`)
    const body = (await response.json()) as { result?: T; error?: string }
    if (body.error) throw new Error(body.error)
    return body.result as T
  }

  async increment(key: string, windowMs: number): Promise<RateLimitCounter> {
    const redisKey = `${this.prefix}${key}`
    const count = await this.command<number>(["INCR", redisKey])
    if (count === 1) await this.command<number>(["PEXPIRE", redisKey, windowMs])
    return { count, ttlMs: null }
  }

  /** 计算 Retry-After 需要真实 TTL，仅在拒绝分支调用，避免常规请求多一次往返 */
  async ttlMs(key: string): Promise<number | null> {
    try {
      const ttl = await this.command<number>(["PTTL", `${this.prefix}${key}`])
      return ttl > 0 ? ttl : null
    } catch {
      return null
    }
  }

  reset(): void {
    // 分布式存储不支持安全的全量清空；测试请注入内存实现
  }
}

const memoryFallback = new MemoryRateLimitStore()
let activeStore: RateLimitStore | null = null

/** 从环境变量解析存储：配置了 Upstash 则用分布式，否则回退内存 */
export function createStoreFromEnv(env: NodeJS.ProcessEnv = process.env): RateLimitStore {
  const url = env.UPSTASH_REDIS_REST_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) return new UpstashRateLimitStore(url, token)
  return memoryFallback
}

/** 当前生效的存储（惰性初始化，便于测试注入） */
export function getRateLimitStore(): RateLimitStore {
  if (!activeStore) activeStore = createStoreFromEnv()
  return activeStore
}

/** 仅测试用：注入自定义存储；传 null 恢复环境变量解析 */
export function setRateLimitStore(store: RateLimitStore | null): void {
  activeStore = store
}

async function incrementWithFallback(key: string, windowMs: number): Promise<RateLimitCounter> {
  const store = getRateLimitStore()
  try {
    return await store.increment(key, windowMs)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[rate-limit] ${store.kind} 存储异常，回退进程内计数: ${message}`)
    return memoryFallback.increment(key, windowMs)
  }
}

/**
 * 检查并占用一次配额
 * @param key       限流维度键（如 `ai:chat:<userId>`）
 * @param limit     窗口内允许的最大次数
 * @param windowMs  窗口长度（毫秒）
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const counter = await incrementWithFallback(key, windowMs)

  if (counter.count > limit) {
    let ttlMs = counter.ttlMs
    if (ttlMs === null) {
      const store = getRateLimitStore()
      if (store instanceof UpstashRateLimitStore) ttlMs = await store.ttlMs(key)
    }
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((ttlMs ?? windowMs) / 1000)),
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - counter.count),
    retryAfterSec: 0,
  }
}

/** 仅测试用：清空当前存储的限流状态 */
export function resetRateLimits(): void {
  getRateLimitStore().reset()
  memoryFallback.reset()
}
