/**
 * /en/badges、/zh/badges 镜像：复用根页面同一组件（P1「单组件复用」模式）。
 * 语言由 app/[locale]/layout.tsx 的 NextIntlClientProvider 决定。
 * 注：勋章标题/描述/分类来自 lib/badges/definitions.ts（数据层），其多语言化属 P3。
 */
import BadgesPage from "@/app/badges/page"

export default BadgesPage
