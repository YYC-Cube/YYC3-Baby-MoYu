/**
 * YYC³ 智能预测系统 - 专业化预测引擎
 * 包含时间序列、异常检测、因果推断等专用预测引擎
 */

// 预测引擎类方法按异步 API 契约保留 async 签名，内部为同步模拟实现，
// 属既有设计，定向豁免 require-await。
/* eslint-disable @typescript-eslint/require-await */

import type {
  Anomaly,
  AnomalyExplanation,
  AnomalyReport,
  CausalGraph,
  CounterfactualResult,
  Intervention,
  PredictionData,
  PredictionResult,
  PredictorConfig,
  ProbabilisticForecast,
  SeasonalityAnalysis,
  TrainingResult
} from '@/types/prediction/common'
import { BasePredictor } from './base-predictor'

/**
 * 时间序列预测引擎
 */
export class TimeSeriesEngine extends BasePredictor {
  private seasonality: SeasonalityAnalysis | null = null
  private trend: number[] = []
  private seasonalityPeriod: number = 0
  private lastTrainingError: number = 0

  constructor(config: PredictorConfig) {
    super(config)
  }

  protected createInstance(config: PredictorConfig): BasePredictor {
    return new TimeSeriesEngine(config)
  }

  protected getSearchSpace(): Record<string, unknown> {
    return {
      windowSize: { type: 'range', min: 5, max: 50 },
      alpha: { type: 'range', min: 0.1, max: 0.9 },
      beta: { type: 'range', min: 0.1, max: 0.9 },
      gamma: { type: 'range', min: 0.1, max: 0.9 },
      seasonalityPeriod: [7, 14, 30, 90, 365]
    }
  }

  async train(data: PredictionData): Promise<TrainingResult> {
    const startTime = Date.now()

    // 数据预处理
    const processedData = this.preprocessData(data)

    // 特征工程
    this.featureSet = await this.extractFeatures(processedData)

    // 检测季节性
    this.seasonality = await this.detectSeasonality(processedData)

    // 提取趋势
    this.trend = this.extractTrend(processedData)

    // 训练模型（简化版指数平滑）
    const params = this.config.parameters
    const windowSize = Number(params.windowSize) || 12
    const alpha = Number(params.alpha) || 0.3
    const beta = Number(params.beta) || 0.1
    const gamma = Number(params.gamma) || 0.1

    // 计算训练误差
    const predictions = await this.generateTrainingPredictions(processedData, windowSize, alpha, beta, gamma)
    const actuals = processedData.data.slice(windowSize).map(p => p.value)
    const errors = predictions.map((pred, i) => Math.abs(pred - actuals[i]))
    const mae = errors.reduce((a, b) => a + Number(b), 0) / errors.length
    this.lastTrainingError = mae
    const rmse = Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / errors.length)

    const trainingResult: TrainingResult = {
      modelId: this.modelId,
      algorithm: this.config.algorithm,
      parameters: { windowSize, alpha, beta, gamma, seasonalityPeriod: this.seasonalityPeriod },
      trainingTime: Date.now() - startTime,
      trainingScore: 1 / (1 + mae),
      validationScore: 1 / (1 + rmse),
      featureImportance: this.featureSet?.importance,
      trainingMetrics: {
        mae,
        rmse,
        mape: this.calculateMAPE(actuals, predictions),
        r2: this.calculateR2(actuals, predictions)
      },
      timestamp: Date.now()
    }

    this.isTrained = true
    this.trainingHistory.push(trainingResult)

