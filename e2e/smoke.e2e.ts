/**
 * 最小业务闭环 e2e 冒烟（含数据自清理 + 账号自举）
 * 流程：账号自举（register，已存在则 no-op）→ UI 登录 → 建娃 → 写成长记录 → 复核落库
 *       → 删除娃（级联清理）→ 校验租户隔离 → 登出 → 401
 * 不依赖种子数据：CI 的 production 模式不种演示账号，由自举步骤保证账号存在。
 */
import { expect, test } from "@playwright/test"

const DEMO = { email: "parent@yyc3.com", password: "demo123456" }

test("登录 → 建娃 → 写记录 → 登出 全链路", async ({ page, request }) => {
  const stamp = Date.now()

  // —— 0. 账号自举：register 对已注册邮箱是静默 no-op，任何结果都无碍后续登录 ——
  await request.post("/api/auth/register", {
    data: { email: DEMO.email, password: DEMO.password, firstName: "演示", lastName: "" },
  })

  // —— 1. UI 登录（首页 LoginModal 弹窗）——
  await page.goto("/")
  await page.getByRole("button", { name: "登录", exact: true }).first().click()
  await expect(page.getByText("欢迎回来")).toBeVisible()
  await page.getByPlaceholder("请输入邮箱地址").fill(DEMO.email)
  await page.getByPlaceholder("请输入密码").fill(DEMO.password)
  // 表单内提交按钮（type=submit，文案"登录"）
  await page.locator('button[type="submit"]').click()
  // 弹窗关闭 = 登录成功
  await expect(page.getByText("欢迎回来")).toBeHidden({ timeout: 10_000 })

  // —— 2. 建娃（浏览器内 fetch，凭 httpOnly Cookie）——
  type Envelope<T> = { status: number; body: { success?: boolean; data?: T; message?: string } }
  const child = await page.evaluate(async (name): Promise<Envelope<{ id: string }>> => {
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, birth_date: "2020-06-01", gender: "female" }),
    })
    return { status: res.status, body: (await res.json()) as Envelope<never>['body'] }
  }, `e2e娃娃${stamp}`)
  expect(child.status).toBe(201)
  const childId = child.body.data!.id

  // —— 3. 写成长记录 ——
  const record = await page.evaluate(async (cid): Promise<Envelope<{ id: string }>> => {
    const res = await fetch("/api/growth-records", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        child_id: cid, type: "milestone",
        title: "e2e 冒烟记录", content: "由 Playwright 写入",
      }),
    })
    return { status: res.status, body: (await res.json()) as Envelope<never>['body'] }
  }, childId)
  expect(record.status).toBe(201)

  // —— 4. 租户隔离：列表能看到自己的娃，记录可查 ——
  const list = await page.evaluate(async (): Promise<Envelope<{ name: string }[]>> => {
    const res = await fetch("/api/children")
    return { status: res.status, body: (await res.json()) as Envelope<never>['body'] }
  })
  expect(list.status).toBe(200)
  const names = (list.body.data ?? []).map((c) => c.name)
  expect(names).toContain(`e2e娃娃${stamp}`)
  expect(names).not.toContain("小明") // 其他用户的数据不可见

  // —— 5. 记录可按 childId 查询（复核写入真实落库）——
  const records = await page.evaluate(async (cid): Promise<Envelope<{ title: string }[]>> => {
    const res = await fetch(`/api/growth-records?childId=${cid}`)
    return { status: res.status, body: (await res.json()) as Envelope<never>['body'] }
  }, childId)
  expect(records.status).toBe(200)
  expect((records.body.data ?? []).some((r) => r.title === "e2e 冒烟记录")).toBe(true)

  // —— 6. 自清理：删除 e2e 娃娃（级联删除记录）并复核 ——
  const cleanup = await page.evaluate(async (cid) => {
    const res = await fetch(`/api/children/${cid}`, { method: "DELETE" })
    return res.status
  }, childId)
  expect(cleanup).toBe(200)
  const stillThere = await page.evaluate(async (name): Promise<boolean> => {
    const res = await fetch("/api/children")
    const body = (await res.json()) as { data?: Array<{ name: string }> }
    return (body.data ?? []).some((c) => c.name === name)
  }, `e2e娃娃${stamp}`)
  expect(stillThere).toBe(false)

  // —— 7. 登出（UI 弹窗或 API 清 Cookie）→ 数据访问 401 ——
  await page.evaluate(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
  })
  const after = await page.evaluate(async () => {
    const res = await fetch("/api/children")
    return res.status
  })
  expect(after).toBe(401)
})

test("未登录访问数据 API 一律 401", async ({ request }) => {
  for (const path of ["/api/children", "/api/growth-records", "/api/homework", "/api/agentic", "/api/ai/chat"]) {
    const res = await request.post(path, { data: { message: "x" } })
    expect(res.status(), path).toBe(401)
  }
})

test("未登录访问敏感页 → 重定向首页并提示登录", async ({ page }) => {
  await page.goto("/growth")
  // 中间件重定向到 /?login=1，HomeHeader 消费后 replaceState 清为 /
  await expect(page.getByText("欢迎回来")).toBeVisible({ timeout: 5_000 })
  expect(page.url()).toBe("http://localhost:1228/")
})
