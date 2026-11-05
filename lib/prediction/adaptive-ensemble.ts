/**
 * YYC³ 智能预测系统 - 自适应集成学习系统
 * 提供动态模型选择、权重自适应和概念漂移检测功能
 */

import type {
  DataDriftMetrics,
  DriftDetection,
  PerformanceHistory,
  PredictionData,
  PredictionResult,
  PredictorConfig,
  TrainingResult,
  UpdatedWeights
} from '@/types/prediction/common'
import { BasePredictor } from './base-predictor'

// 集成引擎方法按异步 API 契约保留 async 签名，内部为同步模拟实现，
// 属既有设计，定向豁免 require-await。
/* eslint-disable @typescript-eslint/require-await */

/**
 * 集成引擎基类
 */
export class EnsembleEngine extends BasePredictor {
  protected basePredictors: BasePredictor[] = []
  protected weights: number[] = []
  protected ensembleMethod: 'voting' | 'averaging' | 'stacking' | 'weighted' = 'weighted'
  protected performanceHistory: Map<string, PerformanceHistory[]> = new Map()

  constructor(config: PredictorConfig) {
    super(config)
    this.ensembleMethod = (config.parameters.method as typeof this.ensembleMethod) || 'weighted'
  }

  protected createInstance(config: PredictorConfig): BasePredictor {
    return new EnsembleEngine(config)
  }

  /**
   * 添加基础预测器
   */
  addPredictor(predictor: BasePredictor, weight: number = 1.0): void {
    this.basePredictors.push(predictor)
    this.weights.push(weight)
  }

  /**
   * 训练集成模型
   */
  async train(data: PredictionData): Promise<TrainingResult> {
    const startTime = Date.now()

    // 训练所有基础预测器
    const trainingResults: TrainingResult[] = []
    for (const predictor of this.basePredictors) {
      try {
        const result = await predictor.train(data)
        trainingResults.push(result)
      } catch (error) {
        console.warn('基础预测器训练失败:', error)
      }
    }

    // 如果使用堆叠集成，训练元学习器
    if (this.ensembleMethod === 'stacking') {
      await this.trainMetaLearner(data)
    }

    // 计算集成权重
    if (this.ensembleMethod === 'weighted') {
      await this.calculateOptimalWeights(trainingResults)
    }

    const avgTrainingScore = trainingResults.reduce((sum, r) => sum + r.trainingScore, 0) / trainingResults.length

    const trainingResult: TrainingResult = {
      modelId: this.modelId,
      algorithm: `ensemble_${this.ensembleMethod}`,
      parameters: {
        method: this.ensembleMethod,
        basePredictors: this.basePredictors.map(p => p.getModelInfo().modelId),
        weights: this.weights
      },
      trainingTime: Date.now() - startTime,
      trainingScore: avgTrainingScore,
      validationScore: avgTrainingScore,
      featureImportance: this.calculateEnsembleFeatureImportance(trainingResults),
      trainingMetrics: {
        baseModelCount: this.basePredictors.length,
        avgTrainingTime: trainingResults.reduce((sum, r) => sum + r.trainingTime, 0) / trainingResults.length,
        bestModelScore: Math.max(...trainingResults.map(r => r.trainingScore)),
        worstModelScore: Math.min(...trainingResults.map(r => r.trainingScore))
      },
      timestamp: Date.now()
    }

    this.isTrained = true
    this.trainingHistory.push(trainingResult)

    return trainingResult
  }

  /**
   * 集成预测
   */
  async predict(data: PredictionData, horizon?: number): Promise<PredictionResult> {
    if (!this.isTrained || this.basePredictors.length === 0) {
      throw new Error('集成模型尚未训练或没有基础预测器')
    }

    const predictions: (number | number[])[] = []
    const confidences: number[] = []

    // 获取所有基础预测器的预测
    for (let i = 0; i < this.basePredictors.length; i++) {
      try {
        const predictor = this.basePredictors[i]
        const prediction = await predictor.predict(data, horizon)

        if (Array.isArray(prediction.prediction)) {
          predictions.push(prediction.prediction)
        } else {
          predictions.push(prediction.prediction)
        }

        confidences.push(prediction.confidence)
      } catch (error) {
        console.warn(`基础预测器 ${i} 预测失败:`, error)
        predictions.push(horizon === undefined ? 0 : new Array(horizon).fill(0))
        confidences.push(0)
      }
    }

    // 根据集成方法聚合预测
    let finalPrediction: number | number[]
    let finalConfidence: number

    switch (this.ensembleMethod) {
      case 'averaging':
        finalPrediction = this.averagePredictions(predictions)
        finalConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length
        break
      case 'weighted':
        finalPrediction = this.weightedAverage(predictions)
        finalConfidence = this.calculateWeightedConfidence(confidences)
        break
      case 'voting':
        finalPrediction = this.votingPredictions(predictions)
        finalConfidence = this.calculateVotingConfidence(predictions, confidences)
        break
      case 'stacking':
        finalPrediction = await this.metaLearnerPredict(predictions)
        finalConfidence = 0.85 // 堆叠集成通常有较高的置信度
        break
      default:
        finalPrediction = this.weightedAverage(predictions)
        finalConfidence = this.calculateWeightedConfidence(confidences)
    }

    return {
      id: this.generatePredictionId(),
      prediction: finalPrediction,
      confidence: finalConfidence,
      timestamp: Date.now(),
      horizon: horizon || 1,
      modelId: this.modelId,
      methodology: `ensemble_${this.ensembleMethod}`,
      confidenceInterval: this.calculateEnsembleConfidenceInterval(predictions, finalPrediction)
    }
  }