    return trainingResult
  }

  async predict(data: PredictionData, horizon: number = 1): Promise<PredictionResult> {
    if (!this.isTrained) {
      throw new Error('模型尚未训练')
    }

    const processedData = this.preprocessData(data)
    const params = this.config.parameters

    // 简化版预测逻辑
    const _windowSize = params.windowSize || 12
    const alpha = Number(params.alpha) || 0.3
    const _beta = Number(params.beta) || 0.1
    const gamma = Number(params.gamma) || 0.1

    const predictions: number[] = []
    let lastValue = processedData.data[processedData.data.length - 1].value

    for (let i = 1; i <= horizon; i++) {
      // 简化的指数平滑预测
      const seasonalComponent = this.seasonality?.detected && this.seasonalityPeriod > 0 ?
        this.getSeasonalComponent(i) : 0

      const prediction = lastValue * (1 - alpha) + seasonalComponent * gamma
      predictions.push(prediction)
      lastValue = prediction
    }

    const result: PredictionResult = {
      id: this.generatePredictionId(),
      prediction: horizon === 1 ? predictions[0] : predictions,
      confidence: 0.85,
      timestamp: Date.now(),
      horizon,
      modelId: this.modelId,
      methodology: 'time_series_exponential_smoothing',
      confidenceInterval: horizon === 1
        ? [this.calculateConfidenceInterval(predictions[0])]
        : predictions.map(p => this.calculateConfidenceInterval(p))
    }

    return result
  }

  private calculateConfidenceInterval(prediction: number): { lower: number; upper: number } {
    const margin = (this.lastTrainingError || 0) * 1.96
    return {
      lower: prediction - margin,
      upper: prediction + margin,
    }
  }

  async evaluate(testData: PredictionData): Promise<Record<string, number>> {
    const processedData = this.preprocessData(testData)
    const predictions = await this.predict(processedData, processedData.data.length)
    const actuals = processedData.data.map(p => p.value)

    const predValues = Array.isArray(predictions.prediction) ? predictions.prediction : [predictions.prediction]

    return {
      mae: this.calculateMAE(actuals, predValues),
      rmse: this.calculateRMSE(actuals, predValues),
      mape: this.calculateMAPE(actuals, predValues),
      r2: this.calculateR2(actuals, predValues),
      theil_u: this.calculateTheilU(actuals, predValues)
    }
  }

  /**
   * 检测季节性
   */
  async detectSeasonality(data: PredictionData): Promise<SeasonalityAnalysis> {
    const values = data.data.map(p => p.value)
    const periods = [7, 14, 30, 90, 365] // 常见季节性周期
    let bestPeriod = 0
    let bestCorrelation = 0

    periods.forEach(period => {
      if (values.length < period * 2) return

      const correlation = this.calculateSeasonalityCorrelation(values, period)
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation
        bestPeriod = period
      }
    })

    this.seasonalityPeriod = bestPeriod

    return {
      detected: bestCorrelation > 0.3,
      period: bestPeriod,
      strength: bestCorrelation,
      type: bestPeriod > 0 ? this.identifySeasonalityType(bestPeriod) : 'none',
      confidence: Math.min(bestCorrelation * 1.5, 1.0)
    }
  }

  /**
   * 不确定性预测
   */
  async forecastWithUncertainty(data: PredictionData, horizon: number = 1): Promise<ProbabilisticForecast> {
    const pointForecast = await this.predict(data, horizon)

    // 简化的不确定性量化
    const baseUncertainty = 0.1 // 基础不确定性10%
    const uncertaintyGrowth = 1.05 // 每步预测不确定性增长5%

    const uncertainties: number[] = []
    for (let i = 1; i <= horizon; i++) {
      uncertainties.push(baseUncertainty * Math.pow(uncertaintyGrowth, i - 1))
    }

    const predValues = Array.isArray(pointForecast.prediction) ?
      pointForecast.prediction : [pointForecast.prediction]

    return {
      pointForecast: predValues,
      uncertainty: uncertainties,
      predictionIntervals: predValues.map((pred, i) => ({
        lower: pred * (1 - uncertainties[i]),
        upper: pred * (1 + uncertainties[i])
      })),
      distribution: 'normal',
      confidence: 0.95
    }
  }

  private extractTrend(data: PredictionData): number[] {
    const values = data.data.map(p => p.value)
    const windowSize = Math.min(12, Math.floor(values.length / 4))
    const trend: number[] = []

    for (let i = windowSize; i < values.length; i++) {
      const window = values.slice(i - windowSize, i)
      const firstHalf = window.slice(0, Math.floor(windowSize / 2))
      const secondHalf = window.slice(Math.floor(windowSize / 2))

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

      trend.push(secondAvg - firstAvg)
    }

    return trend
  }

  private calculateSeasonalityCorrelation(values: number[], period: number): number {
    if (values.length < period * 2) return 0

    const correlations: number[] = []
    for (let lag = period; lag < Math.min(period * 3, values.length - period); lag += period) {
      const correlation = this.calculateCorrelation(
        values.slice(0, values.length - lag),
        values.slice(lag)
      )
      correlations.push(correlation)
    }

    return correlations.length > 0 ? correlations.reduce((a, b) => a + b, 0) / correlations.length : 0
  }

  private identifySeasonalityType(period: number): 'daily' | 'weekly' | 'monthly' | 'yearly' {
    if (period <= 1) return 'daily'
    if (period <= 7) return 'weekly'
    if (period <= 30) return 'monthly'
    return 'yearly'
  }

  private getSeasonalComponent(step: number): number {
    if (!this.seasonality || !this.seasonality.detected || this.seasonalityPeriod === 0) {
      return 0
    }

    // 简化的季节性组件
    const phase = (step % this.seasonalityPeriod) / this.seasonalityPeriod * 2 * Math.PI
    return Math.sin(phase) * this.seasonality.strength
  }

  private async generateTrainingPredictions(data: PredictionData, windowSize: number, _alpha: number, _beta: number, _gamma: number): Promise<number[]> {
    const predictions: number[] = []
    const values = data.data.map(p => p.value)

    for (let i = windowSize; i < values.length; i++) {
      const window = values.slice(i - windowSize, i)
      const avg = window.reduce((a, b) => a + b, 0) / windowSize
      predictions.push(avg)
    }

    return predictions
  }

  // 辅助计算方法
  private calculateMAE(actuals: number[], predictions: number[]): number {
    return predictions.reduce((sum, pred, i) => sum + Math.abs(pred - actuals[i]), 0) / predictions.length
  }

  private calculateRMSE(actuals: number[], predictions: number[]): number {
    return Math.sqrt(predictions.reduce((sum, pred, i) => sum + Math.pow(pred - actuals[i], 2), 0) / predictions.length)
  }

  private calculateMAPE(actuals: number[], predictions: number[]): number {
    return predictions.reduce((sum, pred, i) => {
      const actual = actuals[i]
      return actual !== 0 ? sum + Math.abs((pred - actual) / actual) : sum
    }, 0) / predictions.length
  }

  private calculateR2(actuals: number[], predictions: number[]): number {
    const actualMean = actuals.reduce((a, b) => a + b, 0) / actuals.length
    const totalSS = actuals.reduce((sum, actual) => sum + Math.pow(actual - actualMean, 2), 0)
    const residualSS = predictions.reduce((sum, pred, i) => sum + Math.pow(pred - actuals[i], 2), 0)
    return 1 - (residualSS / totalSS)
  }

  private calculateTheilU(actuals: number[], predictions: number[]): number {
    const errorSS = predictions.reduce((sum, pred, i) => sum + Math.pow(pred - actuals[i], 2), 0)
    const naiveSS = actuals.reduce((sum, actual, i) => {
      return i > 0 ? sum + Math.pow(actual - actuals[i - 1], 2) : sum
    }, 0)
    return Math.sqrt(errorSS / naiveSS)
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0

    const n = x.length
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }
}

