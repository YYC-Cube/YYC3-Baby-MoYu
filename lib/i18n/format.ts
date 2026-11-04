/**
 * @fileoverview locale 感知格式化工具（P4 收口）
 * @description 统一 toLocale* 的 locale 参数来源，消除组件内 `locale === "en" ? "en-US" : "zh-CN"` 散布
 */

/** 项目支持的 UI locale（与 i18n/routing.ts 对齐） */
export type AppLocale = "zh" | "en"

/** BCP 47 locale tag 映射（zh → zh-CN，en → en-US） */
const LOCALE_TAGS: Record<AppLocale, string> = {
  zh: "zh-CN",
  en: "en-US",
}

/**
 * 将项目 locale 解析为 BCP 47 tag（供 toLocaleDateString/toLocaleTimeString/toLocaleString 使用）。
 * 未知值回退 zh-CN（与默认语言一致）。
 */
export function localeTag(locale: string | undefined | null): string {
  if (locale === "en") return LOCALE_TAGS.en
  return LOCALE_TAGS.zh
}

/** 按 locale 格式化日期（默认长期样式，如 2026/11/4） */
export function formatDateByLocale(date: Date | string | number, locale: string | undefined | null): string {
  return new Date(date).toLocaleDateString(localeTag(locale))
}

/** 按 locale 格式化时间（HH:mm） */
export function formatTimeByLocale(date: Date | string | number, locale: string | undefined | null): string {
  return new Date(date).toLocaleTimeString(localeTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
  })
}
