/**
 * YYC³ AI小语智能成长守护系统 - 工具函数扩展测试
 * @file index.test.ts
 * @description 覆盖 lib/utils.ts 除 cn 外的通用工具（数组/对象/深比较/格式化/异步/函数式）
 * @author YYC³团队 <admin@0379.email>
 * @version 1.0.0
 */

import { describe, it, expect } from 'bun:test'
import {
  debounce,
  throttle,
  sleep,
  generateId,
  chunk,
  groupBy,
  unique,
  uniqueBy,
  pick,
  omit,
  deepClone,
  deepEqual,
  formatDate,
  formatFileSize,
  formatNumber,
  formatPercentage,
  clamp,
  randomInt,
  randomFloat,
  roundTo,
  safeDivide,
  isEmpty,
  isNotEmpty,
  getNestedValue,
  setNestedValue,
  retry,
  asyncMap,
  createQueue,
  memoize,
  once,
  pipe,
  compose,
  curry,
  partial
} from '../../../lib/utils'

describe('数组工具', () => {
  describe('chunk', () => {
    it('应按指定大小分块', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    })
    it('size 大于数组长度时返回单块', () => {
      expect(chunk([1, 2], 10)).toEqual([[1, 2]])
    })
    it('空数组返回空数组', () => {
      expect(chunk([], 3)).toEqual([])
    })
    it('size 为 1 时逐项分块', () => {
      expect(chunk(['a', 'b'], 1)).toEqual([['a'], ['b']])
    })
  })

  describe('groupBy', () => {
    it('应按 keyFn 分组', () => {
      const items = [
        { type: 'fruit', name: 'apple' },
        { type: 'fruit', name: 'banana' },
        { type: 'veg', name: 'carrot' }
      ]
      const grouped = groupBy(items, i => i.type)
      expect(grouped.fruit).toHaveLength(2)
      expect(grouped.veg).toHaveLength(1)
      expect(grouped.fruit[1].name).toBe('banana')
    })
    it('空数组返回空对象', () => {
      expect(groupBy([], (i: number) => i)).toEqual({})
    })
    it('支持数字键', () => {
      const grouped = groupBy([10, 21, 32], n => Math.floor(n / 10))
      expect(Object.keys(grouped).sort()).toEqual(['1', '2', '3'])
    })
  })

  describe('unique', () => {
    it('应去重原始值', () => {
      expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3])
    })
    it('保留首次出现顺序', () => {
      expect(unique(['b', 'a', 'b', 'c'])).toEqual(['b', 'a', 'c'])
    })
  })

  describe('uniqueBy', () => {
    it('应按 key 去重对象', () => {
      const items = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 1, name: 'c' }
      ]
      const result = uniqueBy(items, i => i.id)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('a')
      expect(result[1].name).toBe('b')
    })
  })

  describe('pick', () => {
    it('应只保留指定键', () => {
      const obj = { a: 1, b: 2, c: 3 }
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 })
    })
    it('不存在的键被跳过', () => {
      const obj = { a: 1 }
      expect(pick(obj, ['a', 'missing' as never])).toEqual({ a: 1 })
    })
    it('不修改原对象', () => {
      const obj = { a: 1, b: 2 }
      pick(obj, ['a'])
      expect(obj).toEqual({ a: 1, b: 2 })
    })
  })

  describe('omit', () => {
    it('应剔除指定键', () => {
      const obj = { a: 1, b: 2, c: 3 }
      expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 })
    })
    it('剔除多个键', () => {
      const obj = { a: 1, b: 2, c: 3 }
      expect(omit(obj, ['a', 'c'])).toEqual({ b: 2 })
    })
    it('不修改原对象', () => {
      const obj = { a: 1, b: 2 }
      omit(obj, ['b'])
      expect(obj).toEqual({ a: 1, b: 2 })
    })
  })
})

