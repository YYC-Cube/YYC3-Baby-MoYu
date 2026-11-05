import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 9)
  return prefix ? `${prefix}_${timestamp}_${randomPart}` : `${timestamp}_${randomPart}`
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item)
    if (!result[key]) {
      result[key] = []
    }
    result[key].push(item)
    return result
  }, {} as Record<K, T[]>)
}

export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array))
}

export function uniqueBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): T[] {
  const seen = new Set<K>()
  return array.filter(item => {
    const key = keyFn(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key]
    }
    return result
  }, {} as Pick<T, K>)
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj }
  keys.forEach(key => {
    delete result[key]
  })
  return result
}

export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }

  if (obj instanceof Array) {
    const clonedArray: unknown[] = []
    for (const item of obj) {
      clonedArray.push(deepClone(item))
    }
    return clonedArray as unknown as T
  }

  if (obj instanceof Object) {
    const clonedObj = {} as Record<string, unknown>
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone((obj as Record<string, unknown>)[key])
      }
    }
    return clonedObj as T
  }

  return obj
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (a === null || b === null) return false

  if (typeof a !== typeof b) return false

  if (typeof a !== 'object') return false

  const aIsArray = Array.isArray(a)
  const bIsArray = Array.isArray(b)
  if (aIsArray !== bIsArray) return false

  if (aIsArray && bIsArray) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const keysA = Object.keys(aObj)
  const keysB = Object.keys(bObj)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(aObj[key], bObj[key])) {
      return false
    }
  }

  return true
}

export function formatDate(date: Date | number | string, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = new Date(date)

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatNumber(num: number, locale: string = 'zh-CN'): string {
  return num.toLocaleString(locale)
}

export function formatPercentage(value: number, decimals: number = 0): string {
  return (value * 100).toFixed(decimals) + '%'
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export function safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
  return denominator === 0 ? defaultValue : numerator / denominator
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

export function isNotEmpty<T>(value: T | null | undefined): value is T {
  return !isEmpty(value)
}

export function getNestedValue<T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue?: T
): T | undefined {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue
    }
    if (typeof current !== 'object') {
      return defaultValue
    }
    current = (current as Record<string, unknown>)[key]
  }

  return (current as T) ?? defaultValue
}

export function setNestedValue<T>(
  obj: Record<string, unknown>,
  path: string,
  value: T
): Record<string, unknown> {
  const keys = path.split('.')
  const lastKey = keys.pop()!

  if (!lastKey) {
    return obj
  }

  let current: Record<string, unknown> = obj
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }

  current[lastKey] = value
  return obj
}

export function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    delay?: number
    backoff?: boolean
    onRetry?: (error: unknown, attempt: number) => void
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    onRetry
  } = options

  return new Promise((resolve, reject) => {
    let attempt = 0

    const attemptFn = async () => {
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        attempt++
        if (attempt >= maxAttempts) {
          reject(error instanceof Error ? error : new Error(String(error)))
        } else {
          if (onRetry) {
            onRetry(error, attempt)
          }
          const currentDelay = backoff ? delay * Math.pow(2, attempt - 1) : delay
          setTimeout(() => { void attemptFn() }, currentDelay)
        }
      }
    }

    void attemptFn()
  })
}

export function asyncMap<T, U>(
  items: T[],
  mapper: (item: T, index: number) => Promise<U>,
  concurrency: number = 5
): Promise<U[]> {
  return new Promise((resolve, reject) => {
    const results: U[] = new Array<U>(items.length)
    let completed = 0
    let index = 0

    if (items.length === 0) {
      resolve(results)
      return
    }

    const processNext = () => {
      if (index >= items.length) {
        if (completed === items.length) {
          resolve(results)
        }
        return
      }

      const currentIndex = index++
      const item = items[currentIndex]

      void mapper(item, currentIndex)
        .then(result => {
          results[currentIndex] = result
          completed++
          processNext()
        })
        .catch(reject)
    }

    for (let i = 0; i < Math.min(concurrency, items.length); i++) {
      processNext()
    }
  })
}

export function createQueue<T>(concurrency: number = 1) {
  const queue: Array<() => Promise<T>> = []
  let running = 0

  const process = async (): Promise<void> => {
    if (running >= concurrency || queue.length === 0) {
      return
    }

    running++
    const task = queue.shift()!

    try {
      await task()
    } catch {
      // 单任务失败不阻塞后续：吞掉异常，finally 继续调度
    } finally {
      running--
      void process()
    }
  }

  return {
    add: (task: () => Promise<T>): void => {
      queue.push(task)
      void process()
    },
    size: (): number => queue.length + running,
    clear: (): void => {
      queue.length = 0
    }
  }
}

export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>()

  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn(...args) as ReturnType<T>
    cache.set(key, result)
    return result
  }) as T
}

export function once<T extends (...args: unknown[]) => unknown>(fn: T): T {
  let called = false
  let result: ReturnType<T>

  return ((...args: Parameters<T>) => {
    if (!called) {
      called = true
      result = fn(...args) as ReturnType<T>
    }
    return result
  }) as T
}

export function pipe<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
  return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg)
}

export function compose<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
  return pipe(...fns.reverse())
}

export function curry<T extends (...args: unknown[]) => unknown>(
  fn: T,
  arity: number = fn.length
): (...args: unknown[]) => unknown {
  return function curried(...args: unknown[]): unknown {
    if (args.length >= arity) {
      return fn(...args)
    }
    return (...moreArgs: unknown[]) => curried(...args, ...moreArgs)
  }
}

export function partial<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ...partialArgs: unknown[]
): (...remainingArgs: unknown[]) => ReturnType<T> {
  return (...remainingArgs: unknown[]) => fn(...partialArgs, ...remainingArgs) as ReturnType<T>
}
