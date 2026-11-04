/**
 * /en/homework、/zh/homework 镜像：复用根页面的同一组件（P1 双语样板）。
 * 语言由 app/[locale]/layout.tsx 的 NextIntlClientProvider 决定（内层覆盖根布局的 zh Provider），
 * 词条来自 messages/{zh,en}.json 的 homework 命名空间 —— 不复制页面代码，避免双份维护漂移。
 */
export { default } from "../../homework/page"