describe('深拷贝与深比较', () => {
  describe('deepClone', () => {
    it('原始值直接返回', () => {
      expect(deepClone(42)).toBe(42)
      expect(deepClone('str')).toBe('str')
      expect(deepClone(null)).toBe(null)
      expect(deepClone(undefined)).toBe(undefined)
    })
    it('数组递归克隆', () => {
      const arr = [1, [2, 3], { a: 4 }]
      const cloned = deepClone(arr)
      expect(cloned).toEqual(arr)
      expect(cloned).not.toBe(arr)
      expect((cloned as number[][])[1]).not.toBe(arr[1])
    })
    it('对象递归克隆', () => {
      const obj = { a: { b: { c: 1 } } }
      const cloned = deepClone(obj)
      expect(cloned).toEqual(obj)
      expect(cloned.a).not.toBe(obj.a)
    })
    it('Date 克隆为等值新实例', () => {
      const d = new Date('2026-01-15T10:30:00')
      const cloned = deepClone(d)
      expect(cloned.getTime()).toBe(d.getTime())
      expect(cloned).not.toBe(d)
    })
    it('嵌套混合结构完整克隆', () => {
      const src = { list: [{ at: new Date('2026-06-01') }], meta: { tags: ['x'] } }
      const cloned = deepClone(src)
      expect(cloned).toEqual(src)
      expect(cloned.list[0]).not.toBe(src.list[0])
    })
  })

  describe('deepEqual', () => {
    it('相同原始值相等', () => {
      expect(deepEqual(1, 1)).toBe(true)
      expect(deepEqual('a', 'a')).toBe(true)
    })
    it('原始值不同则不等', () => {
      expect(deepEqual(1, 2)).toBe(false)
    })
    it('null 与 undefined 不相等', () => {
      expect(deepEqual(null, undefined)).toBe(false)
      expect(deepEqual(null, null)).toBe(true)
    })
    it('类型不同不等', () => {
      expect(deepEqual(1, '1')).toBe(false)
    })
    it('数组与对象不等', () => {
      expect(deepEqual([1], { 0: 1 })).toBe(false)
    })
    it('数组长度不同不等', () => {
      expect(deepEqual([1, 2], [1])).toBe(false)
    })
    it('数组元素逐位比较', () => {
      expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true)
      expect(deepEqual([1, [2, 3]], [1, [3, 2]])).toBe(false)
    })
    it('对象键数不同不等', () => {
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    })
    it('对象嵌套相等与不等', () => {
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
      expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false)
    })
  })
})

describe('格式化工具', () => {
  describe('formatDate', () => {
    it('默认格式 YYYY-MM-DD HH:mm:ss', () => {
      const d = new Date(2026, 0, 5, 8, 9, 3)
      expect(formatDate(d)).toBe('2026-01-05 08:09:03')
    })
    it('支持自定义格式', () => {
      const d = new Date(2026, 10, 4, 23, 59, 7)
      expect(formatDate(d, 'YYYY/MM/DD')).toBe('2026/11/04')
      expect(formatDate(d, 'HH:mm')).toBe('23:59')
      expect(formatDate(d, 'ss')).toBe('07')
    })
    it('接受时间戳与字符串输入', () => {
      const d = new Date(2026, 5, 1)
      expect(formatDate(d.getTime(), 'YYYY-MM-DD')).toBe('2026-06-01')
      expect(formatDate('2026-06-01T00:00:00', 'YYYY-MM-DD')).toBe('2026-06-01')
    })
  })

  describe('formatFileSize', () => {
    it('0 字节返回 0 B', () => {
      expect(formatFileSize(0)).toBe('0 B')
    })
    it('KB/MB 换算', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
    })
    it('GB 换算', () => {
      expect(formatFileSize(1024 ** 3)).toBe('1 GB')
    })
  })

  describe('formatNumber', () => {
    it('千分位分隔（zh-CN）', () => {
      expect(formatNumber(1234567)).toBe('1,234,567')
    })
  })

  describe('formatPercentage', () => {
    it('默认 0 位小数', () => {
      expect(formatPercentage(0.5)).toBe('50%')
    })
    it('支持指定小数位', () => {
      expect(formatPercentage(0.1234, 2)).toBe('12.34%')
      expect(formatPercentage(1, 1)).toBe('100.0%')
    })
  })
})

