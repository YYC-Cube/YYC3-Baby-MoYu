#!/usr/bin/env node
/**
 * i18n 边界巡检：页面覆盖率 + 词条键一致性
 * 用法：
 *   node scripts/check-i18n-coverage.mjs          # 报告（退出码 0）
 *   node scripts/check-i18n-coverage.mjs --strict # 有缺失/不一致时退出码 1（CI 用）
 */

import { readdirSync, existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()
const APP_DIR = join(ROOT, "app")
const LOCALE_DIR = join(APP_DIR, "[locale]")
const strict = process.argv.includes("--strict")

/** 读取目录下的一级子目录名（仅目录） */
function subdirs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name)
}

/** 某目录下是否存在 page.tsx（即该模块是一个页面） */
function isPageRoute(dir, name) {
  return existsSync(join(dir, name, "page.tsx"))
}

const zhRootPages = subdirs(APP_DIR).filter((n) => isPageRoute(APP_DIR, n) && n !== "[locale]")
const enPages = subdirs(LOCALE_DIR).filter((n) => isPageRoute(LOCALE_DIR, n))

// 首页也是页面路由：app/page.tsx ↔ app/[locale]/page.tsx（此前未计入，口径偏小）
const zhTotal = zhRootPages.length + (existsSync(join(APP_DIR, "page.tsx")) ? 1 : 0)
const enTotal = enPages.length + (existsSync(join(LOCALE_DIR, "page.tsx")) ? 1 : 0)
const homeCovered = existsSync(join(APP_DIR, "page.tsx")) && existsSync(join(LOCALE_DIR, "page.tsx"))

const missing = zhRootPages.filter((n) => !enPages.includes(n))
const coverage = zhTotal === 0 ? 0 : Math.round((enTotal / zhTotal) * 100)

// 词条键一致性（浅层键；本项目 messages 为扁平结构）
function flatten(obj, prefix = "") {
  const out = []
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...flatten(v, key))
    else out.push(key)
  }
  return out
}

function loadMessages(locale) {
  const file = join(ROOT, "messages", `${locale}.json`)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, "utf8"))
  } catch (err) {
    console.error(`[i18n] 无法解析 ${file}: ${err.message}`)
    return null
  }
}

const zhMessages = loadMessages("zh")
const enMessages = loadMessages("en")
let missingKeys = []
let extraKeys = []
if (zhMessages && enMessages) {
  const zhKeys = new Set(flatten(zhMessages))
  const enKeys = new Set(flatten(enMessages))
  missingKeys = [...zhKeys].filter((k) => !enKeys.has(k))
  extraKeys = [...enKeys].filter((k) => !zhKeys.has(k))
}

console.log("=== i18n 边界巡检 ===")
console.log(`中文页面（含首页）：${zhTotal} 个 → 子页：${zhRootPages.join(", ") || "(无)"} + 首页`)
console.log(`英文镜像（含首页）：${enTotal} 个 → 子页：${enPages.join(", ") || "(无)"}${homeCovered ? " + 首页" : ""}`)
console.log(`页面覆盖率：${coverage}%（未覆盖 ${missing.length} 个：${missing.join(", ") || "无"}）`)
console.log(`词条键：zh ${zhMessages ? flatten(zhMessages).length : "缺失"} / en ${enMessages ? flatten(enMessages).length : "缺失"}`)
if (missingKeys.length) console.log(`en 缺失键（${missingKeys.length}）：${missingKeys.slice(0, 20).join(", ")}`)
if (extraKeys.length) console.log(`en 多余键（${extraKeys.length}）：${extraKeys.slice(0, 20).join(", ")}`)
console.log("⚠️ 口径说明：本脚本只统计「镜像路由存在」，不代表该页已词条化（中文硬编码副本也会被计入）。")

const failed = missing.length > 0 || missingKeys.length > 0 || !zhMessages || !enMessages
if (failed && strict) {
  console.error("\n[i18n] strict 模式：边界未达标（见 docs/developer/11-i18n-boundary.md §4）")
  process.exit(1)
}
console.log("\n[i18n] 报告完成" + (failed ? "（存在差距，未阻断）" : "（边界达标）"))
