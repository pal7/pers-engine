export interface AnalysisRequest {
  url: string
}

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error'

export type AnalysisProgressStepId = 'fetch' | 'browser-fallback' | 'rag' | 'gpt' | 'experiments'
export type AnalysisProgressStatus = 'active' | 'done' | 'warn' | 'error'

export interface AnalysisProgressEvent {
  id: AnalysisProgressStepId
  label: string
  status: AnalysisProgressStatus
  detail?: string
  prompt?: string
}

export type TechStackCategory =
  | 'ab-testing'
  | 'personalisation'
  | 'analytics'
  | 'tag-manager'
  | 'cms'
  | 'framework'
  | 'cdp'
  | 'ecommerce'
  | 'heatmap'
  | 'crm'

export type TechStackConfidence =
  | 'definitive' // script tag or known domain found
  | 'likely'     // indirect signal like global variable or meta tag

export interface DetectedTech {
  name: string
  category: TechStackCategory
  confidence: TechStackConfidence
  evidence: string
}
export type AnalysisConfidence = 'High' | 'Medium' | 'Low'
export type AnalysisPageType = 'ecommerce' | 'travel' | 'saas' | 'finance' | 'healthcare' | 'general'
export type AnalysisExtractionMode = 'html' | 'browser'
export type AnalysisExtractionQuality = 'good' | 'limited' | 'blocked'

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
  implementationHint?: string
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

export interface AnalysisExtractedSignals {
  finalUrl: string
  title: string
  h1: string
  heroText: string
  hasForm: boolean
  buttonCount: number
  ctaTexts: string[]
}

export interface AnalysisResponse {
  analyzedUrl: string
  summary: string
  evidence: AnalysisEvidence
  extractionMode: AnalysisExtractionMode
  extractionQuality: AnalysisExtractionQuality
  extractionWarnings: string[]
  extractedSignals: AnalysisExtractedSignals
  issues: AnalysisIssue[]
  experiments?: AnalysisExperiment[]
  techStack: DetectedTech[]
  debug?: AnalysisDebugData
}

export interface ExperimentRequest {
  issues: AnalysisIssue[]
  techStack: DetectedTech[]
  evidence: AnalysisEvidence
  pageContext: {
    url: string
    summary: string
    pageType: AnalysisPageType
    heroText: string
    ctaTexts: string[]
    pageText: string
    trustSignalKeywords: string[]
  }
}
