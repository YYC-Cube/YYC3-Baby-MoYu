#!/usr/bin/env node
/**
 * @file generate-metrics-token.mjs
 * @description 为各部署环境生成 /api/metrics 的访问令牌（METRICS_TOKEN）。
 *
 * 设计要点：
 * - 每个环境独立生成（48 位十六进制，crypto.randomBytes(24)），禁止跨环境复用；
 * - 幂等：目标文件中已有非空令牌时默认跳过，避免轮换后抓取端配置失效；--force 才轮换；
 * - 最小暴露：默认只打印掩码 + 指纹，--print 才输出明文；
 * - 最小权限：新文件以 0600 创建，已有文件写回后收紧为 0600（令牌不应对同机其他用户可读）。
 *
 * 用法：
 *   node scripts/generate-metrics-token.mjs                        # 仅 production → .env.production
 *   node scripts/generate-metrics-token.mjs staging production     # 多环境各生成一份
 *   node scripts/generate-metrics-token.mjs production --file .env # docker compose 读取的 .env
 *   node scripts/generate-metrics-token.mjs production --force     # 轮换（抓取端需同步更新）
 *   node scripts/generate-metrics-token.mjs production --print     # 额外输出明文与抓取配置
 *
 * 退出码：0 成功；1 参数/环境非法；2 文件写入失败。
 */

import { createHash, randomBytes } from "node:crypto"
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const KNOWN_ENVS = ["development", "test", "staging", "production"]
const KEY = "METRICS_TOKEN"
const TOKEN_BYTES = 24 // → 48 位十六进制
const TOKEN_LINE = new RegExp(`^\\s*${KEY}\\s*=`)
const HEADER = [
  `# ${KEY} 由 scripts/generate-metrics-token.mjs 生成（每个环境独立，禁止提交版本库）`,
  "# 用途：/api/metrics 应用层门禁；抓取端需携带 Authorization: Bearer <token>",
].join("\n")

function usage(message) {
  if (message) console.error(`✖ ${message}`)
  console.error(
    [
      "用法: node scripts/generate-metrics-token.mjs [环境...] [选项]",
      `  环境: ${KNOWN_ENVS.join(" | ")}（默认 production）`,
      "选项:",
      "  --file <path>  指定输出文件（默认 <dir>/.env.<env>；多环境时不可指定）",
      "  --dir <path>   基准目录（默认当前工作目录）",
      "  --force        已存在令牌时强制轮换（抓取端需同步更新）",
      "  --print        输出明文令牌与抓取端配置片段",
    ].join("\n"),
  )
  process.exit(1)
}

function parseArgs(argv) {
  const envs = []
  const flags = { force: false, print: false, file: null, dir: process.cwd() }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--force") flags.force = true
    else if (arg === "--print") flags.print = true
    else if (arg === "--file") flags.file = argv[++i] ?? usage("--file 缺少路径")
    else if (arg === "--dir") flags.dir = argv[++i] ?? usage("--dir 缺少路径")
    else if (arg === "-h" || arg === "--help") usage()
    else if (arg.startsWith("-")) usage(`未知选项 ${arg}`)
    else envs.push(arg)
  }

  if (envs.length === 0) envs.push("production")
  const unknown = envs.filter((env) => !KNOWN_ENVS.includes(env))
  if (unknown.length > 0) usage(`未知环境 ${unknown.join(", ")}`)
  if (flags.file && envs.length > 1) usage("多环境生成时不能共用 --file")
  return { envs, ...flags }
}

function mask(token) {
  return token.length <= 10 ? "***" : `${token.slice(0, 6)}…${token.slice(-4)}`
}

function fingerprint(token) {
  return createHash("sha256").update(token).digest("hex").slice(0, 8)
}

/** 从文件内容中读取已有令牌（去引号与空白） */
function readExistingToken(content) {
  const line = content.split("\n").find((l) => TOKEN_LINE.test(l))
  if (!line) return null
  return line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "")
}

/** 替换已有行或追加新行，其余内容原样保留 */
function upsertToken(content, token) {
  const lines = content.split("\n")
  let replaced = false
  const next = lines.map((line) => {
    if (!replaced && TOKEN_LINE.test(line)) {
      replaced = true
      return `${KEY}=${token}`
    }
    return line
  })
  if (!replaced) {
    while (next.length > 0 && next[next.length - 1] === "") next.pop()
    if (next.length > 0) next.push("")
    next.push(`${KEY}=${token}`, "")
  }
  return next.join("\n")
}

function generateFor(env, flags) {
  const file = resolve(flags.file ?? resolve(flags.dir, `.env.${env}`))
  const content = existsSync(file) ? readFileSync(file, "utf8") : `# 环境: ${env}\n${HEADER}\n`
  const existing = readExistingToken(content)

  if (existing && !flags.force) {
    console.log(`· [${env}] 已存在，跳过（--force 可轮换） → ${file}`)
    console.log(`  ${KEY}=${mask(existing)} (sha256:${fingerprint(existing)})`)
    return
  }

  const isNew = !existsSync(file)
  if (isNew) mkdirSync(dirname(file), { recursive: true })

  const token = randomBytes(TOKEN_BYTES).toString("hex")
  writeFileSync(file, upsertToken(content, token), { mode: 0o600 })
  chmodSync(file, 0o600) // 已存在文件写入后同样收紧权限

  console.log(`✔ [${env}] ${existing ? "已轮换" : isNew ? "已生成" : "已补写"} → ${file}（0600）`)
  console.log(`  ${KEY}=${mask(token)} (sha256:${fingerprint(token)})`)
  if (flags.print) {
    console.log(`  ${KEY}=${token}`)
    console.log(`  抓取端: Authorization: Bearer ${token}`)
  }
}

function main() {
  const flags = parseArgs(process.argv.slice(2))
  for (const env of flags.envs) generateFor(env, flags)
  console.log("\n提示：轮换令牌后需同步更新 Prometheus 抓取端的 authorization.credentials。")
}

main()
