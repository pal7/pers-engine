import { formatPercent, formatSignedPercent } from './formatters'
import {
  buildWeightedAllocations,
  getVariantWeightDistribution,
} from './variantWeights'
import type {
  Audience,
  Experiment,
  ExperimentDraft,
  ExperimentDraftVariant,
  ExperimentStatus,
  ExperimentType,
  TargetMatchType,
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
    weight: 50,
    headline: 'Personalization that scales',
    ctaText: 'Book a demo',
    theme: 'Core brand',
    notes: 'Baseline message used for current production traffic.',
  },
  {
    id: 'variant-a',
    name: 'Variant A',
    weight: 50,
    headline: 'Personalization for priority audiences',
    ctaText: 'See personalized experience',
    theme: 'Audience-specific treatment',
    notes: 'Primary challenger for the first launch.',
  },
]

const experimentStatuses: ExperimentStatus[] = [
  'draft',
  'running',
  'paused',
  'completed',
]
const experimentTypes: ExperimentType[] = [
  'A/B Test',
  'Feature Experiment',
  'Personalization',
]
const targetMatchTypes: TargetMatchType[] = ['exact', 'startsWith']

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

type StoredVariantBase = Omit<Variant, 'weight'>

const isStoredVariantBase = (value: unknown): value is StoredVariantBase =>
  isObject(value) &&
  isString(value.id) &&
  isString(value.name) &&
  isNumber(value.allocation) &&
  isNumber(value.visitors) &&
  isNumber(value.conversions) &&
  isString(value.description) &&
  typeof value.isControl === 'boolean' &&
  isVariantConfig(value.config)

const normalizeStoredVariant = (value: unknown): Variant | null => {
  if (!isStoredVariantBase(value)) {
    return null
  }

  const storedVariant = value as StoredVariantBase & {
    weight?: unknown
  }

  return {
    ...storedVariant,
    weight:
      isNumber(storedVariant.weight) && storedVariant.weight > 0
        ? storedVariant.weight
        : storedVariant.allocation > 0
          ? storedVariant.allocation
          : 1,
  }
}

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

const isTargetMatchType = (value: unknown): value is TargetMatchType =>
  targetMatchTypes.includes(value as TargetMatchType)

export const normalizeExperimentStatus = (
  value: unknown,
): ExperimentStatus | null => {
  if (!isString(value)) {
    return null
  }

  const normalizedValue = value.trim().toLowerCase()

  return experimentStatuses.includes(normalizedValue as ExperimentStatus)
    ? (normalizedValue as ExperimentStatus)
    : null
}

export const formatExperimentStatus = (status: ExperimentStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1)

const normalizeStoredExperiment = (value: unknown): Experiment | null => {
  if (!isObject(value)) {
    return null
  }

  const normalizedVariants = Array.isArray(value.variants)
    ? value.variants.map(normalizeStoredVariant)
    : []
  const normalizedStatus = normalizeExperimentStatus(value.status)

  if (
    !isString(value.id) ||
    !isString(value.name) ||
    !isString(value.page) ||
    !isString(value.audienceName) ||
    !isString(value.hypothesis) ||
    !isString(value.primaryMetric) ||
    !isString(value.owner) ||
    !isString(value.audienceId) ||
    !isString(value.startDate) ||
    !isString(value.endDate) ||
    normalizedStatus === null ||
    !experimentTypes.includes(value.type as ExperimentType) ||
    normalizedVariants.length === 0 ||
    normalizedVariants.some((variant) => variant === null) ||
    !isObject(value.results) ||
    !isNumber(value.results.conversionRate) ||
    !isNumber(value.results.lift) ||
    !isNumber(value.results.confidence) ||
    !isNumber(value.results.revenueImpact) ||
    !Array.isArray(value.segmentPerformance) ||
    !value.segmentPerformance.every(isSegmentPerformancePoint) ||
    !Array.isArray(value.metricTrend) ||
    !value.metricTrend.every(isMetricTrendPoint)
  ) {
    return null
  }

  const targetMatchType = isTargetMatchType(value.targetMatchType)
    ? value.targetMatchType
    : 'exact'
  const targetUrlPattern =
    isString(value.targetUrlPattern) && value.targetUrlPattern.trim().length > 0
      ? value.targetUrlPattern
      : value.page

  return {
    id: value.id,
    name: value.name,
    page: value.page,
    targetMatchType,
    targetUrlPattern,
    audienceName: value.audienceName,
    status: normalizedStatus,
    type: value.type as ExperimentType,
    hypothesis: value.hypothesis,
    primaryMetric: value.primaryMetric,
    owner: value.owner,
    audienceId: value.audienceId,
    startDate: value.startDate,
    endDate: value.endDate,
    variants: normalizedVariants.filter((variant): variant is Variant => variant !== null),
    results: {
      conversionRate: value.results.conversionRate,
      lift: value.results.lift,
      confidence: value.results.confidence,
      revenueImpact: value.results.revenueImpact,
    },
    segmentPerformance: value.segmentPerformance,
    metricTrend: value.metricTrend,
  }
}

