/**
 * YYC³ 智能预测系统 - 智能拖拽AI助手组件
 * 支持拖拽移动、智能布局、多视图切换和实时交互
 */

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Info,
  Maximize2,
  MessageCircle,
  Minimize2,
  RefreshCw,
  Settings2,
  TrendingUp,
  X,
  Zap
} from 'lucide-react'
import Image from 'next/image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

// 图标组件
import { characterManager } from '@/lib/character-manager'
import { authFetch } from '@/lib/api/auth-fetch'
import { AgentState } from '../../core/agent-state'
// 仅类型导入（编译期擦除）：避免 AgenticCore 及 prediction 服务栈进客户端包，
// 运行时经 /api/agentic 调用服务端实例
import type { AgentResponse, AgentTask, SystemStatus } from '../../core/AgenticCore'

// 拖拽类型定义
export interface WidgetPosition {
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

interface WidgetState {
  isVisible: boolean
  isMinimized: boolean
  isFullscreen: boolean
  currentView: 'chat' | 'dashboard' | 'tools' | 'insights' | 'settings'
  mode: 'floating' | 'docked' | 'modal'
  position: WidgetPosition
  sessionId: string
  unreadCount: number
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  isDragging: boolean
  isResizing: boolean
}

interface WidgetProps {
  // API端点配置（预留）
  apiEndpoint?: string
  userId?: string
  // 工作空间ID（预留）
  workspaceId?: string
  initialPosition?: string
  theme?: 'light' | 'dark' | 'auto'
  // 权限配置（预留）
  permissions?: string[]
  onStateChange?: (state: WidgetState) => void
  onError?: (error: Error) => void
  width?: number
  height?: number
  className?: string
  /** 助手头像性别（原 Redux mock 数据，收敛后由调用方传入） */
  userGender?: 'male' | 'female'
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  status?: 'sending' | 'sent' | 'failed'
  metadata?: Record<string, unknown>
}

// 拖拽项类型定义
interface DragItem {
  type: string
  id: string
}

export const IntelligentAIWidget: React.FC<WidgetProps> = ({
  apiEndpoint: _apiEndpoint = '/api/ai-agent',
  userId: _userId = 'default-user',
  workspaceId: _workspaceId = 'default-workspace',
  initialPosition = 'bottom-right',
  theme = 'auto',
  permissions: _permissions = ['basic'],
  onStateChange,
  onError: _onError,
  width = 400,
  height = 600,
  className = '',
  userGender = 'female'
}) => {
  const [state, setState] = useState<WidgetState>(() => ({
    isVisible: true,
    isMinimized: false,
    isFullscreen: false,
    currentView: 'chat',
    mode: 'floating',
    position: getInitialPosition(initialPosition, width, height),
    sessionId: generateSessionId(),
    unreadCount: 0,
    connectionStatus: 'connected',
    isDragging: false,
    isResizing: false
  }))

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)

