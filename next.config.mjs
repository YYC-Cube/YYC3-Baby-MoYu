import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone：产出仅含运行必需文件的 .next/standalone（容器镜像据此剥离 node_modules）
  output: "standalone",
  outputFileTracingRoot: import.meta.dirname,
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    const commonRoutes = [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        ],
      },
    ]

    // 开发环境需要 eval/inline；生产收紧脚本来源
    // Next.js 16 拒绝空 headers 数组，故仅在生产环境注入 CSP 路由
    const cspRoutes =
      process.env.NODE_ENV === "production"
        ? [
          {
            source: "/((?!_next/static).*)",
            headers: [
              {
                key: "Content-Security-Policy",
                value: [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline'",
                  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                  "font-src 'self' https://fonts.gstatic.com data:",
                  "img-src 'self' data: blob: https:",
                  "media-src 'self' blob: data:",
                  "connect-src 'self' https://api.0379.love https://open.bigmodel.cn",
                  "worker-src 'self' blob:",
                  "frame-ancestors 'self'",
                ].join("; "),
              },
            ],
          },
        ]
        : []

    return [...commonRoutes, ...cspRoutes]
  },
}

export default withNextIntl(nextConfig)
