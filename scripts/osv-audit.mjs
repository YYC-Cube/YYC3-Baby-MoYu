#!/usr/bin/env node
/**
 * OSV 依赖审计（OSV.dev API）
 * ---------------------------------------------------------------
 * 数据源：https://api.osv.dev/v1/querybatch（开源漏洞数据库 OSV）
 * 输入：bun.lock（项目实际使用的锁文件；JSONC，含尾随逗号）
 * 输出：控制台表格 + 可选 JSON 报告；按阈值决定退出码。
 *
 * 用法：
 *   node scripts/osv-audit.mjs
 *   node scripts/osv-audit.mjs --fail-on=high
 *   node scripts/osv-audit.mjs --format=json --output=osv-results.json
 *
 * 退出码：0 = 未达阻断阈值；1 = 达阈值；2 = 脚本/网络错误
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const hit = args.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const LOCKFILE = resolve(option('lockfile', 'bun.lock'));
const FAIL_ON = option('fail-on', 'critical').toLowerCase();
const FORMAT = option('format', 'table').toLowerCase();
const OUTPUT = option('output', '');
const API = 'https://api.osv.dev/v1/querybatch';
const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, moderate: 2, low: 1, unknown: 0 };
const THRESHOLD = SEVERITY_ORDER[FAIL_ON] ?? 0;

const t0 = Date.now();

/** bun.lock 是 JSONC：移除对象/数组尾随逗号后即可 JSON.parse */
function readLockfile(path) {
  const raw = readFileSync(path, 'utf8');
  const normalized = raw.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(normalized);
  } catch (error) {
    throw new Error(`无法解析锁文件 ${path}: ${error.message}`);
  }
}

function parseNameVersion(identifier) {
  if (typeof identifier !== 'string' || !identifier.includes('@')) return null;
  const at = identifier.lastIndexOf('@');
  const name = identifier.slice(0, at);
  const version = identifier.slice(at + 1);
  if (!name || !version || version.includes(':')) return null;
  return { name, version };
}

function collectPackages(lock) {
  const packages = new Map();
  for (const entry of Object.values(lock.packages ?? {})) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') continue;
    const parsed = parseNameVersion(entry[0]);
    if (!parsed) continue;
    packages.set(`${parsed.name}@${parsed.version}`, parsed);
  }
  return [...packages.values()].sort((a, b) =>
    a.name === b.name ? a.version.localeCompare(b.version) : a.name.localeCompare(b.name),
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function queryChunk(chunk, attempt = 1) {
  let response;
  try {
    response = await fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        queries: chunk.map((pkg) => ({
          package: { name: pkg.name, ecosystem: 'npm' },
          version: pkg.version,
        })),
      }),
    });
  } catch (error) {
    if (attempt > 4) throw new Error(`OSV API 网络错误：${error.message}`);
    await sleep(500 * 2 ** attempt);
    return queryChunk(chunk, attempt + 1);
  }

  if (response.status === 429 || response.status >= 500) {
    if (attempt > 4) throw new Error(`OSV API ${response.status}，重试耗尽`);
    const retryAfter = Number(response.headers.get('retry-after') ?? 0);
    await sleep(Math.max(retryAfter * 1000, 500 * 2 ** attempt));
    return queryChunk(chunk, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`OSV API 返回 ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function severityOf(vuln) {
  const db = vuln.database_specific?.severity;
  if (typeof db === 'string') return db.toLowerCase();
  return 'unknown';
}

async function fetchVulnDetail(id, attempt = 1) {
  let response;
  try {
    response = await fetch(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`);
  } catch (error) {
    if (attempt > 4) throw new Error(`OSV 详情网络错误：${error.message}`);
    await sleep(500 * 2 ** attempt);
    return fetchVulnDetail(id, attempt + 1);
  }
  if (response.status === 429 || response.status >= 500) {
    if (attempt > 4) throw new Error(`OSV 详情 ${response.status}，重试耗尽`);
    await sleep(500 * 2 ** attempt);
    return fetchVulnDetail(id, attempt + 1);
  }
  if (!response.ok) throw new Error(`OSV 详情返回 ${response.status}`);
  return response.json();
}