describe('数值工具', () => {
  it('clamp 区间夹取', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })

  it('randomInt 落在 [min, max] 内', () => {
    for (let i = 0; i < 50; i++) {
      const v = randomInt(3, 7)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(7)
      expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('randomFloat 落在 [min, max) 内', () => {
    for (let i = 0; i < 50; i++) {
      const v = randomFloat(1.5, 2.5)
      expect(v).toBeGreaterThanOrEqual(1.5)
      expect(v).toBeLessThan(2.5)
    }
  })

  it('roundTo 按小数位四舍五入', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14)
    expect(roundTo(2.675, 2)).toBe(2.68)
    expect(roundTo(1.005, 2)).toBe(1)
  })

  it('safeDivide 分母为 0 返回默认值', () => {
    expect(safeDivide(10, 2)).toBe(5)
    expect(safeDivide(10, 0)).toBe(0)
    expect(safeDivide(10, 0, -1)).toBe(-1)
  })
})

describe('判空工具', () => {
  it('isEmpty 各类型', () => {
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty(undefined)).toBe(true)
    expect(isEmpty('')).toBe(true)
    expect(isEmpty('   ')).toBe(true)
    expect(isEmpty([])).toBe(true)
    expect(isEmpty({})).toBe(true)
    expect(isEmpty('x')).toBe(false)
    expect(isEmpty([1])).toBe(false)
    expect(isEmpty({ a: 1 })).toBe(false)
    expect(isEmpty(0)).toBe(false)
  })

  it('isNotEmpty 为 isEmpty 的取反类型守卫', () => {
    expect(isNotEmpty('x')).toBe(true)
    expect(isNotEmpty('')).toBe(false)
    const values: Array<string | null> = ['a', null, 'b']
    expect(values.filter(isNotEmpty)).toEqual(['a', 'b'])
  })
})

describe('嵌套取值', () => {
  const obj = { user: { profile: { name: '小语' } }, flag: true }

  describe('getNestedValue', () => {
    it('正常路径取值', () => {
      expect(getNestedValue(obj, 'user.profile.name')).toBe('小语')
    })
    it('路径中断返回默认值', () => {
      expect(getNestedValue(obj, 'user.missing.name', 'fallback')).toBe('fallback')
      expect(getNestedValue(obj, 'flag.deep', 'no')).toBe('no')
    })
    it('无默认值时返回 undefined', () => {
      expect(getNestedValue(obj, 'nope.nope')).toBeUndefined()
    })
    it('null 中断路径', () => {
      expect(getNestedValue({ a: null }, 'a.b', 'd')).toBe('d')
    })
  })

  describe('setNestedValue', () => {
    it('设置已有嵌套路径', () => {
      const target: Record<string, unknown> = { user: { profile: { name: '旧' } } }
      setNestedValue(target, 'user.profile.name', '新')
      expect((target.user as { profile: { name: string } }).profile.name).toBe('新')
    })
    it('中间层级缺失时自动创建', () => {
      const target: Record<string, unknown> = {}
      setNestedValue(target, 'a.b.c', 1)
      expect(target).toEqual({ a: { b: { c: 1 } } })
    })
    it('空路径直接返回原对象', () => {
      const target: Record<string, unknown> = { a: 1 }
      expect(setNestedValue(target, '.', 2)).toEqual({ a: 1 })
    })
  })
})

