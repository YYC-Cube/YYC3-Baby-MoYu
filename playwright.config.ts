import { defineConfig } from "@playwright/test"

/**
 * e2e 配置：行为冒烟 + 四主题视觉回归，跑在生产构建上（先 bun run build，再自动 bun run start）。
 * 运行：bun run test:e2e
 * 视觉基线：bun run test:visual / bun run test:visual:update（分平台 darwin / linux）
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts", // 避开 bun test 的 *.spec.* 匹配
  timeout: 45_000,
  retries: 0,
  workers: 1, // 冒烟串行，避免数据竞争
  // 视觉基线按平台分目录：darwin / linux 各自一份，避免字体/渲染差异造成假失败
  snapshotPathTemplate: "{testDir}/__screenshots__/{platform}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: "http://localhost:1228",
    headless: true,
    viewport: { width: 1366, height: 900 },
  },
  webServer: {
    command: "bun run start",
    port: 1228,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