  const widgetRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 检测设备类型（预留用于响应式布局优化）
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window
  }, [])

  // 拖拽实现
  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: 'ai-widget',
    item: { type: 'ai-widget', id: 'ai-widget' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: !state.isMinimized && state.mode === 'floating',
    end: (_item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset()
      if (delta) {
        handleDragEnd(delta)
      }
    }
  })

  // 放置目标
  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: ['ai-widget', 'ai-widget-dock'],
    drop: (item, _monitor) => {
      if (item.type === 'ai-widget-dock') {
        handleDock()
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  })

  // 合并refs
  const setWidgetRef = useCallback((node: HTMLDivElement | null) => {
    widgetRef.current = node
    if (node) {
      drag(drop(node))
    }
  }, [drag, drop])

  // 处理拖拽结束
  const handleDragEnd = useCallback((delta: { x: number; y: number }) => {
    if (!widgetRef.current) return

    setState(prev => {
      const newPosition = {
        ...prev.position,
        x: prev.position.x + delta.x,
        y: prev.position.y + delta.y,
        zIndex: Math.max(prev.position.zIndex, 1000)
      }

      const optimizedPosition = optimizePosition(
        newPosition,
        window.innerWidth,
        window.innerHeight
      )

      const newState = { ...prev, position: optimizedPosition, isDragging: false }
      onStateChange?.(newState)
      return newState
    })
  }, [onStateChange])

  // 处理停靠
  const handleDock = useCallback(() => {
    setState(prev => ({
      ...prev,
      mode: 'docked',
      position: { ...prev.position, x: 0, y: 0 }
    }))
  }, [])

  // 处理消息发送
  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'sent'
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsProcessing(true)

    try {
      // AgenticCore 已服务端化：经 /api/agentic 调用，身份由服务端从令牌解析
      const res = await authFetch('/api/agentic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sessionId: state.sessionId })
      })
      const result = (await res.json()) as { success?: boolean; message?: string; data?: AgentResponse }
      if (!res.ok || !result.success) {
        throw new Error(result.message || `请求失败 (${res.status})`)
      }
      const response: AgentResponse = result.data as AgentResponse

      const assistantMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.message,
        timestamp: Date.now(),
        metadata: {
          taskId: response.taskId,
          status: response.status,
          estimatedTime: response.estimatedTime
        }
      }

      setMessages(prev => [...prev, assistantMessage])

      // 如果有替代方案，提供选择
      if (response.alternatives && response.alternatives.length > 0) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: generateMessageId(),
            role: 'assistant',
            content: '您可以选择以下替代方案：',
            timestamp: Date.now(),
            metadata: {
              alternatives: response.alternatives
            }
          }])
        }, 500)
      }

    } catch (error) {
      console.error('发送消息失败:', error)
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `抱歉，处理您的请求时出现错误：${(error as Error).message}`,
        timestamp: Date.now(),
        status: 'failed'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }, [state.sessionId])

  // 切换视图
  const switchView = useCallback((view: WidgetState['currentView']) => {
    setState(prev => ({
      ...prev,
      currentView: view,
      isMinimized: false
    }))
  }, [])

  // 切换最小化状态
  const toggleMinimize = useCallback(() => {
    setState(prev => {
      const newMinimized = !prev.isMinimized
      return {
        ...prev,
        isMinimized: newMinimized,
        unreadCount: newMinimized ? 0 : prev.unreadCount
      }
    })
  }, [])

  // 切换全屏状态
  const toggleFullscreen = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFullscreen: !prev.isFullscreen
    }))
  }, [])

  // 关闭组件
  const handleClose = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, isVisible: false }
      onStateChange?.(newState)
      return newState
    })
  }, [onStateChange])

  // 调整大小处理
  const handleResizeStart = useCallback((_direction: string) => {
    setState(prev => ({ ...prev, isResizing: true }))
  }, [])

  const handleResize = useCallback((_direction: string, deltaX: number, deltaY: number) => {
    setState(prev => {
      if (!prev.isResizing) return prev

      const newSize = calculateNewSize(prev.position, _direction, deltaX, deltaY)

      return {
        ...prev,
        position: { ...prev.position, ...newSize }
      }
    })
  }, [])

  const handleResizeEnd = useCallback(() => {
    setState(prev => ({ ...prev, isResizing: false }))
  }, [])

  // 系统状态轮询：AgenticCore 运行在服务端，经 /api/agentic 获取状态
  useEffect(() => {
    let cancelled = false

    const fetchStatus = async () => {
      try {
        const res = await authFetch('/api/agentic')
        if (!res.ok) return
        const result = (await res.json()) as { success?: boolean; data?: SystemStatus }
        if (!cancelled && result.success && result.data) {
          setSystemStatus(result.data)
        }
      } catch {
        // 轮询失败静默：下次间隔重试
      }
    }

    void fetchStatus()
    const statusInterval = setInterval(() => { void fetchStatus() }, 5000)

    return () => {
      cancelled = true
      clearInterval(statusInterval)
    }
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setState(prev => {
        if (prev.mode === 'floating') {
          const newPosition = optimizePosition(prev.position, window.innerWidth, window.innerHeight)
          return { ...prev, position: newPosition }
        }
        return prev
      })
    }

    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize); }
  }, [])

  // 挂载后按真实视口校正浮动位置（首帧与 SSR 输出一致，避免水合错配）
  useEffect(() => {
    setState(prev => {
      if (prev.mode !== 'floating') return prev
      return {
        ...prev,
        position: optimizePosition(
          getInitialPosition(initialPosition, width, height),
          window.innerWidth,
          window.innerHeight
        )
      }
    })
  }, [initialPosition, width, height])

  // 渲染主组件
  if (!state.isVisible) return null

  return (
    <DndProvider backend={isTouchDevice ? TouchBackend : HTML5Backend}>
      <div
        ref={setWidgetRef}
        className={`ai-widget ${className} ${state.mode} ${state.isMinimized ? 'minimized' : ''} ${state.isFullscreen ? 'fullscreen' : ''
          } ${isDragging ? 'dragging' : ''} ${isOver ? 'over' : ''}`}
        style={{
          position: state.mode === 'floating' ? 'fixed' : 'relative',
          left: state.mode === 'floating' ? `${state.position.x}px` : 'auto',
          top: state.mode === 'floating' ? `${state.position.y}px` : 'auto',
          width: state.isFullscreen ? '100%' : `${state.position.width}px`,
          height: state.isMinimized ? '60px' : state.isFullscreen ? '100%' : `${state.position.height}px`,
          zIndex: state.position.zIndex,
          minWidth: state.isMinimized ? 'auto' : '320px',
          minHeight: state.isMinimized ? 'auto' : '400px',
          maxWidth: state.isFullscreen ? '100%' : '600px',
          maxHeight: state.isFullscreen ? '100%' : '800px'
        }}
      >
        {/* 头部 */}
        <div
          className="widget-header"
          onMouseDown={state.mode === 'floating' ? undefined : undefined}
        >
          <div className="header-left">
            <div className="status-indicator">
              <div className={`status-dot ${state.connectionStatus}`} />
              <span className="status-text">
                {state.connectionStatus === 'connected' ? '在线' :
                  state.connectionStatus === 'reconnecting' ? '重连中' : '离线'}
              </span>
            </div>

            {!state.isMinimized && (
              <h3 className="widget-title flex items-center gap-2">
                <Image
                  src={characterManager.getAIAvatarPath(userGender)}
                  alt="AI助手头像"
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white shadow-sm"
                />
                YYC³ AI助手
                {(systemStatus?.activeTasks ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {systemStatus?.activeTasks}
                  </Badge>
                )}
              </h3>
            )}
          </div>

          <div className="header-right">
            {!state.isMinimized && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { switchView('chat'); }}
                  className={state.currentView === 'chat' ? 'active' : ''}
                >
                  <MessageCircle size={16} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { switchView('dashboard'); }}
                  className={state.currentView === 'dashboard' ? 'active' : ''}
                >
                  <BarChart3 size={16} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { switchView('tools'); }}
                  className={state.currentView === 'tools' ? 'active' : ''}
                >
                  <Settings2 size={16} />
                </Button>

                <Separator orientation="vertical" className="mx-1" />
              </>
            )}

            {state.mode === 'floating' && !state.isFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMinimize}
              >
                {state.isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
            >
              {state.isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* 内容区域 */}
        {!state.isMinimized && (
          <div className="widget-content">
            {state.currentView === 'chat' && (
              <ChatView
                messages={messages}
                inputValue={inputValue}
                setInputValue={setInputValue}
                onSendMessage={handleSendMessage}
                isProcessing={isProcessing}
                inputRef={messagesEndRef}
              />
            )}

            {state.currentView === 'dashboard' && (
              <DashboardView
                systemStatus={systemStatus}
                activeTasks={[]}
              />
            )}

            {state.currentView === 'tools' && (
              <ToolsView
                onToolSelected={(tool) => handleSendMessage(`使用工具: ${tool}`)}
              />
            )}

            {state.currentView === 'insights' && (
              <InsightsView
                systemStatus={systemStatus}
                completedTasks={systemStatus?.completedTasks ?? 0}
              />
            )}

            {state.currentView === 'settings' && (
              <SettingsView
                theme={theme}
                onThemeChange={() => { }}
              />
            )}
          </div>
        )}

        {/* 调整大小手柄 */}
        {state.mode === 'floating' && !state.isMinimized && !state.isFullscreen && (
          <ResizeHandles
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onResizeEnd={handleResizeEnd}
          />
        )}

        {/* 未读消息指示器 */}
        {state.isMinimized && state.unreadCount > 0 && (
          <div className="unread-indicator">
            <Badge variant="destructive" className="animate-pulse">
              {state.unreadCount}
            </Badge>
          </div>
        )}
      </div>
    </DndProvider>
  )
}