describe('异步工具', () => {
  describe('sleep', () => {
    it('至少等待指定毫秒', async () => {
      const start = Date.now()
      await sleep(30)
      expect(Date.now() - start).toBeGreaterThanOrEqual(25)
    })
  })

  describe('debounce', () => {
    it('等待期内的重复调用只执行最后一次', async () => {
      let calls = 0
      const fn = debounce(() => { calls++ }, 20)
      fn(); fn(); fn()
      expect(calls).toBe(0)
      await sleep(60)
      expect(calls).toBe(1)
    })
    it('参数透传到最后一次调用', async () => {
      let received = ''
      const fn = debounce((v: unknown) => { received = String(v) }, 20)
      fn('first'); fn('last')
      await sleep(60)
      expect(received).toBe('last')
    })
  })

  describe('throttle', () => {
    it('时间窗口内只执行一次', async () => {
      let calls = 0
      const fn = throttle(() => { calls++ }, 50)
      fn(); fn(); fn()
      expect(calls).toBe(1)
      await sleep(80)
      fn()
      expect(calls).toBe(2)
    })
  })

  describe('retry', () => {
    it('首次成功直接返回', async () => {
      const result = await retry(async () => 'ok', { delay: 1 })
      expect(result).toBe('ok')
    })
    it('失败后重试直至成功', async () => {
      let attempts = 0
      const result = await retry(
        async () => {
          attempts++
          if (attempts < 3) throw new Error('transient')
          return 'recovered'
        },
        { maxAttempts: 5, delay: 1 }
      )
      expect(result).toBe('recovered')
      expect(attempts).toBe(3)
    })
    it('达到最大次数后拒绝并透传错误', async () => {
      const err = await retry(
        async () => { throw new Error('always-fail') },
        { maxAttempts: 2, delay: 1 }
      ).catch(e => e)
      expect(err).toBeInstanceOf(Error)
      expect(err.message).toBe('always-fail')
    })
    it('onRetry 回调按次触发', async () => {
      const seen: number[] = []
      let attempts = 0
      await retry(
        async () => {
          attempts++
          if (attempts < 3) throw new Error('x')
          return 'done'
        },
        { maxAttempts: 5, delay: 1, onRetry: (_e, attempt) => { seen.push(attempt) } }
      )
      expect(seen).toEqual([1, 2])
    })
    it('非 Error 抛出值包装为 Error', async () => {
      const err = await retry(
        async () => { throw 'plain-string' as unknown as Error },
        { maxAttempts: 1, delay: 1 }
      ).catch(e => e)
      expect(err).toBeInstanceOf(Error)
      expect(err.message).toBe('plain-string')
    })
  })

  describe('asyncMap', () => {
    it('保持原始顺序返回', async () => {
      const result = await asyncMap([10, 20, 30], async n => n * 2, 2)
      expect(result).toEqual([20, 40, 60])
    })
    it('并发受 concurrency 限制且结果完整', async () => {
      let active = 0
      let peak = 0
      const result = await asyncMap(
        [1, 2, 3, 4, 5, 6],
        async n => {
          active++
          peak = Math.max(peak, active)
          await sleep(10)
          active--
          return n
        },
        2
      )
      expect(result).toEqual([1, 2, 3, 4, 5, 6])
      expect(peak).toBeLessThanOrEqual(2)
    })
    it('任一任务失败整体拒绝', async () => {
      const err = await asyncMap([1, 2], async n => {
        if (n === 2) throw new Error('boom')
        return n
      }).catch(e => e)
      expect(err.message).toBe('boom')
    })
    it('空数组返回空数组', async () => {
      expect(await asyncMap([], async n => n)).toEqual([])
    })
  })

  describe('createQueue', () => {
    it('按并发数依次执行并返回结果', async () => {
      const results: number[] = []
      let active = 0
      let peak = 0
      const queue = createQueue<void>(2)
      for (const n of [1, 2, 3, 4]) {
        queue.add(async () => {
          active++
          peak = Math.max(peak, active)
          await sleep(10)
          results.push(n)
          active--
        })
      }
      await sleep(120)
      expect(results.sort()).toEqual([1, 2, 3, 4])
      expect(peak).toBeLessThanOrEqual(2)
    })
    it('size 反映待处理数量', async () => {
      const queue = createQueue<void>(1)
      queue.add(async () => { await sleep(40) })
      queue.add(async () => { await sleep(10) })
      expect(queue.size()).toBe(2)
      await sleep(120)
      expect(queue.size()).toBe(0)
    })
    it('clear 清空待执行任务', async () => {
      let ran = false
      const queue = createQueue<void>(1)
      queue.add(async () => { await sleep(40) })
      queue.add(async () => { ran = true })
      queue.clear()
      await sleep(100)
      expect(ran).toBe(false)
    })
    it('任务抛错不阻塞后续执行', async () => {
      const results: string[] = []
      const queue = createQueue<void>(1)
      queue.add(async () => { throw new Error('task-fail') })
      queue.add(async () => { results.push('after-error') })
      await sleep(80)
      expect(results).toEqual(['after-error'])
    })
  })
})

