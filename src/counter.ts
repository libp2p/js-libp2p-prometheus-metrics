import type { Counter, CalculatedMetricOptions, CalculateMetric } from '@libp2p/interface-metrics'
import { CollectFunction, Counter as PromCounter } from 'prom-client'
import { CalculatedMetric, normaliseString } from './utils.js'

export class PrometheusCounter implements Counter, CalculatedMetric {
  private readonly counter: PromCounter
  private readonly calculators: CalculateMetric[]

  constructor (name: string, opts: CalculatedMetricOptions) {
    name = normaliseString(name)
    const help = normaliseString(opts.help ?? name)
    const labels = opts.label != null ? [normaliseString(opts.label)] : []
    let collect: CollectFunction<PromCounter<any>> | undefined
    this.calculators = []

    // calculated metric
    if (opts?.calculate != null) {
      this.calculators.push(opts.calculate)
      const self = this

      collect = async function () {
        const values = await Promise.all(self.calculators.map(async calculate => await calculate()))
        const sum = values.reduce((acc, curr) => acc + curr, 0)

        this.inc(sum)
      }
    }

    this.counter = new PromCounter({
      name,
      help,
      labelNames: labels,
      collect
    })
  }

  addCalculator (calculator: CalculateMetric) {
    this.calculators.push(calculator)
  }

  increment (value: number = 1): void {
    this.counter.inc(value)
  }

  reset (): void {
    this.counter.reset()
  }
}
