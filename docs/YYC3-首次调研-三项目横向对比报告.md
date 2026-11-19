---
file: YYC3-首次调研-三项目横向对比报告.md
title: YYC³ 三项目首次调研横向对比报告
description: Growth-Guardian / AI-Growth-Guardian / Baby-MoYu 三项目的横向技术对比、谱系判断与收敛建议
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-19
updated: 2026-11-19
status: active
tags: [调研报告, 横向对比, 架构决策, 收敛建议]
category: report
language: zh-CN
audience: developers,managers,stakeholders
complexity: advanced
project: YYC3-Growth-Guardian-System,YYC3-AI-Growth-Guardian-System,YYC3-Baby-MoYu
phase: 首次调研
---

# YYC³ 三项目首次调研横向对比报告

> **_YYC³_**（YanYuCloudCube™ · 注册商标）
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

---

## 📋 文档说明

本报告对三个同源仓库进行横向对比：G=`YYC3-Growth-Guardian-System`、A=`YYC3-AI-Growth-Guardian-System`、B=`YYC3-Baby-MoYu`。三份单项目报告见各仓 `docs/YYC3-首次调研-*-技术调研报告.md`。所有数据来自真实采集与命令执行。

---

## 一、项目整体画像

- **一句话**：三个同源仓库构成「探索—收敛」谱系——G/A 是功能齐全但工程门禁失守的双分叉，B 是收敛后可直接演进的单基线。
- **核心标签**：G=`混合架构/儿童成长/门禁红灯/文档过时`；A=`G 的 Next14 分叉/CI 破损/测试副本`；B=`单进程/单实例/门禁最健全/生产就绪度最高`。

---

## 二、全维度横向对比表

| 维度 | G | A | B |
| --- | --- | --- | --- |
| 仓库最近提交 | `20941d6` (2026-10-30) | `22eeae7` (2026-10-30) | `021cb1b` (2026-11-07) |
| 业务定位 | 0-22 岁成长守护 + 插拔式AI（双叙事） | 同 G | 0-3 岁婴幼儿陪伴（单一叙事） |
| Next 版本 | `^16.2.10` | `^14.2.35` | `16.4.3` |
| Bun 版本 | `1.1.38` | `1.1.38` | `1.3.11` |
| 运行时 | Bun 主 + Node≥18 | 同 G | Node≥22.13 主 + Bun 测试 |
| 服务端形态 | Next API + Bun/Hono + Express + microservices | 同 G | 纯 Next App Router 单进程 |
| 数据层实际 | bun:sqlite 落地；PG/Redis 仅在 backend 声明 | 同 G | node:sqlite 默认 + PG15 可选；无 Redis |
| 状态管理 | RTK + react-redux + redux-persist + SWR/TanStack | 同 G | React state + Context |
| AI/ML | OpenAI + TFJS + universal-sentence-encoder | 同 G | @ai-sdk/openai + 三通道，无本地模型 |
| 测试框架 | bun test + jest 双栈 | 同 G + docs 副本 | bun test + playwright e2e |
| 单元测试 | 205 通过 / 0 失败 | 410 通过 / 0 失败（含副本） | 459 通过 / 0 失败 |
| 类型检查 | **失败**（32 错误） | **失败**（32 错误） | **通过** |
| Lint | **失败**（133 errors） | **失败**（303 errors） | **通过** |
| CI/CD | ci.yml（基本可用） | ci.yml（多处破损） | ci.yml + osv-audit（完整门禁） |
| 鉴权现状 | API 路由无 token 校验 | 同 G | JWT + bcrypt + 租户隔离 + CSRF 防御 |
| 安全基线 | 弱口令/CORS 通配/加密待确认 | 同 G（更甚） | 密钥扫描 0 命中/白名单防注入 |
| 风险等级 | **高** | **高** | **中低** |

---

## 三、谱系与差异判断

- **不是简单副本**：A 与 G 是同一基线的两个快照。差异：README 中心图片头、`@hono/node-server` 版本（A 1.19.7 / G 2.0.9）、G 的 ci.yml 中文注释乱码而 A 正常、A 独有 `docs/yyc-xy-03/` 整套镜像（13 个 package.json）。
- **B 是收敛基线**：移除 backend/microservices/analytics 重型后端，引入 e2e/i18n/OSV/主题体系，单进程化，工程治理成熟度显著高于 G/A。
- **是否是有意分叉**：**待确认**（C-05，技术决策会）。

---

## 四、问题分级清单（全局汇总）

