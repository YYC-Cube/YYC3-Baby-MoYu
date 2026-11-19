/**
 * @fileoverview 密钥有效性判定（单一判定点，避免各模块各自实现导致口径漂移）
 * @description 用于区分「真的配置了密钥」与「.env.example 抄来的占位符/空值」。
 *   占位符若被当作有效配置，会导致：服务端带着假密钥打上游（浪费配额与延迟），
 *   并把「未配置」的 503 语义错报为「上游失败」的 502。
 */

/** 占位符与过短密钥不算有效配置 */
export function isRealSecret(value: string | undefined): boolean {
  if (!value) return false
  const v = value.trim()
  return v.length >= 20 && !v.toLowerCase().includes("your")
}