export const buildExperimentPageUrl = (page: string) => {
  const slug = page.toLowerCase().replace(/\s+/g, '-')
  return `https://app.acme-personalize.com/${slug}`
}

export const formatTargetMatchType = (matchType: TargetMatchType) =>
  matchType === 'exact' ? 'Exact path' : 'Starts with'

export const buildExperimentPageLabel = (targetUrlPattern: string) => {
  const trimmedPattern = targetUrlPattern.trim()

  if (!trimmedPattern) {
    return '/*'
  }

  try {
    const url = new URL(trimmedPattern)

    return url.pathname || '/'
  } catch {
    return trimmedPattern
  }
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
  targetMatchType: 'exact',
  targetUrlPattern: '',
  experimentType: 'A/B Test',
  primaryMetric: '',
  audienceId: audiences[0]?.id ?? '',
  trafficAllocation: 100,
  status: 'draft',
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

    if (!Array.isArray(parsed)) {
      return fallbackExperiments
    }

    const normalizedExperiments = parsed.map(normalizeStoredExperiment)

    if (normalizedExperiments.every((experiment) => experiment !== null)) {
      return normalizedExperiments
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
  const today = new Date().toISOString().slice(0, 10)
  const targetUrlPattern = draft.targetUrlPattern.trim() || '/'
  const weightDistribution = getVariantWeightDistribution(draft.variants)
  const allocations = buildWeightedAllocations(
    draft.trafficAllocation,
    weightDistribution.normalizedWeights,
  )

  return {
    id: experimentId,
    name: draft.experimentName.trim() || 'Untitled experiment',
    page: buildExperimentPageLabel(targetUrlPattern),
    targetMatchType: draft.targetMatchType,
    targetUrlPattern,
    audienceName: selectedAudience?.name ?? 'Unassigned audience',
    status: draft.status,
    type: draft.experimentType,
    hypothesis: weightDistribution.isValid
      ? 'New builder draft experiment.'
      : 'New builder draft experiment using fallback even variant weighting.',
    primaryMetric: draft.primaryMetric.trim() || 'Primary conversion',
    owner: 'Builder user',
    audienceId: draft.audienceId,
    startDate: today,
    endDate: '',
    variants: draft.variants.map((variant, index) => ({
      id: createVariantId(experimentId, variant.id),
      name: variant.name,
      allocation: allocations[index] ?? 0,
      weight: variant.weight,
      visitors: 0,
      conversions: 0,
      description: variant.notes.trim() || `${variant.name} draft configuration.`,
      isControl: index === 0,
      config: {
        headline: variant.headline.trim(),
        bodyCopy: variant.notes.trim(),
        ctaLabel: variant.ctaText.trim(),
        placement: targetUrlPattern,
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

