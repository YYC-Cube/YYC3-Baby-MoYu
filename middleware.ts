import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { routing } from "./i18n/routing"

const intlMiddleware = createMiddleware(routing)

/**
 * 数据敏感页：未登录（无 yyc3_at Cookie）时重定向首页并提示登录。
 * 仅做 Cookie 存在性探测（UX 门禁）；真正的鉴权在 API 层（requireAuth），
 * 携带过期 Cookie 进入的请求仍会被 API 401/自动刷新接管。
 */
const PROTECTED_PAGES = [
  "/growth",
  "/children",
  "/homework",
  "/badges",
  "/interactions",
  "/schedule",
  "/curriculum",
  "/ai-creative",
]

// 首页读取 ?login=1 自动弹出登录框（middleware 307 携带，HomeHeader 消费后 replaceState 清除）。
// 不用 Cookie 传递：Link 预取的 307 会被浏览器落袋 Set-Cookie，导致未点击敏感页
// 的用户在首页被误弹登录框；而预取缓存的是无参 "/"，URL 参数天然无此污染。

/**
 * 混合路由架构：
 * - 根路由（/growth、/homework…）= 中文主应用，不经 next-intl 处理
 * - /en/*、/zh/* = 国际化镜像路由，交由 next-intl（默认语言 zh 自动去前缀）
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 敏感页会话探测：去掉 locale 前缀后匹配
  const barePath = pathname.replace(/^\/(zh|en)(?=\/|$)/, "")
  if (PROTECTED_PAGES.some((p) => barePath === p || barePath.startsWith(`${p}/`))) {
    if (!request.cookies.has("yyc3_at")) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      url.search = "login=1"
      return NextResponse.redirect(url)
    }
  }

  const isLocalePath = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )
  if (!isLocalePath) {
    return NextResponse.next()
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