  /**
   * 评估集成性能
   */
  async evaluate(testData: PredictionData): Promise<Record<string, number>> {
    const ensemblePredictions = await this.predict(testData)
    const actuals = testData.data.map(p => p.value)

    const predValues = Array.isArray(ensemblePredictions.prediction) ?
      ensemblePredictions.prediction : [ensemblePredictions.prediction]

    const ensembleMetrics = {
      mae: this.calculateMAE(actuals, predValues),
      rmse: this.calculateRMSE(actuals, predValues),
      mape: this.calculateMAPE(actuals, predValues),
      r2: this.calculateR2(actuals, predValues)
    }

    // 获取基础模型性能用于比较
    const baseModelMetrics: Record<string, number[]> = {}
    for (let i = 0; i < this.basePredictors.length; i++) {
      try {
        const metrics = await this.basePredictors[i].evaluate(testData)
        Object.keys(metrics).forEach(key => {
          if (!baseModelMetrics[key]) baseModelMetrics[key] = []
          baseModelMetrics[key].push(metrics[key])
        })
      } catch (error) {
        console.warn(`基础预测器 ${i} 评估失败:`, error)
      }
    }

    return {
      ...ensembleMetrics,
      ensembleGain: this.calculateEnsembleGain(ensembleMetrics, baseModelMetrics),
      diversity: this.calculatePredictionDiversity(),
      stability: this.calculateEnsembleStability()
    }
  }

  protected async trainMetaLearner(_data: PredictionData): Promise<void> {
    // 简化的元学习器训练
    // 在实际应用中，这里应该训练一个元模型来学习如何最佳地组合基础预测器
    console.log('训练元学习器...')
  }

  protected async metaLearnerPredict(basePredictions: (number | number[])[]): Promise<number | number[]> {
    // 简化的元学习器预测
    // 在实际应用中，这里应该使用训练好的元模型
    return this.weightedAverage(basePredictions)
  }

  private averagePredictions(predictions: (number | number[])[]): number | number[] {
    if (predictions.length === 0) return 0

    // 检查是否为多步预测
    if (Array.isArray(predictions[0])) {
      const horizon = predictions[0].length
      const result: number[] = new Array<number>(horizon).fill(0)

      for (let i = 0; i < horizon; i++) {
        let sum = 0
        for (const pred of predictions) {
          sum += (pred as number[])[i] || 0
        }
        result[i] = sum / predictions.length
      }

      return result
    } else {
      return predictions.reduce<number>((sum, pred) => sum + (pred as number), 0) / predictions.length
    }
  }

  private weightedAverage(predictions: (number | number[])[]): number | number[] {
    if (predictions.length === 0) return 0

    const normalizedWeights = this.normalizeWeights()

    // 检查是否为多步预测
    if (Array.isArray(predictions[0])) {
      const horizon = predictions[0].length
      const result: number[] = new Array<number>(horizon).fill(0)

      for (let i = 0; i < horizon; i++) {
        let sum = 0
        for (let j = 0; j < predictions.length; j++) {
          sum += ((predictions[j] as number[])[i] || 0) * normalizedWeights[j]
        }
        result[i] = sum
      }

      return result
    } else {
      return predictions.reduce<number>((sum, pred, i) => sum + (pred as number) * (normalizedWeights[i] ?? 0), 0)
    }
  }

  private votingPredictions(predictions: (number | number[])[]): number | number[] {
    // 对于数值预测，投票等同于平均
    return this.averagePredictions(predictions)
  }

  private normalizeWeights(): number[] {
    const sum = this.weights.reduce((a, b) => a + b, 0)
    return sum > 0 ? this.weights.map(w => w / sum) : this.weights.map(() => 1 / this.weights.length)
  }

