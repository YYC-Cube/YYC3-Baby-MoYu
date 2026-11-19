/**
 * 预测引擎单元测试（lib/prediction）
 * 覆盖：BasePredictor 统计与预处理能力、TimeSeriesEngine 训练/预测/季节性/不确定性、
 *   AnomalyDetectionEngine 的 zscore/iqr 检测与解释、CausalInferenceEngine 的因果图与反事实模拟。
 * 说明：引擎为纯统计实现，直接断言行为与数值边界，不做 mock。
 */

import { describe, expect, test } from "bun:test"
import type {
  PredictionData,
  PredictionResult,
  PredictorConfig,
  TrainingResult,
} from "@/types/prediction/common"
import { BasePredictor } from "@/lib/prediction/base-predictor"
import {
  AnomalyDetectionEngine,
  CausalInferenceEngine,
  TimeSeriesEngine,
} from "@/lib/prediction/specialized-engines"

const DAY = 86_400_000
const START = Date.UTC(2026, 0, 1)

const makeConfig = (algorithm: string, parameters: Record<string, unknown> = {}): PredictorConfig => ({
  name: "unit-test",
  algorithm,
  parameters,
})

const makeData = (values: number[]): PredictionData => ({
  data: values.map((value, i) => ({ timestamp: START + i * DAY, value })),
  dataType: "timeseries",
})

const trend = (n: number) => Array.from({ length: n }, (_, i) => 60 + i * 2)

/** 暴露 protected 能力的探针预测器，用于验证基类通用逻辑 */
class ProbePredictor extends BasePredictor {
  async train(): Promise<TrainingResult> {
    this.isTrained = true
    return {
      modelId: this.modelId,
      algorithm: this.config.algorithm,
      parameters: this.config.parameters,
      trainingTime: 0,
      trainingScore: 1,
      validationScore: 1,
      timestamp: Date.now(),
    }
  }

  async predict(): Promise<PredictionResult> {
    return { id: this.generatePredictionId(), prediction: 0, confidence: 1, timestamp: Date.now() }
  }

  async evaluate(): Promise<Record<string, number>> {
    return {}
  }

  mean(values: number[]): number {
    return this.calculateMean(values)
  }

  median(values: number[]): number {
    return this.calculateMedian(values)
  }

  std(values: number[]): number {
    return this.calculateStandardDeviation(values)
  }

  clean(data: PredictionData): PredictionData {
    return this.preprocessData(data)
  }

  features(data: PredictionData) {
    return this.extractFeatures(data)
  }

  newId(): string {
    return this.generatePredictionId()
  }

  spawn(config: PredictorConfig): BasePredictor {
    return this.createInstance(config)
  }

  space(): Record<string, unknown> {
    return this.getSearchSpace()
  }
}

