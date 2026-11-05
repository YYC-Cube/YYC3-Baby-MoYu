// API服务：智能作业批改
// 基于文档: https://open.bigmodel.cn/dev/api#homework-correction

interface HomeworkCorrectionRequest {
  agent_id: string
  messages: Array<{
    role: "user"
    content: Array<{
      type: "image_url"
      image_url: string
    }>
  }>
}

interface HomeworkCorrectionResponse {
  trace_id: string
  results: Array<{
    id: string
    uuid: string
    question: string
    user_answer: string
    correct_answer: string
    is_correct: boolean
    is_finish: boolean
    score?: number
    explanation: string
  }>
}

interface SmartCorrectionRequest {
  agent_id: string
  custom_variables: {
    trace_id: string
    images: Array<{
      image_id: string
      uuids: string[]
    }>
  }
}

interface ResultAnalysisRequest {
  agent_id: string
  custom_variables: {
    question: string
    image_id: string
    uuid: string
    trace_id: string
  }
}

// 智能批改响应类型
interface SmartCorrectionResponse {
  id: string
  uuid: string
  question: string
  user_answer: string
  correct_answer: string
  is_correct: boolean
  is_finish: boolean
  score?: number
  explanation: string
}

// 结果解析响应类型
interface ResultAnalysisResponse {
  analysis: string
  key_points: string[]
  error_explanation?: string
  similar_examples?: string[]
}

// 完整批改流程响应类型
interface FullCorrectionFlowResponse {
  results: (HomeworkCorrectionResponse['results'][0] | SmartCorrectionResponse)[]
  explanations: ResultAnalysisResponse[]
}

// 前端展示用的批改结果（字段已转为 camelCase）
export interface HomeworkResult {
  id: string
  question: string
  correctAnswer: string
  userAnswer: string
  isCorrect: boolean
  explanation: string
  score?: number
}

export class HomeworkCorrectionService {
  private readonly baseURL = "https://open.bigmodel.cn/api/v1"
  private readonly agentId = "intelligent_education_correction_agent"
  private readonly pollingAgentId = "intelligent_education_correction_polling"

  constructor(private apiKey: string) {}

