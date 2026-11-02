/**
 * 四主题视觉回归（根应用）
 * ---------------------------------------------------------------
 * 主题：暖阳（default）/ 液态翡翠（liquid）/ 赛博霓虹（cyberpunk）/ 极光（aurora）
 * 路由：首页 `/`、AI视频工坊 `/videos`（均为公开页，无需登录，数据稳定）
 *
 * 稳定性策略：
 * 1. next-themes 通过 localStorage `theme` 持久化，导航前写入；
 * 2. Playwright Clock 固定时间并推进 2.5s，让入场动画结束、无限动画停在确定帧；
 * 3. 固定 Math.random 种子（极光粒子位置/透明度）；
 * 4. 截图时 animations=disabled + 关闭 CSS 过渡。
 */
import { expect, test } from "@playwright/test"

const THEMES = [
  { id: "default", label: "暖阳" },
  { id: "liquid", label: "液态翡翠" },
  { id: "cyberpunk", label: "赛博霓虹" },
  { id: "aurora", label: "极光" },
] as const

const FIXED_TIME = new Date("2026-11-02T12:00:00+08:00")

async function openWithTheme(page: import("@playwright/test").Page, url: string, theme: string) {
  await page.addInitScript((themeId) => {
    window.localStorage.setItem("theme", themeId)
    // 极光粒子依赖 Math.random，固定种子保证基线可复现
    let seed = 0x2f6e2b1
    Math.random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
  }, theme)

  await page.clock.install({ time: FIXED_TIME })
  await page.goto(url)
  await page.waitForLoadState("networkidle")
  await page.clock.runFor(2500)
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important}",
  })
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
}

test.describe("应用首页 · 四主题视觉基线", () => {
  for (const theme of THEMES) {
    test(`${theme.label}（${theme.id}）· 首页`, async ({ page }) => {
      await openWithTheme(page, "/", theme.id)
      await expect(page.getByText("Hi, 小朋友！今天也一起加油吧！")).toBeVisible()
      await expect(page).toHaveScreenshot(`app-home-${theme.id}.png`)
    })
  }
})

test.describe("AI视频工坊 · 四主题视觉基线", () => {
  for (const theme of THEMES) {
    test(`${theme.label}（${theme.id}）· AI视频工坊`, async ({ page }) => {
      await openWithTheme(page, "/videos", theme.id)
      await expect(page.getByText("AI视频工坊")).toBeVisible()
      await expect(page).toHaveScreenshot(`app-videos-${theme.id}.png`)
    })
  }
})
