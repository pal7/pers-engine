export interface AnalysisRequest {
  url: string
}

export type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AnalysisIssue {
  id: string
  title: string
  severity: 'high' | 'medium' | 'low'
  detail: string
  impact: string
}

export interface AnalysisExperiment {
  id: string
  name: string
  hypothesis: string
  expectedImpact: string
  audience: string
}

export interface AnalysisResponse {
  analyzedUrl: string
  summary: string
  issues: AnalysisIssue[]
  experiments: AnalysisExperiment[]
}
