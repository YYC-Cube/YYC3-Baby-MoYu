/**
 * 预测与语音链路 e2e（补齐 P1：prediction / TTS 真实交互）
 *
 * 覆盖三件事：
 * 1) 预测端点的鉴权门禁与真实统计外推（7 个日点 → 3 步预测 + 置信区间 + 免责声明 + 限流 429）
 * 2) TTS 端点的降级语义（无密钥时必须 503 且提示密钥名，绝不能是 502 上游故障）
 * 3) 前端趋势卡片的「诚实空态」：同一天连测 6 次只聚合出 1 天数据，
 *    必须展示引导文案而不是编造曲线（图表 role=img 不得出现）
 *
 * 数据策略：账号自举 + 自建自删，不依赖种子数据；CI 生产模式无 AI 密钥，
 * 因此 TTS 断言接受 200（本地有密钥）或 503（CI 无密钥）两种真实语义。
 */
import { expect, test } from "@playwright/test"

const DEMO = { email: "parent@yyc3.com", password: "demo123456" }
const SELECTED_KEY = "yyc3_selected_child"

type Envelope<T> = { success?: boolean; data?: T; message?: string; error?: string }

async function bootstrap(request: import("@playwright/test").APIRequestContext) {
  // register 对已存在邮箱是静默 no-op
  await request.post("/api/auth/register", {
    data: { email: DEMO.email, password: DEMO.password, firstName: "演示", lastName: "" },
  })
  const login = await request.post("/api/auth/login", { data: DEMO })
  expect(login.status(), "登录应成功（Cookie 写入 context）").toBe(200)
}

test("匿名访问预测与 TTS 端点均被 401 拦截", async ({ request }) => {
  const prediction = await request.post("/api/ai/prediction", { data: { points: [] } })
  expect(prediction.status()).toBe(401)

  const tts = await request.post("/api/ai/text-to-speech", { data: { text: "你好" } })
  expect(tts.status()).toBe(401)
})

test("预测端点：真实外推返回区间与免责声明，并触发 20/min 限流", async ({ request }) => {
  await bootstrap(request)

  const DAY = 86_400_000
  const points = Array.from({ length: 7 }, (_, i) => ({
    timestamp: Date.UTC(2026, 0, 1) + i * DAY,
    value: 60 + i * 3,
  }))

  const first = await request.post("/api/ai/prediction", {
    data: { metric: "overall_score", points, horizon: 3 },
  })
  expect(first.status()).toBe(200)
  const body = (await first.json()) as Envelope<{
    history: Array<{ timestamp: number; value: number }>
    forecast: Array<{ timestamp: number; value: number; lower: number | null; upper: number | null }>
    confidence: number
    methodology: string
    disclaimer?: string
  }>
  expect(body.success).toBe(true)
  const data = body.data!
  expect(data.history).toHaveLength(7)
  expect(data.forecast).toHaveLength(3)
  // 区间必须包住点预测
  for (const f of data.forecast) {
    if (f.lower !== null) expect(f.lower).toBeLessThanOrEqual(f.value + 1e-6)
    if (f.upper !== null) expect(f.upper).toBeGreaterThanOrEqual(f.value - 1e-6)
  }
  expect(data.methodology).toContain("time_series")
  expect(data.disclaimer ?? "").toContain("统计外推")

  // 已用 1 次，窗口配额 20 → 第 21 次应为 429
  let lastStatus = 0
  for (let i = 0; i < 20; i++) {
    const res = await request.post("/api/ai/prediction", {
      data: { points, horizon: 1 },
    })
    lastStatus = res.status()
    if (lastStatus === 429) {
      expect(res.headers()["retry-after"]).toBeTruthy()
      break
    }
  }
  expect(lastStatus, "第 21 次预测请求应被限流").toBe(429)
})

