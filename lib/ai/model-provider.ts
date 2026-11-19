/**
 * @file model-provider.ts
 * @description 统一的 AI 模型 Provider 工厂（移植自 Companion v3.0.0，Phase 3a）
 *
 * 收敛 4 个 AI 路由的直连 createOpenAI 用法，统一配置解析顺序（服务端环境变量）：
 * 1. OPENAI_API_KEY（可选 OPENAI_BASE_URL / OPENAI_MODEL）→ OpenAI 官方或兼容端点
 * 2. AI_API_KEY + AI_BASE_URL（可选 AI_MODEL）→ 任意 OpenAI 兼容网关
 *    （如 BigModel 开放平台、自建代理）
 *
 * 未配置任何密钥时 getModel() 返回 null，调用方应降级到本地示例回复。
 * 注意：用 Chat Completions 而非 SDK 默认的 Responses API，兼容网关（BigModel 等）只实现前者。
 */

import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"
import { isRealSecret } from "@/lib/config/secret"

interface ResolvedProvider {
  model: LanguageModel
  name: string
  source: "openai" | "gateway"
}

function resolveProvider(): ResolvedProvider | null {
  const openaiKey = process.env["OPENAI_API_KEY"]
  if (isRealSecret(openaiKey)) {
    const openai = createOpenAI({
      apiKey: openaiKey,
      ...(process.env["OPENAI_BASE_URL"] ? { baseURL: process.env["OPENAI_BASE_URL"] } : {}),
    })
    const modelName = process.env["OPENAI_MODEL"] || "gpt-4o-mini"
    return { model: openai.chat(modelName), name: modelName, source: "openai" }
  }

  const gatewayKey = process.env["AI_API_KEY"]
  const gatewayBase = process.env["AI_BASE_URL"]
  if (isRealSecret(gatewayKey) && gatewayBase) {
    const gateway = createOpenAI({
      apiKey: gatewayKey,
      baseURL: gatewayBase,
    })
    const modelName = process.env["AI_MODEL"] || "gpt-4o-mini"
    return { model: gateway.chat(modelName), name: modelName, source: "gateway" }
  }

  return null
}

/** 是否已配置真实模型 Provider（用于健康检查与降级判断） */
export function hasModelProvider(): boolean {
  return resolveProvider() !== null
}

/**
 * 获取真实模型实例。
 * @returns 未配置密钥时返回 null，调用方必须降级处理。
 */
export function getModel(): LanguageModel | null {
  const resolved = resolveProvider()
  return resolved ? resolved.model : null
}

/** 当前生效的模型名（未配置时返回 "mock"） */
export function getModelName(): string {
  return resolveProvider()?.name ?? "mock"
}

/** 配置来源（未配置时返回 "mock"） */
export function getModelSource(): "openai" | "gateway" | "mock" {
  return resolveProvider()?.source ?? "mock"
}
