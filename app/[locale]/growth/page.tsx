/**
 * /en/growth、/zh/growth 镜像：复用根页面同一组件（P1「单组件复用」模式）。
 * 语言由 app/[locale]/layout.tsx 的 NextIntlClientProvider 决定（内层覆盖根布局 zh Provider），
 * 词条来自 messages/{zh,en}.json 的 growth 命名空间。
 * 注：页面引用的子组件（时间线/评估报告等）示例文案仍为中文，属 P2 范围（见 11-i18n-boundary.md）。
 */
export { default } from "../../growth/page"
