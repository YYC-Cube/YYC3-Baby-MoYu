/**
 * lib/auth/jwt.ts 开发密钥管理补测（40-54, 64-67）
 * 覆盖：dev-secret 首次生成并持久化、已存在密钥复用（不重新生成）、
 * 生产环境缺 JWT_SECRET 拒绝签发、生产环境显式配置正常工作。
 * 注意：单进程测试，环境变量在 afterEach 恢复；dev-secret 文件为
 * gitignored 本地工件，可安全重建。
 */

import { afterEach, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import jwt from "jsonwebtoken"
import { generateToken, verifyToken, type JWTPayload } from "../../../lib/auth/jwt"

const DEV_SECRET_PATH = `${process.cwd()}/data/.jwt-dev-secret`
const ISSUER = "yyc3-ai-xiaoyu"
const AUDIENCE = "yyc3-ai-xiaoyu-users"

const savedEnv = {
  JWT_SECRET: process.env.JWT_SECRET,
  NODE_ENV: process.env.NODE_ENV,
}

afterEach(() => {
  if (savedEnv.JWT_SECRET === undefined) delete process.env.JWT_SECRET
  else process.env.JWT_SECRET = savedEnv.JWT_SECRET
  process.env.NODE_ENV = savedEnv.NODE_ENV
})

function payload(): JWTPayload {
  return { userId: "dev-user", email: "dev@t.cn", role: "parent" }
}

describe("jwt dev-secret 管理", () => {
  test("无密钥时首次生成并持久化到 data/.jwt-dev-secret", () => {
    delete process.env.JWT_SECRET
    process.env.NODE_ENV = "test"
    if (existsSync(DEV_SECRET_PATH)) rmSync(DEV_SECRET_PATH)

    const token = generateToken(payload())

    expect(existsSync(DEV_SECRET_PATH)).toBe(true)
    const secret = readFileSync(DEV_SECRET_PATH, "utf8").trim()
    expect(secret.length).toBeGreaterThanOrEqual(32)
    // 签发与验证使用同一密钥（签发后可立即验证通过）
    const decoded = verifyToken(token)
    expect(decoded.userId).toBe("dev-user")
  })

  test("已存在的密钥被复用（不重新生成）", () => {
    delete process.env.JWT_SECRET
    process.env.NODE_ENV = "test"
    mkdirSync(`${process.cwd()}/data`, { recursive: true })
    const knownSecret = "a".repeat(64)
    writeFileSync(DEV_SECRET_PATH, knownSecret, { mode: 0o600 })

    const token = generateToken(payload())

    // 用已知密钥直接验证成功 → 证明密钥取自文件而非重新生成
    const decoded = jwt.verify(token, knownSecret, { issuer: ISSUER, audience: AUDIENCE }) as JWTPayload
    expect(decoded.userId).toBe("dev-user")
  })

  test("生产环境缺 JWT_SECRET → 签发拒绝", () => {
    delete process.env.JWT_SECRET
    process.env.NODE_ENV = "production"
    expect(() => generateToken(payload())).toThrow(/JWT_SECRET/)
    expect(() => verifyToken("any-token")).toThrow(/JWT_SECRET/)
  })

  test("生产环境显式配置 JWT_SECRET → 正常签发验证", () => {
    process.env.JWT_SECRET = "explicit-prod-secret-at-least-long-enough"
    process.env.NODE_ENV = "production"
    const token = generateToken(payload())
    const decoded = verifyToken(token)
    expect(decoded.userId).toBe("dev-user")
    expect(decoded.type).toBe("access")
  })

  test("套件结束时 dev-secret 存在且有效（不污染其他用例）", () => {
    delete process.env.JWT_SECRET
    process.env.NODE_ENV = "test"
    const token = generateToken(payload())
    expect(verifyToken(token).userId).toBe("dev-user")
    expect(existsSync(DEV_SECRET_PATH)).toBe(true)
  })
})