describe("BasePredictor 通用能力", () => {
  const probe = new ProbePredictor(makeConfig("probe"))

  test("均值/中位数/标准差的边界行为", () => {
    expect(probe.mean([])).toBe(0)
    expect(probe.mean([2, 4, 6])).toBe(4)
    expect(probe.median([])).toBe(0)
    expect(probe.median([3, 1, 2])).toBe(2)
    expect(probe.median([4, 1, 3, 2])).toBeCloseTo(2.5, 6)
    expect(probe.std([5])).toBe(0)
    expect(probe.std([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.1381, 3)
  })

  test("预处理过滤 NaN/Infinity/空值，全部非法时回退原数据", () => {
    const dirty: PredictionData = {
      dataType: "timeseries",
      data: [
        { timestamp: 1, value: 1 },
        { timestamp: 2, value: Number.NaN },
        { timestamp: 3, value: 3 },
        { timestamp: 4, value: Number.POSITIVE_INFINITY },
      ],
    }
    expect(probe.clean(dirty).data.map((p) => p.value)).toEqual([1, 3])

    const allInvalid: PredictionData = {
      dataType: "timeseries",
      data: [{ timestamp: 1, value: Number.NaN }],
    }
    expect(probe.clean(allInvalid).data).toHaveLength(1)
  })

  test("特征工程：显式声明优先，未声明时从首个点位推导，权重均分", async () => {
    const explicit = await probe.features({ ...makeData([1, 2]), features: ["a", "b"] })
    expect(explicit.names).toEqual(["a", "b"])
    expect(explicit.importance.a).toBeCloseTo(0.5, 6)

    const derived = await probe.features({
      dataType: "timeseries",
      data: [{ timestamp: 1, value: 1, features: { x: 1, y: 2 } }],
    })
    expect(derived.names).toEqual(["x", "y"])

    const empty = await probe.features(makeData([1]))
    expect(empty.names).toEqual([])
    expect(empty.importance).toEqual({})
  })

  test("模型信息、预测 ID 格式与默认钩子", async () => {
    const info = probe.getModelInfo()
    expect(info.algorithm).toBe("probe")
    expect(info.isTrained).toBe(false)
    expect(info.modelId).toMatch(/^predictor-[a-z0-9]+-[a-z0-9]+$/)
    expect(probe.newId()).toMatch(/^pred-[a-z0-9]+-[a-z0-9]+$/)
    expect(probe.space()).toEqual({})
    expect(() => probe.spawn(makeConfig("probe"))).toThrow("子类未实现 createInstance")
  })
})

describe("TimeSeriesEngine", () => {
  test("未训练时预测应报错", async () => {
    const engine = new TimeSeriesEngine(makeConfig("exponential_smoothing"))
    await expect(engine.predict(makeData(trend(10)), 1)).rejects.toThrow("模型尚未训练")
  })

  test("训练产出评分与指标，默认参数生效", async () => {
    const engine = new TimeSeriesEngine(makeConfig("exponential_smoothing"))
    const result = await engine.train(makeData(trend(24)))

    expect(result.trainingScore).toBeGreaterThan(0)
    expect(result.trainingScore).toBeLessThanOrEqual(1)
    expect(result.parameters.windowSize).toBe(12)
    expect(result.trainingMetrics?.mae).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(result.trainingMetrics?.rmse)).toBe(true)
    expect(engine.getModelInfo().isTrained).toBe(true)
  })

  test("单步与多步预测返回置信区间", async () => {
    const engine = new TimeSeriesEngine(makeConfig("exponential_smoothing"))
    await engine.train(makeData(trend(24)))

    const one = await engine.predict(makeData(trend(24)), 1)
    expect(typeof one.prediction).toBe("number")
    expect(one.confidenceInterval).toHaveLength(1)
    expect(one.confidenceInterval?.[0].lower).toBeLessThan(one.confidenceInterval?.[0].upper ?? 0)

    const multi = await engine.predict(makeData(trend(24)), 5)
    expect(Array.isArray(multi.prediction)).toBe(true)
    expect(multi.prediction as number[]).toHaveLength(5)
    expect(multi.confidenceInterval).toHaveLength(5)
  })

  test("周期数据可识别季节性；数据不足时判定为无季节性", async () => {
    const engine = new TimeSeriesEngine(makeConfig("exponential_smoothing"))
    const periodic = makeData(Array.from({ length: 16 }, (_, i) => 10 + 5 * Math.sin((2 * Math.PI * i) / 7)))
    const analysis = await engine.detectSeasonality(periodic)
    expect(analysis.detected).toBe(true)
    expect(analysis.period).toBe(7)
    expect(analysis.type).toBe("weekly")

    const short = await engine.detectSeasonality(makeData([1, 2, 3]))
    expect(short.detected).toBe(false)
    expect(short.period).toBe(0)
    expect(short.type).toBe("none")
  })

  test("不确定性预测：区间随步数扩大", async () => {
    const engine = new TimeSeriesEngine(makeConfig("exponential_smoothing"))
    await engine.train(makeData(trend(20)))
    const forecast = await engine.forecastWithUncertainty(makeData(trend(20)), 3)

    expect(forecast.pointForecast).toHaveLength(3)
    expect(forecast.uncertainty).toHaveLength(3)
    expect(forecast.uncertainty[1]).toBeGreaterThan(forecast.uncertainty[0])
    expect(forecast.predictionIntervals[0].lower).toBeLessThan(forecast.predictionIntervals[0].upper)
    expect(forecast.distribution).toBe("normal")
  })

  test("评估返回 MAE/RMSE/MAPE/R2/Theil-U", async () => {
    const engine = new TimeSeriesEngine(makeConfig("exponential_smoothing"))
    await engine.train(makeData(trend(20)))
    const metrics = await engine.evaluate(makeData(trend(20)))

    for (const key of ["mae", "rmse", "mape", "r2", "theil_u"]) {
      expect(Number.isFinite(metrics[key])).toBe(true)
    }
    expect(metrics.mae).toBeGreaterThanOrEqual(0)
  })
})

describe("AnomalyDetectionEngine", () => {
  test("未训练时预测应报错", async () => {
    const engine = new AnomalyDetectionEngine(makeConfig("zscore"))
    await expect(engine.predict(makeData([1, 2]))).rejects.toThrow("模型尚未训练")
  })

  test("zscore 能检出突增点并给出严重度", async () => {
    const engine = new AnomalyDetectionEngine(makeConfig("zscore", { threshold: 2 }))
    await engine.train(makeData([10, 10, 10, 10, 10, 10]))
    const report = await engine.detectAnomalies(makeData([10, 10, 10, 10, 10, 100]))

    expect(report.detectionMethod).toBe("zscore")
    expect(report.totalCount).toBeGreaterThanOrEqual(1)
    // z≈2.24 → 严重度落 medium（阈值 3 才 high）
    expect(report.anomalies[0].severity).toBe("medium")
    expect(report.anomalies[0].type).toBe("spike")
  })

  test("iqr 方法在 IQR 为 0 时仍能识别离群点", async () => {
    const engine = new AnomalyDetectionEngine(makeConfig("anomaly", { method: "iqr" }))
    await engine.train(makeData([1, 1, 1, 1, 1, 1]))
    const report = await engine.detectAnomalies(makeData([1, 1, 1, 1, 1, 100]))

    expect(report.detectionMethod).toBe("iqr")
    expect(report.anomalies.some((a) => a.value === 100)).toBe(true)
  })

  test("未实现的方法不产生误报", async () => {
    const engine = new AnomalyDetectionEngine(makeConfig("anomaly", { method: "lof" }))
    await engine.train(makeData([1, 2, 3]))
    const report = await engine.detectAnomalies(makeData([1, 2, 1000]))
    expect(report.totalCount).toBe(0)
    expect(report.severity).toBe(0)
  })

  test("异常解释、贡献因素与处置建议", async () => {
    const engine = new AnomalyDetectionEngine(makeConfig("zscore", { threshold: 2 }))
    await engine.train(makeData([10, 10, 10, 10, 10, 10]))
    const report = await engine.detectAnomalies(makeData([10, 10, 10, 10, 10, 100]))
    const [explained] = await engine.explainAnomalies(report.anomalies)

    expect(explained.explanation).toContain("异常")
    expect(explained.contributingFactors.length).toBeGreaterThan(0)
    expect(explained.recommendedAction).toContain("监控")
    expect(explained.context).toHaveProperty("surroundingValues")
  })

  test("predict/evaluate 汇总异常数量与比例", async () => {
    const engine = new AnomalyDetectionEngine(makeConfig("zscore", { threshold: 2 }))
    await engine.train(makeData([10, 10, 10, 10, 10, 10]))
    const data = makeData([10, 10, 10, 10, 10, 100])

    const prediction = await engine.predict(data)
    expect(prediction.prediction).toBeGreaterThanOrEqual(1)
    expect(prediction.explanation).toContain("异常")

    const metrics = await engine.evaluate(data)
    expect(metrics.anomalyRate).toBeGreaterThan(0)
    expect(metrics.severity).toBeGreaterThan(0)
  })
})

describe("CausalInferenceEngine", () => {
  test("未训练时预测应报错，训练后可返回说明", async () => {
    const engine = new CausalInferenceEngine(makeConfig("causal"))
    await expect(engine.predict(makeData([1, 2]))).rejects.toThrow("模型尚未训练")

    await engine.train(makeData([1, 2]))
    const prediction = await engine.predict(makeData([1, 2]), 2)
    expect(prediction.prediction).toBe(0)
    expect(prediction.methodology).toBe("causal_inference")
    expect(prediction.horizon).toBe(2)
  })

  test("强相关特征生成因果边，常量特征不生成边", async () => {
    const engine = new CausalInferenceEngine(makeConfig("causal"))
    const correlated: PredictionData = {
      dataType: "timeseries",
      features: ["x", "flat"],
      data: Array.from({ length: 10 }, (_, i) => ({
        timestamp: START + i * DAY,
        value: i * 2,
        features: { x: i * 2, flat: 1 },
      })),
    }

    const graph = await engine.identifyCausalEffects(correlated)
    expect(graph.nodes).toEqual(["target", "x", "flat"])
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0].from).toBe("x")
    expect(graph.edges[0].weight).toBeCloseTo(1, 3)

    const noFeatures = await engine.identifyCausalEffects(makeData([1, 2]))
    expect(noFeatures.edges).toHaveLength(0)
  })

  test("干预模拟采用线性近似并给出假设", async () => {
    const engine = new CausalInferenceEngine(makeConfig("causal"))
    const result = await engine.simulateIntervention({ type: "increase", baselineValue: 10, magnitude: 0.2 })

    expect(result.baseline).toBe(10)
    expect(result.effectSize).toBeCloseTo(2, 6)
    expect(result.counterfactual).toBeCloseTo(12, 6)
    expect(result.assumptions).toHaveLength(3)

    const defaults = await engine.simulateIntervention({ type: "noop" })
    expect(defaults.baseline).toBe(0)
    expect(defaults.effectSize).toBe(0)
  })
})