test("TTS 端点：已登录时返回 200（有密钥）或 503（无密钥，提示 BIGMODEL_API_KEY）", async ({ request }) => {
  await bootstrap(request)
  const res = await request.post("/api/ai/text-to-speech", { data: { text: "你好" } })
  const status = res.status()

  expect([200, 503]).toContain(status)
  if (status === 503) {
    // 503 有且只有两种语义：未配置（"语音合成服务未配置"）或凭据失效（提示 BIGMODEL_API_KEY）；
    // 上游故障必须是 502，不能被 503 吞掉。
    const body = (await res.json()) as { error?: string }
    expect(body.error ?? "").toMatch(/未配置|BIGMODEL_API_KEY/)
  } else {
    expect(res.headers()["content-type"] ?? "").toMatch(/audio\//)
  }
})

test("趋势卡片诚实空态：同日多次评估不编造曲线", async ({ page, request }) => {
  test.setTimeout(60_000)
  // 账号自举（register 对已存在邮箱是 no-op）
  await request.post("/api/auth/register", {
    data: { email: DEMO.email, password: DEMO.password, firstName: "演示", lastName: "" },
  })

  // UI 登录：request 上下文的 Cookie 不保证同步进页面，这里走真实登录弹窗
  await page.goto("/")
  await page.getByRole("button", { name: "登录", exact: true }).first().click()
  await expect(page.getByText("欢迎回来")).toBeVisible()
  await page.getByPlaceholder("请输入邮箱地址").fill(DEMO.email)
  await page.getByPlaceholder("请输入密码").fill(DEMO.password)
  await page.locator('button[type="submit"]').click()
  await expect(page.getByText("欢迎回来")).toBeHidden({ timeout: 10_000 })

  // 建娃（浏览器内 fetch，凭 httpOnly Cookie）
  type Envelope<T> = { success?: boolean; data?: T; message?: string; error?: string }
  const stamp = Date.now()
  const child = await page.evaluate(async (name): Promise<{ status: number; id?: string }> => {
    const res = await fetch("/api/children", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, birth_date: "2021-03-01", gender: "female" }),
    })
    const body = (await res.json()) as Envelope<{ id: string }>
    return { status: res.status, id: body.data?.id }
  }, `e2e预测娃${stamp}`)
  expect(child.status).toBe(201)
  const childId = child.id!

  try {
    // 同一天写入 6 次评估：按天聚合后只有 1 个点，不足以画趋势
    const codes = await page.evaluate(async (cid): Promise<number[]> => {
      const out: number[] = []
      for (let i = 0; i < 6; i++) {
        const score = 60 + i * 4
        const res = await fetch("/api/growth-assessments", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            child_id: cid,
            stage_id: `stage-${i + 1}`,
            dimensions: [{ id: "cognitive", name: "认知", score }],
            overall_score: score,
          }),
        })
        out.push(res.status)
      }
      return out
    }, childId)
    expect(codes, "6 次评估应全部落库").toEqual([201, 201, 201, 201, 201, 201])

    // 让页面挂载时选中这个娃（useChildren 读取 yyc3_selected_child）
    await page.evaluate(([key, id]) => { window.localStorage.setItem(key, id) }, [SELECTED_KEY, childId])
    await page.goto("/growth")

    await page.getByRole("button", { name: "智能评估" }).click()

    // 标题必须在场
    await expect(page.getByText("成长趋势预测")).toBeVisible({ timeout: 15_000 })
    // 空态文案按「天数」计（1 天），而不是按记录条数（6 次）
    await expect(page.getByText(/已有 \d+ 天评估数据/)).toBeVisible()
    // 不得渲染图表：role=img 的历史/预测图不应出现
    await expect(page.getByRole("img", { name: "发展评估总分历史与未来趋势预测图" })).toHaveCount(0)
  } finally {
    // 自清理：删除娃（级联评估记录）
    const delStatus = await page.evaluate(async (cid) => {
      const res = await fetch(`/api/children/${cid}`, { method: "DELETE" })
      return res.status
    }, childId)
    expect(delStatus).toBe(200)
    await page.evaluate((key) => { window.localStorage.removeItem(key) }, SELECTED_KEY)
    await page.evaluate(async () => { await fetch("/api/auth/logout", { method: "POST" }) })
  }
})