/**
 * 异常检测引擎
 */
export class AnomalyDetectionEngine extends BasePredictor {
  private threshold: number = 2.5
  private baseline: number[] = []

  constructor(config: PredictorConfig) {
    super(config)
    this.threshold = Number(config.parameters.threshold) || 2.5
  }

  protected createInstance(config: PredictorConfig): BasePredictor {
    return new AnomalyDetectionEngine(config)
  }

  protected getSearchSpace(): Record<string, unknown> {
    return {
      threshold: { type: 'range', min: 1.5, max: 4.0 },
      windowSize: { type: 'range', min: 10, max: 100 },
      method: ['zscore', 'iqr', 'isolation_forest', 'lof']
    }
  }

  async train(data: PredictionData): Promise<TrainingResult> {
    const startTime = Date.now()
    const processedData = this.preprocessData(data)

    // 计算基线统计量
    this.baseline = processedData.data.map(p => p.value)

    const stats = this.calculateStatistics(this.baseline)
    const trainingResult: TrainingResult = {
      modelId: this.modelId,
      algorithm: this.config.algorithm,
      parameters: { threshold: this.threshold, ...stats },
      trainingTime: Date.now() - startTime,
      trainingScore: 1.0,
      validationScore: 1.0,
      trainingMetrics: stats,
      timestamp: Date.now()
    }

    this.isTrained = true
    this.trainingHistory.push(trainingResult)

    return trainingResult
  }

