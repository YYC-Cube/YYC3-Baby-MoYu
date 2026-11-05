import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { guardAIRequest } from "@/lib/api/ai-guard"
import { z } from "zod"

const bodySchema = z.object({
  keywords: z.array(z.string()).default([]),
  style: z.string().optional(),
  previousContent: z.string().max(20000).optional(),
  userInput: z.string().max(2000).optional(),
})

const openai = createOpenAI({
  apiKey: process.env['OPENAI_API_KEY'] ?? "",
  ...(process.env['OPENAI_BASE_URL'] && { baseURL: process.env['OPENAI_BASE_URL'] })
})

const model = openai("gpt-4o-mini")

// 故事风格模板
const STYLE_TEMPLATES: Record<string, string> = {
  fairy_tale: "使用童话故事的叙事风格，加入魔法元素、王子公主、神奇生物等，语言优美富有想象力",
  adventure: "使用冒险故事的叙事风格，加入探险、挑战、勇气等元素，节奏紧凑充满悬念",
  science: "使用科幻故事的叙事风格，加入宇宙、机器人、未来科技等元素，充满想象又有科学基础",
  humor: "使用幽默诙谐的叙事风格，加入搞笑情节、有趣对话，让人捧腹大笑",
  mystery: "使用悬疑故事的叙事风格，加入线索、推理、揭秘等元素，但保持适合儿童的轻松氛围",
  fable: "使用寓言故事的叙事风格，通过小故事传递道理，角色多为动物，结尾有启示",
  daily: "使用日常生活的叙事风格，描述普通家庭、学校、朋友间的温馨故事",
}

export async function POST(req: NextRequest) {
  const guard = await guardAIRequest(req, { name: "continue-story", limit: 10 })
  if (guard instanceof NextResponse) return guard

  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: "请求体格式不正确" }, { status: 400 })
    }
    const { keywords, style, previousContent, userInput } = parsed.data

    const styleTemplate = (style ? STYLE_TEMPLATES[style] : undefined) ?? STYLE_TEMPLATES['fairy_tale']

    // 构建系统提示词
    const systemPrompt = `你是一位专业的儿童故事作家，擅长创作适合3-12岁儿童的故事。

创作要求：
1. ${styleTemplate}
2. 语言简洁生动，适合儿童阅读
3. 内容积极向上，传递正能量
4. 每段续写100-150字
5. 提供3个不同发展方向的续写选项
6. 严禁任何暴力、恐怖、不适当的内容

关键词：${keywords.join("、")}

请根据已有内容和用户输入，提供3个不同方向的故事续写选项。每个选项包含续写内容和发展方向标签。

输出格式(JSON):
{
  "options": [
    { "id": "1", "content": "续写内容...", "direction": "方向标签" },
    { "id": "2", "content": "续写内容...", "direction": "方向标签" },
    { "id": "3", "content": "续写内容...", "direction": "方向标签" }
  ]
}`

    const userPrompt = `已有故事内容：
${previousContent || "（故事刚开始）"}

${userInput ? `孩子新写的内容：${userInput}` : "请开始故事"}

请提供3个续写选项：`

    try {
      const { text } = await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.8,
      })

      // 解析AI响应
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed: unknown = JSON.parse(jsonMatch[0])
        return NextResponse.json(parsed)
      }
    } catch (aiError) {
      console.error("AI生成失败:", aiError)
    }

    // 降级：返回模板续写选项
    const defaultOptions = generateDefaultOptions(keywords, style ?? 'fairy_tale', previousContent)
    return NextResponse.json({ options: defaultOptions })
  } catch (error) {
    console.error("续写故事错误:", error)
    return NextResponse.json({ error: "故事续写失败" }, { status: 500 })
  }
}

// 生成默认续写选项
function generateDefaultOptions(
  keywords: string[],
  _style: string,
  _previousContent?: string,
): Array<{ id: string; content: string; direction: string }> {
  const keyword = keywords[0] || "小朋友"

  const templates = [
    {
      id: "1",
      content: `就在这时，${keyword}发现了一个闪闪发光的神秘宝盒，宝盒上刻满了奇怪的符号。"这是什么呢？"${keyword}好奇地凑近看，宝盒突然发出温暖的光芒...`,
      direction: "发现宝藏",
    },
    {
      id: "2",
      content: `一只毛茸茸的小动物从草丛里跳了出来，它有着亮晶晶的大眼睛。"你好呀！"小动物开口说话了，"我叫小星，我们做朋友好吗？"${keyword}惊喜极了...`,
      direction: "遇见朋友",
    },
    {
      id: "3",
      content: `天空中飘来一朵彩色的云，云朵慢慢降落，变成了一座漂亮的彩虹桥。桥的那头传来美妙的音乐，${keyword}忍不住想要走过去看看...`,
      direction: "奇幻旅程",
    },
  ]

  return templates
}
