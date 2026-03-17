import { formatPercent, formatSignedPercent } from './formatters'
import type { Experiment, Variant } from '../types/experiment'

export interface ResultsDecisionSummary {
  recommendedWinner: string
  strongestMetric: string
  bestPattern: string
  nextAction: string
}

export const buildExperimentPageUrl = (page: string) => {
  const slug = page.toLowerCase().replace(/\s+/g, '-')
  return `https://app.acme-personalize.com/${slug}`
}

export const getVariantConversionRate = (variant: Variant) =>
  variant.visitors === 0 ? 0 : variant.conversions / variant.visitors

export const getTotalTrafficAllocation = (variants: Variant[]) =>
  variants.reduce((total, variant) => total + variant.allocation, 0)

export const getLaunchReadinessLabel = (confidence: number) => {
  if (confidence >= 0.95) {
    return 'Ready to launch'
  }

  if (confidence >= 0.8) {
    return 'Monitor closely'
  }

  return 'Needs more data'
}

export const buildResultsDecisionSummary = (
  experiment: Experiment,
): ResultsDecisionSummary => {
  const recommendedWinner = experiment.variants.reduce((best, variant) =>
    getVariantConversionRate(variant) > getVariantConversionRate(best) ? variant : best,
  )
  const bestSegment = experiment.segmentPerformance.reduce((best, segment) =>
    segment.lift > best.lift ? segment : best,
  )

  return {
    recommendedWinner: recommendedWinner.name,
    strongestMetric: `${experiment.primaryMetric} at ${formatPercent(
      experiment.results.conversionRate,
    )}`,
    bestPattern: `${bestSegment.segmentName} shows ${formatSignedPercent(
      bestSegment.lift,
    )} lift`,
    nextAction:
      experiment.results.confidence >= 0.95
        ? 'Ship the winner to eligible traffic and monitor guardrails.'
        : experiment.results.confidence >= 0.85
          ? 'Keep the test running until the signal is stable across more sessions.'
          : 'Hold rollout and collect more traffic before making a launch decision.',
  }
}
