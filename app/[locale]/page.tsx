/**
 * /en、/zh 首页镜像：复用根页面同一组件（P1「单组件复用」模式）。
 * 语言由 app/[locale]/layout.tsx 的 NextIntlClientProvider 决定（内层覆盖根布局 zh Provider），
 * 词条来自 messages/{zh,en}.json 的 home/header 命名空间。
 */
import HomePage from "@/app/page"

export default HomePage