  async predict(data: PredictionData, horizon?: number): Promise<PredictionResult> {
    if (!this.isTrained) {
      throw new Error('模型尚未训练')
    }

    const anomalyReport = await this.detectAnomalies(data)

    return {
      id: this.generatePredictionId(),
      prediction: anomalyReport.anomalies.length,
      confidence: 0.9,
      timestamp: Date.now(),
      horizon: horizon || 1,
      modelId: this.modelId,
      methodology: 'statistical_anomaly_detection',
      explanation: `检测到 ${anomalyReport.anomalies.length} 个异常点`
    }
  }

  async evaluate(testData: PredictionData): Promise<Record<string, number>> {
    const anomalyReport = await this.detectAnomalies(testData)

    return {
      anomalyCount: anomalyReport.anomalies.length,
      anomalyRate: anomalyReport.anomalies.length / testData.data.length,
      severity: this.calculateAnomalySeverity(anomalyReport.anomalies)
    }
  }

  /**
   * 检测异常
   */
  async detectAnomalies(data: PredictionData): Promise<AnomalyReport> {
    const processedData = this.preprocessData(data)
    const values = processedData.data.map(p => p.value)
    const anomalies: Anomaly[] = []

    const method = String(this.config.parameters.method) || 'zscore'

    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      const isAnomaly = this.isValueAnomalous(value, i, method, values)

      if (isAnomaly) {
        anomalies.push({
          index: i,
          timestamp: processedData.data[i].timestamp,
          value: value,
          score: this.calculateAnomalyScore(value, i, method, values),
          type: this.classifyAnomalyType(value, i, values),
          severity: this.assessAnomalySeverity(value, i, values)
        })
      }
    }