async function enrichFindings(findings) {
  const ids = [...new Set(findings.map((f) => f.id))];
  const details = new Map();
  for (const id of ids) {
    try {
      details.set(id, await fetchVulnDetail(id));
      await sleep(100);
    } catch (error) {
      console.warn(`跳过 ${id} 详情：${error.message}`);
    }
  }

  for (const finding of findings) {
    const detail = details.get(finding.id);
    if (!detail) continue;
    finding.severity = severityOf(detail);
    finding.summary = (detail.summary ?? detail.details ?? '').replace(/\s+/g, ' ').slice(0, 160);
    finding.fixed = (detail.affected ?? [])
      .flatMap((a) => a.ranges ?? [])
      .flatMap((r) => r.events ?? [])
      .filter((e) => e.fixed)
      .map((e) => e.fixed)
      .join(', ');
  }
}

async function main() {
  const lock = readLockfile(LOCKFILE);
  const packages = collectPackages(lock);
  if (packages.length === 0) {
    console.error('未从锁文件解析到任何 npm 包');
    process.exit(2);
  }

  console.log(`OSV 审计：${packages.length} 个包（来源 ${LOCKFILE}）`);

  const findings = [];
  const CHUNK = 500;
  for (let i = 0; i < packages.length; i += CHUNK) {
    const chunk = packages.slice(i, i + CHUNK);
    const result = await queryChunk(chunk);
    (result.results ?? []).forEach((res, index) => {
      for (const vuln of res.vulns ?? []) {
        findings.push({
          package: chunk[index].name,
          version: chunk[index].version,
          id: vuln.id,
          aliases: vuln.aliases ?? [],
          severity: severityOf(vuln),
          summary: (vuln.summary ?? '').replace(/\s+/g, ' '),
          fixed: (vuln.affected ?? [])
            .flatMap((a) => a.ranges ?? [])
            .flatMap((r) => r.events ?? [])
            .filter((e) => e.fixed)
            .map((e) => e.fixed)
            .join(', '),
        });
      }
    });
    if (i + CHUNK < packages.length) await sleep(200);
  }

  await enrichFindings(findings);

  findings.sort((a, b) => {
    const bySeverity = (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0);
    if (bySeverity !== 0) return bySeverity;
    return `${a.package}@${a.version}`.localeCompare(`${b.package}@${b.version}`);
  });

  const counts = findings.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    },
    /** @type {Record<string, number>} */ ({}),
  );

  const blocking = findings.filter((f) => (SEVERITY_ORDER[f.severity] ?? 0) >= THRESHOLD);
  const report = {
    generatedAt: new Date().toISOString(),
    lockfile: LOCKFILE,
    packagesScanned: packages.length,
    failOn: FAIL_ON,
    total: findings.length,
    counts,
    blocking: blocking.length,
    findings,
  };

  if (OUTPUT) {
    writeFileSync(resolve(OUTPUT), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`JSON 报告：${resolve(OUTPUT)}`);
  }

  if (FORMAT === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `\n共 ${findings.length} 条漏洞（${Object.entries(counts)
        .map(([k, v]) => `${k}:${v}`)
        .join(' / ') || '无'}）`,
    );
    if (findings.length) {
      console.table(
        findings.map((f) => ({
          severity: f.severity,
          package: `${f.package}@${f.version}`,
          id: f.id,
          fixed: f.fixed || '—',
          summary: f.summary.slice(0, 60),
        })),
      );
    }
    if (blocking.length) {
      console.error(`\n❌ 达到阻断阈值（fail-on=${FAIL_ON}）：${blocking.length} 条`);
    } else {
      console.log(`\n✅ 未达到阻断阈值（fail-on=${FAIL_ON}）`);
    }
  }

  if (FORMAT !== 'json') {
    console.log(`耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  process.exit(blocking.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`OSV 审计失败：${error.message}`);
  process.exit(2);
});
