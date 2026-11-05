// 语音服务：文本转语音(TTS)和语音转文本(STT)
// 基于文档: https://open.bigmodel.cn/dev/api#tts

interface TTSRequest {
  model: "cogtts"
  input: string
  voice: "tongtong" | "chuichui" | "xiaochen" | "jam" | "kazi" | "douji" | "luodo"
  stream?: boolean
  speed?: number
  volume?: number
  pitch?: number
  response_format?: "wav" | "pcm"
  watermark_enabled?: boolean
}

interface TTSResponse {
  audio: Blob
  format: string
}

export class VoiceService {
  private readonly baseURL = "https://open.bigmodel.cn/api/paas/v4"

  constructor(private apiKey: string) {}

  /**
   * 文本转语音
   * 使用 CogTTS 将文本转换为自然语音
   */
  async textToSpeech(
    text: string,
    options: Partial<TTSRequest> = {}
  ): Promise<TTSResponse> {
    const request: TTSRequest = {
      model: "cogtts",
      input: text,
      voice: "tongtong", // 默认使用彤彤音色
      stream: false,
      speed: 1.0,
      volume: 1.0,
      response_format: "wav",
      watermark_enabled: true,
      ...options,
    }

    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/audio/speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`TTS请求失败: ${response.status} ${response.statusText}`)
      }

      const audioBlob = await response.blob()
      return {
        audio: audioBlob,
        format: request.response_format || "wav",
      }
    } catch (error) {
      console.error("文本转语音失败:", error)
      // 降级到浏览器原生TTS
      if ('speechSynthesis' in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = 'zh-CN'
          utterance.rate = options.speed || 1.0
          utterance.volume = options.volume || 1.0
          utterance.pitch = options.pitch ? options.pitch - 0.2 : 1.0 // 调整音调
          speechSynthesis.speak(utterance)
          return {
            audio: new Blob(), // 返回空blob
            format: "fallback"
          }
        } catch (browserError) {
          console.error("浏览器TTS也失败:", browserError)
          throw new Error("语音合成服务暂时不可用")
        }
      } else {
        throw new Error("语音合成服务暂时不可用")
      }
    }
  }

  /**
   * 语音转文本（使用浏览器内置的Web Speech API作为备选方案）
   * 注意：这个功能需要配合后端API或浏览器原生API
   */
  async speechToText(audioFile: File): Promise<string> {
    // 实际应用中应该调用真实的STT API
    // 这里使用浏览器API作为演示

    try {
      // 方案1: 使用浏览器的原生语音识别（仅在HTTPS下可用）
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        return await this.browserSpeechRecognition()
      }

      // 方案2: 上传音频文件到服务器进行识别
      return await this.uploadAndTranscribe(audioFile)
    } catch (error) {
      console.error("语音转文本失败:", error)
      throw new Error("语音识别服务暂时不可用")
    }
  }

  /**
   * 使用浏览器原生语音识别
   */
  private browserSpeechRecognition(): Promise<string> {
    return new Promise((resolve, reject) => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

      if (!SpeechRecognition) {
        reject(new Error("浏览器不支持语音识别"))
        return
      }

      const recognition = new SpeechRecognition()
      recognition.lang = "zh-CN"
      recognition.continuous = false
      recognition.interimResults = false

      let receivedResult = false

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        receivedResult = true
        const transcript = event.results[0][0].transcript
        resolve(transcript)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        reject(new Error(`语音识别错误: ${event.error}`))
      }

      recognition.onend = () => {
        if (!receivedResult) {
          reject(new Error("语音识别未返回结果"))
        }
      }

      recognition.start()
    })
  }

  /**
   * 上传音频文件进行转写
   */
  async uploadAndTranscribe(audioFile: File): Promise<string> {
    const formData = new FormData()
    formData.append("audio", audioFile)

    try {
      const response = await this.fetchWithRetry(`${this.baseURL}/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      const result = (await response.json()) as { text?: string }
      return result.text || ""
    } catch (error) {
      console.error("音频转写失败:", error)
      throw error
    }
  }

  /**
   * 播放语音
   */
  async playAudio(audioBlob: Blob): Promise<void> {
    try {
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl)
          reject(new Error("音频播放失败"))
        }

        audio.play().catch(reject)
      })
    } catch (error) {
      console.error("播放语音失败:", error)
      throw new Error("无法播放语音")
    }
  }

  /**
   * 将文本转换为语音并播放
   */
  async speakText(
    text: string,
    options: Partial<TTSRequest> = {}
  ): Promise<void> {
    try {
      const { audio } = await this.textToSpeech(text, options)
      await this.playAudio(audio)
    } catch (error) {
      console.error("语音朗读失败:", error)
      // 使用浏览器内置的语音合成作为降级方案
      if ('speechSynthesis' in window) {
        this.browserSpeakText(text)
      }
      // 不抛出错误，让体验更流畅
    }
  }

  /**
   * 浏览器内置语音合成（降级方案）
   */
  private browserSpeakText(text: string): void {
    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "zh-CN"
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // 选择中文语音
      const voices = speechSynthesis.getVoices()
      const chineseVoice = voices.find(voice =>
        voice.lang.includes("zh") || voice.lang.includes("Chinese")
      )

      if (chineseVoice) {
        utterance.voice = chineseVoice
      }

      speechSynthesis.speak(utterance)
    } catch (error) {
      console.error("浏览器语音合成失败:", error)
    }
  }

  /**
   * 检查语音功能可用性
   */
  checkVoiceSupport(): {
    recording: boolean
    synthesis: boolean
    recognition: boolean
  } {
    return {
      recording: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      synthesis: "speechSynthesis" in window,
      recognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    }
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
}

// 单例服务
let voiceService: VoiceService | null = null

export function getVoiceService(): VoiceService {
  if (!voiceService) {
    const apiKey = process.env.BIGMODEL_API_KEY || ""
    voiceService = new VoiceService(apiKey)
  }
  return voiceService
}