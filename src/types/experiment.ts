export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed'

export type ExperimentType =
  | 'A/B Test'
  | 'Feature Experiment'
  | 'Personalization'

export type TargetMatchType = 'exact' | 'startsWith'

export type ExperimentEventType = 'impression' | 'conversion'

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
  weight: number
  visitors: number
  conversions: number
  description: string
  isControl: boolean
  config: VariantConfig
}

export interface ExperimentDraftVariant {
  id: string
  name: string
  weight: number
  headline: string
  ctaText: string
  theme: string
  notes: string
}

export type AudienceRuleField = 'device' | 'country' | 'isReturningUser' | 'pageUrl'

export type AudienceRuleOperator = 'equals' | 'notEquals' | 'contains' | 'in'

export interface AudienceRule {
  id: string
  field: AudienceRuleField
  operator: AudienceRuleOperator
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

export interface ExperimentEvent {
  id: string
  experimentId: string
  variantId: string
  variantName: string
  userKey: string
  sessionId: string
  eventType: ExperimentEventType
  pageUrl: string
  timestamp: string
}

export interface Experiment {
  id: string
  name: string
  page: string
  targetMatchType: TargetMatchType
  targetUrlPattern: string
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

export interface ExperimentDraft {
  experimentName: string
  targetMatchType: TargetMatchType
  targetUrlPattern: string
  experimentType: ExperimentType
  primaryMetric: string
  audienceId: string
  trafficAllocation: number
  status: ExperimentStatus
  variants: ExperimentDraftVariant[]
}