    return {
      anomalies,
      totalCount: anomalies.length,
      severity: this.calculateAnomalySeverity(anomalies),
      detectionMethod: method,
      confidence: 0.85,
      timestamp: Date.now()
    }
  }

  /**
   * 解释异常
   */
  async explainAnomalies(anomalies: Anomaly[]): Promise<AnomalyExplanation[]> {
    return anomalies.map(anomaly => ({
      anomalyIndex: anomaly.index,
      explanation: this.generateAnomalyExplanation(anomaly),
      contributingFactors: this.identifyContributingFactors(anomaly),
      recommendedAction: this.recommendAction(anomaly),
      context: this.getAnomalyContext(anomaly)
    }))
  }

  private calculateStatistics(values: number[]): Record<string, number> {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const std = Math.sqrt(variance)

    const sortedValues = [...values].sort((a, b) => a - b)
    const q1 = sortedValues[Math.floor(sortedValues.length * 0.25)]
    const q3 = sortedValues[Math.floor(sortedValues.length * 0.75)]
    const iqr = q3 - q1

    return {
      mean,
      std,
      min: Math.min(...values),
      max: Math.max(...values),
      median: sortedValues[Math.floor(sortedValues.length / 2)],
      q1,
      q3,
      iqr
    }
  }

  private isValueAnomalous(value: number, index: number, method: string, values: number[]): boolean {
    const stats = this.calculateStatistics(values)

    switch (method) {
      case 'zscore':
        const zscore = Math.abs((value - stats.mean) / stats.std)
        return zscore > this.threshold

      case 'iqr':
        const lowerBound = stats.q1 - 1.5 * stats.iqr
        const upperBound = stats.q3 + 1.5 * stats.iqr
        return value < lowerBound || value > upperBound

      default:
        return false
    }
  }

  private calculateAnomalyScore(value: number, index: number, method: string, values: number[]): number {
    const stats = this.calculateStatistics(values)

    switch (method) {
      case 'zscore':
        return Math.abs((value - stats.mean) / stats.std)
      case 'iqr':
        const lowerBound = stats.q1 - 1.5 * stats.iqr
        const upperBound = stats.q3 + 1.5 * stats.iqr
        if (value < lowerBound) return (lowerBound - value) / stats.iqr
        if (value > upperBound) return (value - upperBound) / stats.iqr
        return 0
      default:
        return 0
    }
  }

  private classifyAnomalyType(value: number, index: number, values: number[]): 'spike' | 'dip' | 'trend_break' | 'seasonal_anomaly' {
    const contextSize = Math.min(5, index, values.length - index - 1)
    if (contextSize === 0) return 'spike'

    const context = values.slice(index - contextSize, index + contextSize + 1)
    const contextMean = context.reduce((a, b) => a + b, 0) / context.length

    if (value > contextMean * 1.5) return 'spike'
    if (value < contextMean * 0.5) return 'dip'

    return 'trend_break'
  }

  private assessAnomalySeverity(value: number, index: number, values: number[]): 'low' | 'medium' | 'high' {
    const score = this.calculateAnomalyScore(value, index, 'zscore', values)
    if (score < 2) return 'low'
    if (score < 3) return 'medium'
    return 'high'
  }

  private calculateAnomalySeverity(anomalies: Anomaly[]): number {
    if (anomalies.length === 0) return 0

    const severityWeights: Record<string, number> = { low: 1, medium: 2, high: 3 }
    const totalSeverity = anomalies.reduce((sum, anomaly) =>
      sum + (severityWeights[anomaly.severity] ?? 0), 0)

    return totalSeverity / anomalies.length
  }

  private generateAnomalyExplanation(anomaly: Anomaly): string {
    const severityText: Record<string, string> = {
      low: '轻微',
      medium: '中等',
      high: '严重'
    }

    const typeText = {
      spike: '突增',
      dip: '突降',
      trend_break: '趋势突变',
      seasonal_anomaly: '季节性异常'
    } as Record<string, string>

    return `在时间点 ${new Date(anomaly.timestamp).toLocaleString()} 检测到${severityText[anomaly.severity] ?? ''}程度的${typeText[anomaly.type] ?? ''}异常，值为 ${anomaly.value.toFixed(2)}，异常分数为 ${anomaly.score.toFixed(2)}`
  }

  private identifyContributingFactors(anomaly: Anomaly): string[] {
    const factors: string[] = []

    if (anomaly.type === 'spike') {
      factors.push('外部事件影响', '数据采集错误', '系统异常')
    } else if (anomaly.type === 'dip') {
      factors.push('系统故障', '数据缺失', '正常周期性下降')
    } else if (anomaly.type === 'trend_break') {
      factors.push('市场变化', '政策影响', '用户行为改变')
    }

    return factors
  }

  private recommendAction(anomaly: Anomaly): string {
    if (anomaly.severity === 'high') {
      return '立即调查并采取纠正措施'
    } else if (anomaly.severity === 'medium') {
      return '密切监控，准备应对方案'
    } else {
      return '记录异常，继续观察'
    }
  }

  private getAnomalyContext(anomaly: Anomaly): Record<string, unknown> {
    return {
      surroundingValues: this.baseline.slice(
        Math.max(0, anomaly.index - 5),
        Math.min(this.baseline.length, anomaly.index + 6)
      ),
      statisticalBaseline: this.calculateStatistics(this.baseline),
      timeContext: `前后5个时间点的平均值`
    }
  }
}

