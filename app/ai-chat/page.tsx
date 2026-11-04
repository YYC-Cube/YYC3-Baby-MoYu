/**
 * 根 /ai-chat（中文主应用入口，修复页头历史死链）：
 * 组件实体在 app/[locale]/ai-chat/page.tsx，根路由经根布局 zh Provider 渲染中文，
 * /en/ai-chat 经 [locale] 内层 Provider 渲染英文 —— 单组件复用。
 */
import AIChatPage from "@/app/[locale]/ai-chat/page"

export default AIChatPage
