/**
 * 密钥有效性判定测试（单一判定点）
 * 覆盖：空/空白/占位符（含 your）/过短/有效 五类，以及大小写与前后空白
 */

import { describe, expect, test } from "bun:test"
import { isRealSecret } from "@/lib/config/secret"

describe("isRealSecret", () => {
  test("空值与空白 → false", () => {
    expect(isRealSecret(undefined)).toBe(false)
    expect(isRealSecret("")).toBe(false)
    expect(isRealSecret("   ")).toBe(false)
  })

  test("占位符（含 your，含大小写）→ false", () => {
    expect(isRealSecret("your_bigmodel_api_key_here")).toBe(false)
    expect(isRealSecret("YOUR-OPENAI-KEY-0123456789")).toBe(false)
    expect(isRealSecret("sk-YourRealLookingPlaceholder")).toBe(false)
  })

  test("过短（<20 字符）→ false", () => {
    expect(isRealSecret("sk-short")).toBe(false)
    expect(isRealSecret("1234567890123456789")).toBe(false)
  })

  test("有效密钥 → true，且忽略前后空白", () => {
    expect(isRealSecret("sk-openai-0123456789abcdef")).toBe(true)
    expect(isRealSecret("  49a7c1d2e3f4b5a69788796a5b4c3d2e1f001122  ")).toBe(true)
    expect(isRealSecret("12345678901234567890")).toBe(true)
  })
})
