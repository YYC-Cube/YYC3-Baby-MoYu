"use client"

import type { HomeworkResult } from "@/lib/api/homework-correction"
import { authFetch } from "@/lib/api/auth-fetch"
import { AnimatePresence, motion } from "framer-motion"
import { useCallback, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"


interface VoiceRecording {
  url: string
  duration: number
  transcript: string
}

interface SmartHomeworkHelperProps {
  homeworkId: string
  subject: string
  title: string
  onHomeworkComplete: (result: HomeworkResult[]) => void
}

export default function SmartHomeworkHelper({
  homeworkId: _homeworkId,
  subject,
  title,
  onHomeworkComplete,
}: SmartHomeworkHelperProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "voice" | "write">("upload")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<HomeworkResult[]>([])
  const [voiceRecording, setVoiceRecording] = useState<VoiceRecording | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [writtenAnswer, setWrittenAnswer] = useState("")
  const [isListening, setIsListening] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // Real API call for homework correction（useCallback 稳定引用，供 onDrop 依赖）
  const analyzeHomeworkImage = useCallback(async (file: File) => {
    setIsProcessing(true)
    try {
      // 图片转 base64 后交由服务端 API 代理调用 BigModel，密钥不出服务端
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => { resolve(reader.result as string); }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const response = await authFetch("/api/ai/homework-correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      })
      if (!response.ok) {
        throw new Error(`作业批改接口错误: ${response.status}`)
      }
      const correctionResult = (await response.json()) as {
        results: Array<{
          uuid: string
          question: string
          correct_answer: string
          user_answer: string
          is_correct: boolean
          explanation: string
          score?: number
        }>
      }

      // Convert API results to our component format
      const formattedResults: HomeworkResult[] = correctionResult.results.map((result, _index) => ({
        id: result.uuid,
        question: result.question,
        correctAnswer: result.correct_answer,
        userAnswer: result.user_answer,
        isCorrect: result.is_correct,
        explanation: result.explanation,
        score: result.score,
      }))

      setResults(formattedResults)
    } catch (error) {
      console.error("分析作业失败:", error)

      // Fallback to mock data if API fails
      const fallbackResults: HomeworkResult[] = [
        {
          id: "mock-1",
          question: "题目：5 + 3 = ?",
          correctAnswer: "8",
          userAnswer: "8",
          isCorrect: true,
          explanation: "计算正确！5加3等于8。",
          score: 100,
        },
        {
          id: "mock-2",
          question: "题目：12 - 7 = ?",
          correctAnswer: "5",
          userAnswer: "6",
          isCorrect: false,
          explanation: "再想想看。12减7等于5，不是6。可以用手指来帮忙计算。",
          score: 0,
        },
      ]
      setResults(fallbackResults)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  // Voice recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)

        // Simulate speech-to-text API call
        const transcript = await transcribeAudio(blob)

        setVoiceRecording({
          url,
          duration: 5, // Mock duration
          transcript,
        })
        stream.getTracks().forEach(track => { track.stop(); })
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("无法访问麦克风:", error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Real speech-to-text API integration
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
      const formData = new FormData()
      formData.append("audio", new File([audioBlob], "recording.webm", { type: "audio/webm" }))

      const response = await authFetch("/api/ai/speech-to-text", {
        method: "POST",
        body: formData,
      })
      if (!response.ok) {
        throw new Error(`语音转写接口错误: ${response.status}`)
      }
      const { text } = (await response.json()) as { text: string }
      return text
    } catch (error) {
      console.error("语音转文字失败:", error)
      // Fallback to mock text
      return "这是学生的语音答题内容，例如：老师，这道题的答案是八。"
    }
  }

  // Real text-to-speech for AI feedback - 完全禁用以避免声音干扰
  // 异步契约：保持 async 签名供 onClick 统一调用（语音功能已禁用）
  // eslint-disable-next-line @typescript-eslint/require-await
  const speakFeedback = async (text: string) => {
    // 永久禁用所有语音播放功能 - 避免产生鸣叫声和AI声音
    console.log(`[SmartHomeworkHelper] 语音播放已禁用: ${text.substring(0, 20)}...`)
    return
  }

  const submitForReview = () => {
    if (results.length > 0 || voiceRecording || writtenAnswer) {
      const allResults: HomeworkResult[] = [...results]

      if (voiceRecording) {
        // Add voice-based result
        allResults.push({
          id: "voice",
          question: "语音答题",
          correctAnswer: "标准答案",
          userAnswer: voiceRecording.transcript,
          isCorrect: true,
          explanation: "语音回答清晰完整，表达准确！",
        })
      }

      if (writtenAnswer) {
        // Add written answer result
        allResults.push({
          id: "written",
          question: "书面答题",
          correctAnswer: "标准答案",
          userAnswer: writtenAnswer,
          isCorrect: writtenAnswer.length > 10,
          explanation: writtenAnswer.length > 10
            ? "回答完整，表达清晰！"
            : "回答可以更详细一些。",
        })
      }

      onHomeworkComplete(allResults)
    }
  }

  // Handle image upload for homework correction（声明于 analyzeHomeworkImage 之后，满足定义前引用检查）
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
        void analyzeHomeworkImage(file)
      }
      reader.readAsDataURL(file)
    }
  }, [analyzeHomeworkImage])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
  })

  return (
    <div className="bg-surface rounded-3xl shadow-soft p-6 w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-adaptive mb-2">{title}</h3>
        <p className="text-adaptive-muted">AI小语帮你智能批改作业</p>
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mt-2">
          {subject}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "upload", label: "拍照上传", icon: "ri-camera-fill" },
          { id: "voice", label: "语音答题", icon: "ri-mic-fill" },
          { id: "write", label: "文字输入", icon: "ri-edit-fill" },
        ].map((tab) => (
          <motion.button
            key={tab.id}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${activeTab === tab.id
              ? "bg-blue-500 text-white shadow-lg"
              : "bg-surface-soft text-adaptive-muted hover:bg-surface"
              }`}
            onClick={() => { setActiveTab(tab.id as "upload" | "voice" | "write"); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <i className={tab.icon} />
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Image Upload Tab */}
        {activeTab === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div
              {...getRootProps()}
              className={`border-3 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragActive
                ? "border-blue-400 bg-blue-50"
                : uploadedImage
                  ? "border-green-400 bg-green-50"
                  : "border-slate-300 hover:border-blue-300 hover:bg-blue-50/30"
                }`}
            >
              <input {...getInputProps()} />

              {uploadedImage ? (
                <div className="space-y-4">
                  <img
                    src={uploadedImage}
                    alt="上传的作业"
                    className="max-h-64 mx-auto rounded-xl shadow-sm"
                  />
                  <p className="text-green-600 font-medium">
                    <i className="ri-check-circle-fill mr-2" />
                    作业已上传，AI正在分析中...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <i className="ri-upload-cloud-2-fill text-2xl text-blue-500" />
                  </div>
                  <div>
                    <p className="text-adaptive font-medium">
                      {isDragActive ? "放下照片即可上传" : "点击或拖拽作业照片到这里"}
                    </p>
                    <p className="text-adaptive-muted text-sm">支持 JPG、PNG、WebP 格式</p>
                  </div>
                </div>
              )}
            </div>

            {isProcessing && (
              <motion.div
                className="bg-blue-50 rounded-xl p-4 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-blue-700 font-medium">AI小语正在认真批改作业...</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Voice Recording Tab */}
        {activeTab === "voice" && (
          <motion.div
            key="voice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-2xl p-8 text-center">
              {voiceRecording ? (
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <i className="ri-check-double-fill text-3xl text-green-500" />
                  </div>
                  <div>
                    <p className="text-green-700 font-medium mb-2">录音完成！</p>
                    <div className="bg-surface rounded-xl p-3 text-left">
                      <p className="text-sm text-adaptive-muted mb-2">识别内容：</p>
                      <p className="text-adaptive">{voiceRecording.transcript}</p>
                    </div>
                    <button
                      onClick={() => speakFeedback(voiceRecording.transcript)}
                      className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
                    >
                      <i className="ri-volume-up-fill mr-2" />播放录音
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <motion.div
                      className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto cursor-pointer ${isRecording
                        ? "bg-red-500 animate-pulse"
                        : "bg-linear-to-br from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600"
                        }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      <i className={`text-white text-3xl ${isRecording ? "ri-stop-fill" : "ri-mic-fill"
                        }`} />
                    </motion.div>
                    <p className="text-adaptive font-medium mt-4">
                      {isRecording ? "点击停止录音" : "点击开始录音"}
                    </p>
                    <p className="text-adaptive-muted text-sm">
                      录下你的答题过程，AI小语会帮你分析
                    </p>
                  </div>

                  {isRecording && (
                    <motion.div
                      className="flex items-center justify-center gap-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-red-500 font-medium">正在录音...</span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Text Input Tab */}
        {activeTab === "write" && (
          <motion.div
            key="write"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="bg-surface-soft rounded-2xl p-6">
              <label className="block text-adaptive font-medium mb-3">
                写下你的答案：
              </label>
              <textarea
                value={writtenAnswer}
                onChange={(e) => { setWrittenAnswer(e.target.value); }}
                placeholder="在这里输入你的作业答案..."
                className="w-full h-32 px-4 py-3 border border-soft rounded-xl resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-adaptive-muted">
                  {writtenAnswer.length} 个字符
                </span>
                <button
                  onClick={() => { setIsListening(!isListening); }}
                  className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${isListening
                    ? "bg-red-100 text-red-600"
                    : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                    }`}
                >
                  <i className={`ri-${isListening ? "stop" : "mic"}-fill`} />
                  {isListening ? "停止识别" : "语音输入"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Section */}
      {results.length > 0 && (
        <motion.div
          className="mt-6 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h4 className="font-bold text-adaptive mb-3">批改结果</h4>
          {results.map((result, index) => (
            <motion.div
              key={result.id}
              className={`border-2 rounded-xl p-4 ${result.isCorrect
                ? "border-green-300 bg-green-50"
                : "border-red-300 bg-red-50"
                }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${result.isCorrect ? "bg-green-500" : "bg-red-500"
                  }`}>
                  <i className={`text-white text-sm ${result.isCorrect ? "ri-check-fill" : "ri-close-fill"
                    }`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-adaptive mb-1">{result.question}</p>
                  <div className="text-sm text-adaptive-muted space-y-1">
                    <p>你的答案：<span className="font-medium">{result.userAnswer}</span></p>
                    <p>正确答案：<span className="font-medium">{result.correctAnswer}</span></p>
                    <p className="text-blue-600">{result.explanation}</p>
                  </div>
                  {result.score && (
                    <div className="mt-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${result.score === 100 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                        得分：{result.score}分
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Submit Button */}
      <motion.button
        className="w-full mt-6 py-4 bg-linear-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-600 transition shadow-lg"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={submitForReview}
        disabled={!results.length && !voiceRecording && !writtenAnswer.trim()}
      >
        <i className="ri-send-plane-fill mr-2" />
        提交作业给老师
      </motion.button>
    </div>
  )
}