describe("剩余分支收口", () => {
  test("季节性数据训练后预测会注入季节分量", async () => {
    const engine = new TimeSeriesEngine(makeConfig("exponential_smoothing"))
    // 两个完整 7 日周期的正弦序列：训练时识别 weekly 季节性
    const periodic = makeData(Array.from({ length: 16 }, (_, i) => 50 + 10 * Math.sin((2 * Math.PI * i) / 7)))
    await engine.train(periodic)

    const result = await engine.predict(periodic, 3)
    expect(Array.isArray(result.prediction)).toBe(true)
    // 季节分量非零时多步预测应产生非恒定序列（gamma=0.1 生效）
    const values = result.prediction as number[]
    expect(values.some((v, i) => i > 0 && v !== values[0])).toBe(true)
  })

  test("dip 型异常与解释分支（异常点置于序列中部，避开端点分类退化）", async () => {
    const engine = new AnomalyDetectionEngine(makeConfig("anomaly", { method: "zscore", threshold: 2 }))
    await engine.train(makeData([100, 100, 100, 100, 100, 100]))
    // 中部骤降：contextSize=min(5,3,2)=2 → dip 判定可达（端点会退化为 spike，属已知边界）
    const report = await engine.detectAnomalies(makeData([100, 100, 100, 1, 100, 100]))
    expect(report.totalCount).toBeGreaterThanOrEqual(1)
    expect(report.anomalies.some((a) => a.type === "dip")).toBe(true)

    const explanations = await engine.explainAnomalies(report.anomalies)
    for (const exp of explanations) {
      expect(exp.explanation.length).toBeGreaterThan(0)
      expect(exp.recommendedAction.length).toBeGreaterThan(0)
    }
  })

  test("引擎钩子：createInstance 复制实例与搜索空间形状", () => {
    class TsProbe extends TimeSeriesEngine {
      instance(config: PredictorConfig): BasePredictor {
        return this.createInstance(config)
      }
      space(): Record<string, unknown> {
        return this.getSearchSpace()
      }
    }
    const probe = new TsProbe(makeConfig("exponential_smoothing"))
    const cloned = probe.instance(makeConfig("exponential_smoothing", { alpha: 0.5 }))
    expect(cloned).toBeInstanceOf(TimeSeriesEngine)

    const space = probe.space() as Record<string, { type?: string }>
    expect(space.windowSize.type).toBe("range")
    expect(space.seasonalityPeriod).toEqual([7, 14, 30, 90, 365])

    class AnProbe extends AnomalyDetectionEngine {
      space(): Record<string, unknown> {
        return this.getSearchSpace()
      }
    }
    const anSpace = new AnProbe(makeConfig("anomaly")).space() as Record<string, { min?: number }>
    expect(anSpace.threshold.min).toBe(1.5)

    class CausalProbe extends CausalInferenceEngine {
      instance(config: PredictorConfig): BasePredictor {
        return this.createInstance(config)
      }
    }
    expect(new CausalProbe(makeConfig("causal")).instance(makeConfig("causal"))).toBeInstanceOf(CausalInferenceEngine)
  })
})