  private calculateWeightedConfidence(confidences: number[]): number {
    const normalizedWeights = this.normalizeWeights()
    return confidences.reduce((sum, conf, i) => sum + conf * normalizedWeights[i], 0)
  }

  private calculateVotingConfidence(predictions: (number | number[])[], confidences: number[]): number {
    // 简化的投票置信度计算
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
  }

  private calculateEnsembleConfidenceInterval(
    predictions: (number | number[])[],
    finalPrediction: number | number[]
  ): Array<{ lower: number; upper: number }> | undefined {
    // 简化的集成置信区间计算
    if (Array.isArray(finalPrediction)) {
      return finalPrediction.map(p => ({ lower: p * 0.95, upper: p * 1.05 }))
    } else {
      return [{ lower: finalPrediction * 0.95, upper: finalPrediction * 1.05 }]
    }
  }

  private calculateEnsembleFeatureImportance(trainingResults: TrainingResult[]): Record<string, number> {
    const importanceMaps = trainingResults
      .map(r => r.featureImportance)
      .filter((m): m is Record<string, number> => m !== undefined && m !== null)

    if (importanceMaps.length === 0) return {}

    const ensembleImportance: Record<string, number> = {}

    // 聚合所有基础模型的特征重要性
    importanceMaps.forEach(importance => {
      Object.keys(importance).forEach(feature => {
        if (!ensembleImportance[feature]) ensembleImportance[feature] = 0
        ensembleImportance[feature] += importance[feature] ?? 0
      })
    })

    // 平均化
    Object.keys(ensembleImportance).forEach(feature => {
      ensembleImportance[feature] /= importanceMaps.length
    })

    return ensembleImportance
  }

  private async calculateOptimalWeights(trainingResults: TrainingResult[]): Promise<void> {
    if (trainingResults.length === 0) return

    // 基于训练性能计算权重
    const scores = trainingResults.map(r => r.trainingScore)
    const totalScore = scores.reduce((sum, score) => sum + score, 0)

    this.weights = scores.map(score => score / totalScore)
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

  private calculateEnsembleGain(ensembleMetrics: Record<string, number>, baseModelMetrics: Record<string, number[]>): number {
    // 计算集成相比基础模型的性能提升
    const ensembleR2 = ensembleMetrics.r2 || 0
    const avgBaseR2 = baseModelMetrics.r2 ?
      baseModelMetrics.r2.reduce((a, b) => a + b, 0) / baseModelMetrics.r2.length : 0

    return Math.max(0, ensembleR2 - avgBaseR2)
  }

  private calculatePredictionDiversity(): number {
    // 计算基础预测器之间的多样性
    // 简化实现，实际应用中应该使用更复杂的多样性度量
    return 0.5
  }

  private calculateEnsembleStability(): number {
    // 计算集成的稳定性
    // 简化实现，实际应用中应该基于历史性能计算
    return 0.8
  }
}

/**
 * 自适应集成引擎
 */
export class AdaptiveEnsemble extends EnsembleEngine {
  private adaptationThreshold: number = 0.1
  private driftDetector: DriftDetector = new DriftDetector()

  constructor(config: PredictorConfig) {
    super(config)
    this.adaptationThreshold = Number(config.parameters.adaptationThreshold) || 0.1
  }

  /**
   * 自适应权重调整
   */
  async adaptEnsembleWeights(
    performanceHistory: PerformanceHistory[],
    dataDrift: DataDriftMetrics
  ): Promise<UpdatedWeights> {
    const _startTime = Date.now()

    // 基于性能历史调整权重
    const recentPerformance = this.getRecentPerformance(performanceHistory, 5)
    const oldWeights = [...this.weights]

    // 计算新的权重
    const newWeights = this.calculateAdaptiveWeights(recentPerformance, dataDrift)

    // 应用权重
    this.weights = newWeights

    // 检测是否显著变化
    const weightChange = this.calculateWeightChange(oldWeights, newWeights)
    const performanceGain = this.calculatePerformanceGain(recentPerformance)

    return {
      weights: newWeights,
      adaptationReason: this.generateAdaptationReason(weightChange, dataDrift, performanceGain),
      performanceGain,
      timestamp: Date.now()
    }
  }

  /**
   * 概念漂移检测
   */
  async detectConceptDrift(data: PredictionData): Promise<DriftDetection> {
    return this.driftDetector.detect(data)
  }

  private getRecentPerformance(performanceHistory: PerformanceHistory[], windowSize: number): PerformanceHistory[] {
    return performanceHistory.slice(-windowSize)
  }