  /**
   * 第一步：作业批改（题库）
   * 用户拍照上传作业/试卷等作答图片，输出每道题的批改结果
   */
  async correctHomework(imageUrl: string): Promise<HomeworkCorrectionResponse> {
    const request: HomeworkCorrectionRequest = {
      agent_id: this.agentId,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: imageUrl,
            },
          ],
        },
      ],
    }

    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      })

      return (await response.json()) as HomeworkCorrectionResponse
    } catch (error) {
      console.error("作业批改API调用失败:", error)
      throw new Error("作业批改服务暂时不可用，请稍后再试")
    }
  }

  /**
   * 第二步：智能批改（模型）
   * 对于题库未完成的题目，使用大模型能力进行批改
   */
  async smartCorrection(
    traceId: string,
    images: Array<{ image_id: string; uuids: string[] }>
  ): Promise<SmartCorrectionResponse[]> {
    const request: SmartCorrectionRequest = {
      agent_id: this.pollingAgentId,
      custom_variables: {
        trace_id: traceId,
        images,
      },
    }

    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/agents/async-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      })

      return (await response.json()) as SmartCorrectionResponse[]
    } catch (error) {
      console.error("智能批改API调用失败:", error)
      throw new Error("智能批改服务暂时不可用，请稍后再试")
    }
  }

  /**
   * 第三步：智能结果解析（模型）
   * 对于语文、英语和文综学科的批改结果，获取详细解析
   */
  async analyzeResult(
    question: string,
    imageId: string,
    uuid: string,
    traceId: string
  ): Promise<ResultAnalysisResponse> {
    const request: ResultAnalysisRequest = {
      agent_id: this.agentId,
      custom_variables: {
        question,
        image_id: imageId,
        uuid,
        trace_id: traceId,
      },
    }

    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/agents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      })

      return (await response.json()) as ResultAnalysisResponse
    } catch (error) {
      console.error("结果解析API调用失败:", error)
      throw new Error("结果解析服务暂时不可用，请稍后再试")
    }
  }

  /**
   * 完整的作业批改流程
   */
  async fullCorrectionFlow(imageUrl: string): Promise<FullCorrectionFlowResponse> {
    try {
      // 第一步：基础批改
      const basicResult = await this.correctHomework(imageUrl)

      // 检查是否有需要智能批改的题目
      const unfinishedItems = basicResult.results.filter(result => !result.is_finish)

      let smartResults: SmartCorrectionResponse[] = []
      if (unfinishedItems.length > 0) {
        // 第二步：智能批改未完成的题目
        const imagesForSmartCorrection = unfinishedItems.map(item => ({
          image_id: item.id,
          uuids: [item.uuid]
        }))

        smartResults = await this.smartCorrection(
          basicResult.trace_id,
          imagesForSmartCorrection
        )
      }

      // 第三步：对语文、英语、文综题目进行结果解析
      const explanations: ResultAnalysisResponse[] = []

      for (const result of basicResult.results) {
        // 这里需要根据实际情况判断科目类型
        // 假设我们有科目信息，对语言类科目进行解析
        if (this.shouldAnalyzeResult(result)) {
          try {
            const explanation = await this.analyzeResult(
              result.question,
              result.id,
              result.uuid,
              basicResult.trace_id
            )
            explanations.push(explanation)
          } catch (error) {
            console.warn("解析失败，跳过该题目:", error)
          }
        }
      }

      return {
        results: [...basicResult.results, ...smartResults],
        explanations
      }
    } catch (error) {
      console.error("完整批改流程失败:", error)
      throw error
    }
  }

  /**
   * 判断是否需要对该题目进行结果解析
   */
  private shouldAnalyzeResult(result: HomeworkCorrectionResponse['results'][0]): boolean {
    // 这里可以根据题目的特征或科目信息来判断
    // 目前简单返回true，实际应用中需要更精确的逻辑
    return result.question.length > 10 || /语文|英语|文综/.test(result.question)
  }
  
  /**
   * 带重试机制的fetch请求
   * 特别处理429错误（请求频率过高）
   */
  private async fetchWithRetry(url: string, options: RequestInit, retryCount = 0, maxRetries = 3): Promise<Response> {
    try {
      const response = await fetch(url, options)
      
      // 检查是否为429错误且还有重试次数
      if (response.status === 429 && retryCount < maxRetries) {
        // 计算重试延迟（指数退避）
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000
        console.warn(`请求频率过高(429)，将在 ${delay}ms 后重试...`)
        
        // 等待延迟后重试
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.fetchWithRetry(url, options, retryCount + 1, maxRetries)
      }
      
      // 检查其他错误状态
      if (!response.ok) {
        console.error(`${url} 请求失败:`, response.status, response.statusText)
        if (response.status === 429) {
          throw new Error(`请求频率过高，请稍后再试`)
        }
        throw new Error(`${url} 请求失败: ${response.status} ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      if (retryCount < maxRetries && this.isNetworkError(error)) {
        // 网络错误也进行重试
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000
        console.warn(`网络错误，将在 ${delay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.fetchWithRetry(url, options, retryCount + 1, maxRetries)
      }
      throw error
    }
  }
  
  /**
   * 检查是否为网络错误
   */
  private isNetworkError(error: unknown): boolean {
    return error instanceof TypeError && (error.message === 'Failed to fetch' || error.message === 'Network request failed')
  }

  /**
   * 上传图片到临时存储并获取URL
   */
  async uploadImage(file: File): Promise<string> {
    // 这里应该实现图片上传逻辑
    // 可以使用文件上传API或者云存储服务

    // 临时实现：转换为base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        // 实际应用中需要上传到服务器获取URL
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}

// 单例服务
let homeworkCorrectionService: HomeworkCorrectionService | null = null

export function getHomeworkCorrectionService(): HomeworkCorrectionService {
  if (!homeworkCorrectionService) {
    const apiKey = process.env.BIGMODEL_API_KEY || ""
    if (!apiKey) {
      console.warn("未配置BigModel API密钥，将使用模拟数据")
    }
    homeworkCorrectionService = new HomeworkCorrectionService(apiKey)
  }
  return homeworkCorrectionService
}