// 子组件：聊天视图
const ChatView: React.FC<{
  messages: Message[]
  inputValue: string
  setInputValue: (value: string) => void
  onSendMessage: (text: string) => void
  isProcessing: boolean
  inputRef: React.RefObject<HTMLDivElement | null>
}> = ({ messages, inputValue, setInputValue, onSendMessage, isProcessing, inputRef }) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage(inputValue)
    }
  }

  return (
    <div className="chat-view">
      <ScrollArea className="messages-area" ref={inputRef}>
        <div className="messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-content">
                {message.content}
              </div>
              <div className="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="message assistant">
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="input-area">
        <Textarea
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); }}
          onKeyDown={handleKeyPress}
          placeholder="输入您的问题..."
          disabled={isProcessing}
          rows={2}
          className="flex-1 mr-2"
        />
        <Button
          onClick={() => { onSendMessage(inputValue); }}
          disabled={!inputValue.trim() || isProcessing}
          className="send-button"
        >
          <MessageCircle size={16} />
        </Button>
      </div>
    </div>
  )
}

// 子组件：仪表板视图
// AgenticCore 已服务端化：引擎内任务在请求内同步完成，客户端不再维护任务事件流，
// activeTasks 保留 props 以兼容列表 UI，当前恒为空
const DashboardView: React.FC<{
  systemStatus: SystemStatus | null
  activeTasks: AgentTask[]
}> = ({ systemStatus, activeTasks }) => {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  return (
    <div className="dashboard-view">
      <div className="status-overview">
        <div className="status-card">
          <h4>系统状态</h4>
          <div className="status-item">
            <span>当前状态:</span>
            <Badge variant={systemStatus?.state === AgentState.IDLE ? 'secondary' : 'default'}>
              {systemStatus?.state || '未知'}
            </Badge>
          </div>
          <div className="status-item">
            <span>活跃任务:</span>
            <Badge variant="outline">{activeTasks.length}</Badge>
          </div>
          <div className="status-item">
            <span>成功率:</span>
            <span>{systemStatus ? (systemStatus.successRate * 100).toFixed(1) : '--'}%</span>
          </div>
        </div>

        <Button onClick={handleRefresh} disabled={refreshing} className="refresh-button">
          <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
        </Button>
      </div>

      <div className="active-tasks">
        <h4>活跃任务</h4>
        {activeTasks.length === 0 ? (
          <div className="empty-state">
            <Info size={24} />
            <p>暂无活跃任务</p>
          </div>
        ) : (
          <div className="task-list">
            {activeTasks.map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-header">
                  <span className="task-title">{task.goal}</span>
                  <Badge variant={task.status === 'executing' ? 'default' : 'secondary'}>
                    {task.status}
                  </Badge>
                </div>
                <div className="task-progress">
                  <Progress value={calculateTaskProgress(task)} className="w-full" />
                  <span className="progress-text">
                    {calculateTaskProgress(task)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 子组件：工具视图
const ToolsView: React.FC<{
  onToolSelected: (tool: string) => void
}> = ({ onToolSelected }) => {
  const tools = [
    { id: 'prediction', name: '预测分析', icon: <TrendingUp size={16} />, description: '数据预测和趋势分析' },
    { id: 'optimization', name: '模型优化', icon: <Zap size={16} />, description: '模型参数调优' },
    { id: 'evaluation', name: '性能评估', icon: <Activity size={16} />, description: '模型性能评估' },
    { id: 'diagnosis', name: '故障诊断', icon: <AlertTriangle size={16} />, description: '系统故障检测' }
  ]

  return (
    <div className="tools-view">
      <div className="tools-grid">
        {tools.map((tool) => (
          <Card
            key={tool.id}
            className="tool-card"
            onClick={() => { onToolSelected(tool.name); }}
          >
            <CardContent className="tool-content">
              <div className="tool-icon">{tool.icon}</div>
              <div className="tool-info">
                <h5>{tool.name}</h5>
                <p>{tool.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// 子组件：洞察视图
const InsightsView: React.FC<{
  systemStatus: SystemStatus | null
  completedTasks: number
}> = ({ systemStatus, completedTasks }) => {
  return (
    <div className="insights-view">
      <div className="insight-card">
        <h4>性能洞察</h4>
        <div className="insight-metrics">
          <div className="metric">
            <span>总任务数:</span>
            <span className="metric-value">{completedTasks}</span>
          </div>
          <div className="metric">
            <span>平均执行时间:</span>
            <span className="metric-value">
              {systemStatus ? (systemStatus.averageExecutionTime / 1000).toFixed(1) : '--'}s
            </span>
          </div>
          <div className="metric">
            <span>学习进度:</span>
            <span className="metric-value">
              {systemStatus?.learningProgress.learningRate ?
                (systemStatus.learningProgress.learningRate * 100).toFixed(1) : '--'}%
            </span>
          </div>
        </div>
      </div>

      <div className="insight-card">
        <h4>系统建议</h4>
        <div className="suggestions">
          <div className="suggestion">
            <CheckCircle size={16} className="suggestion-icon success" />
            <span>模型性能良好，建议继续使用当前配置</span>
          </div>
          <div className="suggestion">
            <Info size={16} className="suggestion-icon info" />
            <span>可以考虑启用自动优化功能以提升性能</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// 子组件：设置视图
const SettingsView: React.FC<{
  theme: string
  onThemeChange: () => void
}> = ({ theme, onThemeChange }) => {
  return (
    <div className="settings-view">
      <div className="setting-group">
        <h4>界面设置</h4>
        <div className="setting-item">
          <Label>主题模式</Label>
          <div className="theme-options">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { onThemeChange(); }}
            >
              浅色
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { onThemeChange(); }}
            >
              深色
            </Button>
            <Button
              variant={theme === 'auto' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { onThemeChange(); }}
            >
              自动
            </Button>
          </div>
        </div>
      </div>

      <div className="setting-group">
        <h4>功能设置</h4>
        <div className="setting-item">
          <div className="flex items-center justify-between">
            <Label>自动优化</Label>
            <Switch defaultChecked />
          </div>
        </div>
        <div className="setting-item">
          <div className="flex items-center justify-between">
            <Label>学习模式</Label>
            <Switch defaultChecked />
          </div>
        </div>
        <div className="setting-item">
          <div className="flex items-center justify-between">
            <Label>隐私保护</Label>
            <Switch />
          </div>
        </div>
      </div>
    </div>
  )
}

// 子组件：调整大小手柄
const ResizeHandles: React.FC<{
  onResizeStart: (direction: string) => void
  onResize: (direction: string, deltaX: number, deltaY: number) => void
  onResizeEnd: () => void
}> = ({ onResizeStart, onResize, onResizeEnd }) => {
  const [resizing, setResizing] = useState<string | null>(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  const handleMouseDown = (direction: string, e: React.MouseEvent) => {
    e.preventDefault()
    setResizing(direction)
    setStartPos({ x: e.clientX, y: e.clientY })
    onResizeStart(direction)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizing) return

    const deltaX = e.clientX - startPos.x
    const deltaY = e.clientY - startPos.y
    onResize(resizing, deltaX, deltaY)
  }, [resizing, startPos, onResize])

  const handleMouseUp = useCallback(() => {
    if (resizing) {
      setResizing(null)
      onResizeEnd()
    }
  }, [resizing, onResizeEnd])

  useEffect(() => {
    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
    return undefined
  }, [resizing, handleMouseMove, handleMouseUp])

  return (
    <>
      <div className="resize-handle resize-se" onMouseDown={(e) => { handleMouseDown('se', e); }} />
      <div className="resize-handle resize-sw" onMouseDown={(e) => { handleMouseDown('sw', e); }} />
      <div className="resize-handle resize-ne" onMouseDown={(e) => { handleMouseDown('ne', e); }} />
      <div className="resize-handle resize-nw" onMouseDown={(e) => { handleMouseDown('nw', e); }} />
      <div className="resize-handle resize-e" onMouseDown={(e) => { handleMouseDown('e', e); }} />
      <div className="resize-handle resize-w" onMouseDown={(e) => { handleMouseDown('w', e); }} />
      <div className="resize-handle resize-s" onMouseDown={(e) => { handleMouseDown('s', e); }} />
      <div className="resize-handle resize-n" onMouseDown={(e) => { handleMouseDown('n', e); }} />
    </>
  )
}

// 辅助函数
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

function getInitialPosition(position: string, width: number, height: number): WidgetPosition {
  // SSR 安全：首帧渲染必须使用确定性常量（1920×1080），与服务器输出一致；
  // 真实视口在挂载后由 useEffect 校正，避免水合错配
  const margin = 20
  const viewportWidth = 1920
  const viewportHeight = 1080

  switch (position) {
    case 'top-left':
      return { x: margin, y: margin, width, height, zIndex: 1000 }
    case 'top-right':
      return { x: viewportWidth - width - margin, y: margin, width, height, zIndex: 1000 }
    case 'bottom-left':
      return { x: margin, y: viewportHeight - height - margin, width, height, zIndex: 1000 }
    case 'bottom-right':
      return { x: viewportWidth - width - margin, y: viewportHeight - height - margin, width, height, zIndex: 1000 }
    case 'center':
      return {
        x: (viewportWidth - width) / 2,
        y: (viewportHeight - height) / 2,
        width,
        height,
        zIndex: 1000
      }
    default:
      return { x: viewportWidth - width - margin, y: viewportHeight - height - margin, width, height, zIndex: 1000 }
  }
}

function optimizePosition(
  position: WidgetPosition,
  viewportWidth: number,
  viewportHeight: number
): WidgetPosition {
  const margin = 20
  const maxX = viewportWidth - position.width - margin
  const maxY = viewportHeight - position.height - margin

  return {
    ...position,
    x: Math.max(margin, Math.min(position.x, maxX)),
    y: Math.max(margin, Math.min(position.y, maxY))
  }
}

function calculateNewSize(
  position: WidgetPosition,
  direction: string,
  deltaX: number,
  deltaY: number
): Partial<WidgetPosition> {
  const minWidth = 320
  const minHeight = 400
  const maxWidth = 600
  const maxHeight = 800

  let newWidth = position.width
  let newHeight = position.height

  switch (direction) {
    case 'e':
      newWidth = Math.max(minWidth, Math.min(maxWidth, position.width + deltaX))
      break
    case 'w':
      newWidth = Math.max(minWidth, Math.min(maxWidth, position.width - deltaX))
      break
    case 's':
      newHeight = Math.max(minHeight, Math.min(maxHeight, position.height + deltaY))
      break
    case 'n':
      newHeight = Math.max(minHeight, Math.min(maxHeight, position.height - deltaY))
      break
    case 'se':
      newWidth = Math.max(minWidth, Math.min(maxWidth, position.width + deltaX))
      newHeight = Math.max(minHeight, Math.min(maxHeight, position.height + deltaY))
      break
    case 'sw':
      newWidth = Math.max(minWidth, Math.min(maxWidth, position.width - deltaX))
      newHeight = Math.max(minHeight, Math.min(maxHeight, position.height + deltaY))
      break
    case 'ne':
      newWidth = Math.max(minWidth, Math.min(maxWidth, position.width + deltaX))
      newHeight = Math.max(minHeight, Math.min(maxHeight, position.height - deltaY))
      break
    case 'nw':
      newWidth = Math.max(minWidth, Math.min(maxWidth, position.width - deltaX))
      newHeight = Math.max(minHeight, Math.min(maxHeight, position.height - deltaY))
      break
  }

  return { width: newWidth, height: newHeight }
}

function calculateTaskProgress(task: AgentTask): number {
  const completed = task.subtasks.filter(s => s.status === 'completed').length
  return task.subtasks.length > 0 ? (completed / task.subtasks.length) * 100 : 0
}

export default IntelligentAIWidget
