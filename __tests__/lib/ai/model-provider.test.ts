/**
 * 统一模型 Provider 工厂测试
 * 覆盖：无密钥降级、占位符/过短密钥过滤、OpenAI 直连、网关双通道、优先级与网关缺 baseURL
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { getModel, getModelName, getModelSource, hasModelProvider } from "@/lib/ai/model-provider"

const KEYS = ["OPENAI_API_KEY", "OPENAI_BASE_URL", "OPENAI_MODEL", "AI_API_KEY", "AI_BASE_URL", "AI_MODEL"] as const
const saved: Record<string, string | undefined> = {}

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k]
    delete process.env[k]
  }
})

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe("model-provider 未配置路径", () => {
  test("无任何密钥 → getModel 为 null，名称与来源回落 mock", () => {
    expect(getModel()).toBeNull()
    expect(hasModelProvider()).toBe(false)
    expect(getModelName()).toBe("mock")
    expect(getModelSource()).toBe("mock")
  })

  test("占位符密钥（含 your）不被采纳", () => {
    process.env.OPENAI_API_KEY = "your-openai-api-key-here-xxxxxxxx"
    expect(getModel()).toBeNull()
    expect(getModelSource()).toBe("mock")
  })

  test("过短密钥（<20 字符）不被采纳", () => {
    process.env.OPENAI_API_KEY = "sk-short"
    expect(getModel()).toBeNull()
  })

  test("网关只有密钥缺少 baseURL → 不生效", () => {
    process.env.AI_API_KEY = "gateway-key-0123456789abcdef"
    expect(getModel()).toBeNull()
    expect(getModelSource()).toBe("mock")
  })
})

describe("model-provider 真实配置路径", () => {
  test("OPENAI_API_KEY 直连：默认模型 gpt-4o-mini，来源 openai", () => {
    process.env.OPENAI_API_KEY = "sk-openai-0123456789abcdef"
    expect(hasModelProvider()).toBe(true)
    expect(getModel()).not.toBeNull()
    expect(getModelName()).toBe("gpt-4o-mini")
    expect(getModelSource()).toBe("openai")
  })

  test("OPENAI_MODEL / OPENAI_BASE_URL 生效", () => {
    process.env.OPENAI_API_KEY = "sk-openai-0123456789abcdef"
    process.env.OPENAI_MODEL = "glm-5.1"
    process.env.OPENAI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"
    expect(getModelName()).toBe("glm-5.1")
    expect(getModelSource()).toBe("openai")
  })

  test("网关双通道：AI_API_KEY + AI_BASE_URL，来源 gateway", () => {
    process.env.AI_API_KEY = "gateway-key-0123456789abcdef"
    process.env.AI_BASE_URL = "https://gw.example.com/v1"
    process.env.AI_MODEL = "glm-4.6"
    expect(getModel()).not.toBeNull()
    expect(getModelName()).toBe("glm-4.6")
    expect(getModelSource()).toBe("gateway")
  })

  test("优先级：OpenAI 直连优先于网关", () => {
    process.env.OPENAI_API_KEY = "sk-openai-0123456789abcdef"
    process.env.AI_API_KEY = "gateway-key-0123456789abcdef"
    process.env.AI_BASE_URL = "https://gw.example.com/v1"
    expect(getModelSource()).toBe("openai")
  })

  test("OpenAI 密钥为占位符时回落到网关", () => {
    process.env.OPENAI_API_KEY = "your-key-placeholder-xxxxxxxxxx"
    process.env.AI_API_KEY = "gateway-key-0123456789abcdef"
    process.env.AI_BASE_URL = "https://gw.example.com/v1"
    expect(getModelSource()).toBe("gateway")
  })
})