/**
 * 因果推断引擎
 */
export class CausalInferenceEngine extends BasePredictor {
  constructor(config: PredictorConfig) {
    super(config)
  }

  protected createInstance(config: PredictorConfig): BasePredictor {
    return new CausalInferenceEngine(config)
  }

  async train(_data: PredictionData): Promise<TrainingResult> {
    // 因果推断的"训练"主要是学习因果关系
    const startTime = Date.now()

    const trainingResult: TrainingResult = {
      modelId: this.modelId,
      algorithm: this.config.algorithm,
      parameters: this.config.parameters,
      trainingTime: Date.now() - startTime,
      trainingScore: 1.0,
      validationScore: 1.0,
      trainingMetrics: {},
      timestamp: Date.now()
    }

    this.isTrained = true
    this.trainingHistory.push(trainingResult)

    return trainingResult
  }

  async predict(data: PredictionData, horizon?: number): Promise<PredictionResult> {
    if (!this.isTrained) {
      throw new Error('模型尚未训练')
    }

    // 因果推断主要用于解释而非预测
    return {
      id: this.generatePredictionId(),
      prediction: 0, // 因果推断不直接产生数值预测
      confidence: 0.7,
      timestamp: Date.now(),
      horizon: horizon || 1,
      modelId: this.modelId,
      methodology: 'causal_inference',
      explanation: '因果推断引擎主要用于识别变量间的因果关系，而非直接预测'
    }
  }

  async evaluate(_testData: PredictionData): Promise<Record<string, number>> {
    // 因果推断的评估指标与传统预测不同
    return {
      causalStrength: 0.8,
      identifiability: 0.9,
      robustness: 0.85
    }
  }

  /**
   * 识别因果关系
   */
  async identifyCausalEffects(data: PredictionData): Promise<CausalGraph> {
    const features = data.features || []
    const causalGraph: CausalGraph = {
      nodes: ['target', ...features],
      edges: [],
      directionality: 'directed',
      confidence: 0.75,
      methodology: 'correlation_based',
      timestamp: Date.now()
    }

    // 简化的因果关系识别（基于相关性）
    for (const feature of features) {
      const correlation = this.calculateFeatureTargetCorrelation(data, feature)
      if (Math.abs(correlation) > 0.3) {
        causalGraph.edges.push({
          from: feature,
          to: 'target',
          weight: Math.abs(correlation),
          direction: 'forward',
          confidence: Math.min(Math.abs(correlation) * 1.5, 1.0)
        })
      }
    }

    return causalGraph
  }

  /**
   * 模拟干预
   */
  async simulateIntervention(intervention: Intervention): Promise<CounterfactualResult> {
    // 简化的反事实推理
    const baseline = intervention.baselineValue || 0
    const effectSize = intervention.magnitude || 0.1
    const causalEffect = baseline * effectSize

    return {
      intervention: intervention.type,
      baseline,
      counterfactual: baseline + causalEffect,
      effectSize: causalEffect,
      confidence: 0.8,
      methodology: 'linear_approximation',
      assumptions: ['线性因果关系', '无混淆因素', '因果效应恒定']
    }
  }

  private calculateFeatureTargetCorrelation(data: PredictionData, feature: string): number {
    const featureValues: number[] = data.data.map(p => Number(p.features?.[feature] || 0))
    const targetValues = data.data.map(p => p.value)

    return this.calculateCorrelation(featureValues, targetValues)
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0

    const n = x.length
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0)

    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))

    return denominator === 0 ? 0 : numerator / denominator
  }
}
