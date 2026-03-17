export type ExperimentStatus = 'Draft' | 'Running' | 'Paused' | 'Completed'

export type ExperimentType =
  | 'A/B Test'
  | 'Feature Experiment'
  | 'Personalization'

export interface VariantConfig {
  headline: string
  bodyCopy: string
  ctaLabel: string
  placement: string
  theme: string
}

export interface Variant {
  id: string
  name: string
  allocation: number
  visitors: number
  conversions: number
  description: string
  isControl: boolean
  config: VariantConfig
}

export interface AudienceRule {
  id: string
  field: string
  operator:
    | 'is'
    | 'is not'
    | 'contains'
    | 'is one of'
    | '>='
    | '<='
    | 'within'
  value: string
}

export interface Audience {
  id: string
  name: string
  description: string
  size: number
  lastUpdated: string
  rules: AudienceRule[]
}

export interface SegmentPerformancePoint {
  id: string
  segmentName: string
  visitors: number
  conversionRate: number
  lift: number
}

export interface MetricTrendPoint {
  date: string
  value: number
}

export interface Experiment {
  id: string
  name: string
  page: string
  audienceName: string
  status: ExperimentStatus
  type: ExperimentType
  hypothesis: string
  primaryMetric: string
  owner: string
  audienceId: string
  startDate: string
  endDate: string
  variants: Variant[]
  results: {
    conversionRate: number
    lift: number
    confidence: number
    revenueImpact: number
  }
  segmentPerformance: SegmentPerformancePoint[]
  metricTrend: MetricTrendPoint[]
}
