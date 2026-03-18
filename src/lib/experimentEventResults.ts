import { getVariantConversionRate } from './experiments'
import type { Experiment, ExperimentEvent, MetricTrendPoint, Variant } from '../types/experiment'

const getUniqueUserCount = (
  events: ExperimentEvent[],
  eventType: ExperimentEvent['eventType'],
) => new Set(events.filter((event) => event.eventType === eventType).map((event) => event.userKey)).size

const getExperimentEvents = (events: ExperimentEvent[], experimentId: string) =>
  events.filter((event) => event.experimentId === experimentId)

const buildVariantResults = (
  variants: Variant[],
  events: ExperimentEvent[],
): Variant[] =>
  variants.map((variant) => {
    const variantEvents = events.filter((event) => event.variantId === variant.id)

    return {
      ...variant,
      visitors: getUniqueUserCount(variantEvents, 'impression'),
      conversions: getUniqueUserCount(variantEvents, 'conversion'),
    }
  })

const buildMetricTrendFromEvents = (events: ExperimentEvent[]): MetricTrendPoint[] => {
  const sortedDates = Array.from(
    new Set(events.map((event) => event.timestamp.slice(0, 10))),
  ).sort((left, right) => left.localeCompare(right))

  const cumulativeVisitors = new Set<string>()
  const cumulativeConversions = new Set<string>()

  return sortedDates.map((date) => {
    const dailyEvents = events.filter((event) => event.timestamp.slice(0, 10) === date)

    for (const event of dailyEvents) {
      if (event.eventType === 'impression') {
        cumulativeVisitors.add(event.userKey)
      }

      if (event.eventType === 'conversion') {
        cumulativeConversions.add(event.userKey)
      }
    }

    return {
      date,
      value:
        cumulativeVisitors.size === 0
          ? 0
          : cumulativeConversions.size / cumulativeVisitors.size,
    }
  })
}

const buildExperimentLift = (variants: Variant[]) => {
  const controlVariant = variants.find((variant) => variant.isControl) ?? variants[0]

  if (!controlVariant) {
    return 0
  }

  const controlRate = getVariantConversionRate(controlVariant)
  const challengerRate = variants
    .filter((variant) => !variant.isControl)
    .reduce(
      (bestRate, variant) => Math.max(bestRate, getVariantConversionRate(variant)),
      controlRate,
    )

  return challengerRate - controlRate
}

export const buildExperimentWithEventResults = (
  experiment: Experiment,
  events: ExperimentEvent[],
): Experiment => {
  const experimentEvents = getExperimentEvents(events, experiment.id)

  if (experimentEvents.length === 0) {
    return experiment
  }

  const variants = buildVariantResults(experiment.variants, experimentEvents)
  const visitors = variants.reduce((total, variant) => total + variant.visitors, 0)
  const conversions = variants.reduce((total, variant) => total + variant.conversions, 0)

  return {
    ...experiment,
    variants,
    results: {
      ...experiment.results,
      conversionRate: visitors === 0 ? 0 : conversions / visitors,
      lift: buildExperimentLift(variants),
    },
    segmentPerformance: [],
    metricTrend: buildMetricTrendFromEvents(experimentEvents),
  }
}
