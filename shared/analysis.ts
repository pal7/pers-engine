export interface AnalysisRequest {
  url: string
}

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error'
export type AnalysisConfidence = 'High' | 'Medium' | 'Low'
export type AnalysisPageType = 'ecommerce' | 'travel' | 'saas'

export interface AnalysisIssue {
  id: string
  title: string
  severity: 'high' | 'medium' | 'low'
  detail: string
  impact: string
  confidence: AnalysisConfidence
}

export interface AnalysisExperiment {
  id: string
  title: string
  hypothesis: string
  variant: string
  metric: string
  impact: string
  confidence: AnalysisConfidence
}

export interface AnalysisEvidence {
  heroText: string
  ctaCount: number
  hasForm: boolean
  primaryCTAAboveFold: boolean
  trustSignalsVisible: boolean
  pageType: AnalysisPageType
}

export interface AnalysisDebugData {
  resolvedUrl: string
  pageTitle: string
  metaDescription: string
  firstH1Text: string
  hasForm: boolean
  ctaCount: number
  candidateCtaTexts: string[]
  evidence: AnalysisEvidence
}

export interface AnalysisResponse {
  analyzedUrl: string
  summary: string
  evidence: AnalysisEvidence
  issues: AnalysisIssue[]
  experiments: AnalysisExperiment[]
  debug?: AnalysisDebugData
}