describe('函数式工具', () => {
  describe('generateId', () => {
    it('无前缀格式 timestamp_random', () => {
      expect(generateId()).toMatch(/^[a-z0-9]+_[a-z0-9]+$/)
    })
    it('带前缀格式 prefix_timestamp_random', () => {
      expect(generateId('msg')).toMatch(/^msg_[a-z0-9]+_[a-z0-9]+$/)
    })
    it('两次生成不重复', () => {
      const a = generateId()
      const b = generateId()
      expect(a).not.toBe(b)
    })
  })

  describe('memoize', () => {
    it('相同参数命中缓存', () => {
      let calls = 0
      const add = memoize((a: unknown, b: unknown) => {
        calls++
        return (a as number) + (b as number)
      })
      expect(add(1, 2)).toBe(3)
      expect(add(1, 2)).toBe(3)
      expect(calls).toBe(1)
      expect(add(2, 3)).toBe(5)
      expect(calls).toBe(2)
    })
    it('支持自定义 keyGenerator', () => {
      let calls = 0
      const fn = memoize(
        (a: unknown, b: unknown) => { calls++; return (a as number) + (b as number) },
        (a, b) => `${a}-${b}`
      )
      fn(1, 2); fn(1, 2)
      expect(calls).toBe(1)
    })
  })

  describe('once', () => {
    it('只执行一次并复用结果', () => {
      let calls = 0
      const init = once(() => { calls++; return { value: 42 } })
      const first = init()
      const second = init()
      expect(calls).toBe(1)
      expect(second).toBe(first)
      expect(first.value).toBe(42)
    })
  })

  describe('pipe 与 compose', () => {
    const inc = (n: number) => n + 1
    const double = (n: number) => n * 2

    it('pipe 从左到右', () => {
      expect(pipe(inc, double)(3)).toBe(8)
    })
    it('compose 从右到左', () => {
      expect(compose(inc, double)(3)).toBe(7)
    })
    it('单函数直通', () => {
      expect(pipe(double)(5)).toBe(10)
      expect(compose(inc)(5)).toBe(6)
    })
  })

  describe('curry', () => {
    const add3 = (a: number, b: number, c: number) => a + b + c

    it('参数齐全时直接执行', () => {
      expect(curry(add3)(1, 2, 3)).toBe(6)
    })
    it('分次收集参数', () => {
      const curried = curry(add3)
      const step1 = curried(1) as (b: number) => unknown
      const step2 = step1(2) as (c: number) => unknown
      expect(step2(3)).toBe(6)
    })
    it('一次部分 + 一次补齐', () => {
      const curried = curry(add3)
      expect((curried(1, 2) as (c: number) => unknown)(4)).toBe(7)
    })
  })

  describe('partial', () => {
    it('前置固定参数', () => {
      const greet = (greeting: string, name: string) => `${greeting}，${name}`
      const hello = partial(greet, '你好')
      expect(hello('小语')).toBe('你好，小语')
    })
    it('前置多个参数', () => {
      const fn = (a: string, b: string, c: string) => a + b + c
      expect(partial(fn, 'x', 'y')('z')).toBe('xyz')
    })
  })
})
