import { getRequestConfig } from "next-intl/server"
import { hasLocale } from "next-intl"
import { routing } from "./routing"

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  // 动态路径 import 的返回类型 ESLint 无法解析，显式断言为词条对象
  const messages = (await import(`../messages/${locale}.json`)) as { default: Record<string, unknown> }

  return {
    locale,
    messages: messages.default,
  }
})