  private calculateAdaptiveWeights(
    recentPerformance: PerformanceHistory[],
    dataDrift: DataDriftMetrics
  ): number[] {
    if (recentPerformance.length === 0) {
      return this.weights.map(() => 1 / this.weights.length)
    }

    // 基于准确性和稳定性计算权重
    const scores = recentPerformance.map(perf => {
      const accuracyScore = perf.accuracy || 0
      const stabilityScore = 1 - (perf.errorRate || 0)
      const latencyScore = 1 - Math.min((perf.latency || 0) / 1000, 1) // 1秒内为满分

      return accuracyScore * 0.5 + stabilityScore * 0.3 + latencyScore * 0.2
    })

    // 考虑数据漂移的影响
    const driftPenalty = dataDrift.severity === 'high' ? 0.8 :
      dataDrift.severity === 'medium' ? 0.9 : 1.0

    const adjustedScores = scores.map(score => score * driftPenalty)

    // 归一化为权重
    const totalScore = adjustedScores.reduce((sum, score) => sum + score, 0)
    return totalScore > 0 ? adjustedScores.map(score => score / totalScore) :
      adjustedScores.map(() => 1 / adjustedScores.length)
  }

  private calculateWeightChange(oldWeights: number[], newWeights: number[]): number {
    if (oldWeights.length !== newWeights.length) return 1

    const totalChange = oldWeights.reduce((sum, oldWeight, i) =>
      sum + Math.abs(oldWeight - newWeights[i]), 0)

    return totalChange / oldWeights.length
  }

  private calculatePerformanceGain(recentPerformance: PerformanceHistory[]): number {
    if (recentPerformance.length < 2) return 0

    const firstHalf = recentPerformance.slice(0, Math.floor(recentPerformance.length / 2))
    const secondHalf = recentPerformance.slice(Math.floor(recentPerformance.length / 2))

    const firstAvgAccuracy = firstHalf.reduce((sum, perf) => sum + (perf.accuracy || 0), 0) / firstHalf.length
    const secondAvgAccuracy = secondHalf.reduce((sum, perf) => sum + (perf.accuracy || 0), 0) / secondHalf.length

    return secondAvgAccuracy - firstAvgAccuracy
  }

  private generateAdaptationReason(
    weightChange: number,
    dataDrift: DataDriftMetrics,
    performanceGain: number
  ): string {
    const reasons: string[] = []

    if (weightChange > this.adaptationThreshold) {
      reasons.push(`权重显著变化 (${(weightChange * 100).toFixed(1)}%)`)
    }

    if (dataDrift.severity !== 'low') {
      reasons.push(`检测到${dataDrift.severity}级别的数据漂移`)
    }

    if (performanceGain > 0) {
      reasons.push(`性能提升 ${(performanceGain * 100).toFixed(1)}%`)
    } else if (performanceGain < 0) {
      reasons.push(`性能下降 ${Math.abs(performanceGain * 100).toFixed(1)}%`)
    }

    return reasons.length > 0 ? reasons.join('; ') : '定期权重调整'
  }
}

/**
 * 简化的漂移检测器
 */
class DriftDetector {
  private baseline: number[] = []
  private detectionWindow: number = 30

  async detect(data: PredictionData): Promise<DriftDetection> {
    const values = data.data.map(p => p.value)

    if (this.baseline.length === 0) {
      this.baseline = values.slice(-this.detectionWindow)
      return {
        detected: false,
        driftType: 'none',
        driftMagnitude: 0,
        pValue: 1,
        detectionMethod: 'baseline_initialization',
        confidenceInterval: []
      }
    }

    // 简化的漂移检测
    const recentValues = values.slice(-this.detectionWindow)
    const baselineStats = this.calculateStatistics(this.baseline)
    const recentStats = this.calculateStatistics(recentValues)

    const meanShift = Math.abs(recentStats.mean - baselineStats.mean)
    const stdShift = Math.abs(recentStats.std - baselineStats.std)
    const driftMagnitude = (meanShift + stdShift) / 2

    const detected = driftMagnitude > baselineStats.std * 0.5
    const driftType = this.classifyDriftType(meanShift, stdShift)

    return {
      detected,
      driftType,
      driftMagnitude,
      pValue: Math.max(0, 1 - driftMagnitude),
      detectionMethod: 'statistical_comparison',
      confidenceInterval: [
        baselineStats.mean - 1.96 * baselineStats.std,
        baselineStats.mean + 1.96 * baselineStats.std
      ]
    }
  }

  private calculateStatistics(values: number[]): { mean: number; std: number } {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const std = Math.sqrt(variance)

    return { mean, std }
  }

  private classifyDriftType(meanShift: number, stdShift: number): 'sudden' | 'gradual' | 'incremental' | 'recurring' {
    if (meanShift > stdShift * 2) return 'sudden'
    if (stdShift > meanShift * 2) return 'gradual'
    if (meanShift > 0 && stdShift > 0) return 'incremental'
    return 'recurring'
  }
}