| 级别 | 问题 | 涉及 |
| --- | --- | --- |
| **P0 致命** | ① `.ts` 含 JSX 致 tsc 失败（32 错误）；② eslint 133/303 errors 致 CI 红灯；③ API 路由无鉴权，儿童隐私数据暴露；④ A 的 CI 调用不存在脚本 | G、A |
| **P1 严重** | ⑤ test 脚本在 bun 1.4.4 失效；⑥ 硬编码弱口令/密钥/CORS 通配；⑦ 文档与代码版本矛盾；⑧ bun 版本漂移；⑨ A 的 docs 测试副本致计数虚高 | G、A |
| **P2 一般** | ⑩ 多服务端形态并存、双测试栈；⑪ 单实例扩展锁定；⑫ 空壳 main.ts 为 dev 入口；⑬ B 的 build 环境阻断 | 全部/B |
| **P3 优化** | ⑭ 大量 any；⑮ `.eslintignore` 弃用；⑯ 过时残留文档；⑰ README 双重定位叙事 | 全部 |

---

## 五、优化优先级排序与落地建议

| 优先级 | 建议 | 涉及 | 预估 |
| --- | --- | --- | --- |
| 1（立即） | 清 P0 门禁：`.tsx` 化 + lint error 清理 → 恢复 CI 可信 | G、A | 1-2 天 |
| 2（立即） | 补 API 鉴权（参照 B 的 `lib/auth`） | G、A | 3-5 天 |
| 3（本周） | 修 A 的 CI 脚本引用 + 清理 docs 测试副本 | A | 0.5 天 |
| 4（本周） | 统一 bun 版本与测试脚本写法 | G、A | 0.5 天 |
| 5（两周内） | 性能基准实测（接口 P95/并发/DB 查询计划）产出可承诺 SLA | 全部 | 1 周 |
| 6（决策） | 确认三仓分叉策略，以 B 为基线明确 G/A 归档与否 | 管理/技术决策会 | — |
| 7（复验） | 在无钩子环境复验 B 的 build/e2e | B | — |

---

## 六、可行性与风险评估结论

| 项目 | 技术可行性 | 当前可交付 | 风险等级 | 核心风险 |
| --- | --- | --- | --- | --- |
| G | 可行 | **否**（P0 未清） | 高 | 门禁红灯、API 无鉴权、文档不可信 |
| A | 可行 | **否**（P0 + CI 破损） | 高 | 同 G + CI 不可运行 + 测试副本虚高 |
| B | 可行 | **是**（build 待复验） | 中低 | 单实例扩展上限（已知取舍） |

**整体结论**：三个项目技术路线均可落地，但 G/A 需先完成 P0 门禁与安全整改方可进入交付评估；B 已具备生产就绪度。最大不确定性为三仓分叉策略与 SLA 缺失，均需管理/产品侧确认。

---

## 七、验收校验提示词（二次复核用）

```
请以独立审计身份复核本次三项目调研，逐条核验，发现不符即判 FAIL 并给出证据：
1. 事实性：随机抽 10 项版本号/路径/配置值回读源码比对，是否一致？
2. 测试真实性：三仓分别执行 bun test、bunx tsc --noEmit、bunx eslint --config eslint.config.js .，
   核对通过/失败数是否与报告一致（G 205/32err/133err、A 410/32err/303err、B 459/0/0）。
3. 停闸核验：G/A 的 type-check 与 lint error 是否真实存在？B 的 build 是否确因 IDE safe-delete 钩子拦截？
4. 安全红线：G/A 的 app/api/**/route.ts 是否缺少 token 校验？docker-compose 是否存在 password/your-jwt-secret-key/admin123/CORS_*？
5. 禁改核验：git status 是否除报告文档、依赖目录、构建产物外无源码改动？
6. 待确认项：SLA、发布周期、分叉策略、生产环境是否已标注确认路径？
输出：每项 PASS/FAIL + 证据路径；任一 FAIL 即为调研不合格，需重新取证。
```

---

## 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
| ---- | ---- | -------- | ---- |
| v1.0.0 | 2026-11-19 | 三项目横向对比报告落盘 | YYC³ Team |

---

<p align="center">
  <b>YYC³</b>（YanYuCloudCube™ · 注册商标）<br>
  言启象限 | 语枢未来<br>
  <i>Words Initiate Quadrants, Language Serves as Core for Future</i><br>
  万象归元于云枢 | 深栈智启新纪元<br>
  <i>All things converge in cloud pivot; Deep stacks ignite a new era of intelligence</i><br>
  <sub>© 2026 YanYuCloudCube™（YYC³）· <a href="mailto:admin@0379.email">admin@0379.email</a></sub>
</p>
