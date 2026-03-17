import { formatPercent, formatSignedPercent } from './formatters'
import type {
  Audience,
  Experiment,
  ExperimentDraft,
  ExperimentDraftVariant,
  ExperimentStatus,
  ExperimentType,
  Variant,
} from '../types/experiment'

export interface ResultsDecisionSummary {
  recommendedWinner: string
  strongestMetric: string
  bestPattern: string
  nextAction: string
}

export const experimentsStorageKey = 'personalization-admin-experiments'

const defaultBuilderVariants: ExperimentDraftVariant[] = [
  {
    id: 'control',
    name: 'Control',
    headline: 'Personalization that scales',
    ctaText: 'Book a demo',
    theme: 'Core brand',
    notes: 'Baseline message used for current production traffic.',
  },
  {
    id: 'variant-a',
    name: 'Variant A',
    headline: 'Personalization for priority audiences',
    ctaText: 'See personalized experience',
    theme: 'Audience-specific treatment',
    notes: 'Primary challenger for the first launch.',
  },
]

const experimentStatuses: ExperimentStatus[] = [
  'Draft',
  'Running',
  'Paused',
  'Completed',
]
const experimentTypes: ExperimentType[] = [
  'A/B Test',
  'Feature Experiment',
  'Personalization',
]

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number'

const isVariantConfig = (value: unknown): value is Variant['config'] =>
  isObject(value) &&
  isString(value.headline) &&
  isString(value.bodyCopy) &&
  isString(value.ctaLabel) &&
  isString(value.placement) &&
  isString(value.theme)

const isVariant = (value: unknown): value is Variant =>
  isObject(value) &&
  isString(value.id) &&
  isString(value.name) &&
  isNumber(value.allocation) &&
  isNumber(value.visitors) &&
  isNumber(value.conversions) &&
  isString(value.description) &&
  typeof value.isControl === 'boolean' &&
  isVariantConfig(value.config)

const isSegmentPerformancePoint = (
  value: unknown,
): value is Experiment['segmentPerformance'][number] =>
  isObject(value) &&
  isString(value.id) &&
  isString(value.segmentName) &&
  isNumber(value.visitors) &&
  isNumber(value.conversionRate) &&
  isNumber(value.lift)

const isMetricTrendPoint = (
  value: unknown,
): value is Experiment['metricTrend'][number] =>
  isObject(value) && isString(value.date) && isNumber(value.value)

const isExperiment = (value: unknown): value is Experiment =>
  isObject(value) &&
  isString(value.id) &&
  isString(value.name) &&
  isString(value.page) &&
  isString(value.audienceName) &&
  isString(value.hypothesis) &&
  isString(value.primaryMetric) &&
  isString(value.owner) &&
  isString(value.audienceId) &&
  isString(value.startDate) &&
  isString(value.endDate) &&
  experimentStatuses.includes(value.status as ExperimentStatus) &&
  experimentTypes.includes(value.type as ExperimentType) &&
  Array.isArray(value.variants) &&
  value.variants.every(isVariant) &&
  isObject(value.results) &&
  isNumber(value.results.conversionRate) &&
  isNumber(value.results.lift) &&
  isNumber(value.results.confidence) &&
  isNumber(value.results.revenueImpact) &&
  Array.isArray(value.segmentPerformance) &&
  value.segmentPerformance.every(isSegmentPerformancePoint) &&
  Array.isArray(value.metricTrend) &&
  value.metricTrend.every(isMetricTrendPoint)

export const buildExperimentPageUrl = (page: string) => {
  const slug = page.toLowerCase().replace(/\s+/g, '-')
  return `https://app.acme-personalize.com/${slug}`
}

const createExperimentId = (name: string) => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `exp-${slug || 'untitled'}-${Date.now()}`
}

const createVariantId = (experimentId: string, variantId: string) =>
  `${experimentId}-${variantId}`

export const getVariantConversionRate = (variant: Variant) =>
  variant.visitors === 0 ? 0 : variant.conversions / variant.visitors

export const getTotalTrafficAllocation = (variants: Variant[]) =>
  variants.reduce((total, variant) => total + variant.allocation, 0)

export const createExperimentDraft = (
  audiences: Audience[],
): ExperimentDraft => ({
  experimentName: '',
  pageUrl: '',
  experimentType: 'A/B Test',
  primaryMetric: '',
  audienceId: audiences[0]?.id ?? '',
  trafficAllocation: 100,
  status: 'Draft',
  variants: defaultBuilderVariants.map((variant) => ({ ...variant })),
})

export const loadExperiments = (fallbackExperiments: Experiment[]): Experiment[] => {
  if (typeof window === 'undefined') {
    return fallbackExperiments
  }

  const storedExperiments = window.localStorage.getItem(experimentsStorageKey)

  if (!storedExperiments) {
    return fallbackExperiments
  }

  try {
    const parsed: unknown = JSON.parse(storedExperiments)

    if (Array.isArray(parsed) && parsed.every(isExperiment)) {
      return parsed
    }
  } catch {
    return fallbackExperiments
  }

  return fallbackExperiments
}

export const saveExperiments = (experiments: Experiment[]) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(experimentsStorageKey, JSON.stringify(experiments))
}

export const buildExperimentFromDraft = (
  draft: ExperimentDraft,
  audiences: Audience[],
): Experiment => {
  const experimentId = createExperimentId(draft.experimentName)
  const selectedAudience = audiences.find(({ id }) => id === draft.audienceId)
  const controlAllocation = Math.floor(draft.trafficAllocation / 2)
  const variantAllocation = draft.trafficAllocation - controlAllocation
  const today = new Date().toISOString().slice(0, 10)

  return {
    id: experimentId,
    name: draft.experimentName.trim() || 'Untitled experiment',
    page: draft.pageUrl.trim() || '/*',
    audienceName: selectedAudience?.name ?? 'Unassigned audience',
    status: draft.status,
    type: draft.experimentType,
    hypothesis: 'New builder draft experiment.',
    primaryMetric: draft.primaryMetric.trim() || 'Primary conversion',
    owner: 'Builder user',
    audienceId: draft.audienceId,
    startDate: today,
    endDate: '',
    variants: draft.variants.map((variant, index) => ({
      id: createVariantId(experimentId, variant.id),
      name: variant.name,
      allocation: index === 0 ? controlAllocation : variantAllocation,
      visitors: 0,
      conversions: 0,
      description: variant.notes.trim() || `${variant.name} draft configuration.`,
      isControl: index === 0,
      config: {
        headline: variant.headline.trim(),
        bodyCopy: variant.notes.trim(),
        ctaLabel: variant.ctaText.trim(),
        placement: draft.pageUrl.trim() || '/*',
        theme: variant.theme.trim(),
      },
    })),
    results: {
      conversionRate: 0,
      lift: 0,
      confidence: 0,
      revenueImpact: 0,
    },
    segmentPerformance: [],
    metricTrend: [],
  }
}

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
  if (experiment.variants.length === 0 || experiment.segmentPerformance.length === 0) {
    return {
      recommendedWinner: 'No winner yet',
      strongestMetric: `${experiment.primaryMetric} awaiting traffic`,
      bestPattern: 'Segment insights will appear after results arrive.',
      nextAction: 'Launch traffic to start collecting performance data.',
    }
  }

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


