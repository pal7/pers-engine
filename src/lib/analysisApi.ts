import type {
  AnalysisExperiment,
  AnalysisRequest,
  AnalysisResponse,
  ExperimentRequest,
} from '../types/analysis'

const API_BASE = (() => {
  const configured = import.meta.env.VITE_API_URL as string | undefined
  if (configured) return configured.replace(/\/api\/analyze$/, '')
  return import.meta.env.DEV
    ? 'http://localhost:3001'
    : 'https://pers-engine-backend.agreeableflower-05a7ca4e.canadacentral.azurecontainerapps.io'
})()

const ANALYSIS_API_URL = `${API_BASE}/api/analyze`
const EXPERIMENTS_API_URL = `${API_BASE}/api/experiments`

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('We could not reach the analysis service. Please try again.')
  }

  if (!response.ok) {
    const errorResponse = (await response.json().catch(() => null)) as
      | { message?: string }
      | null
    throw new Error(
      errorResponse?.message ?? 'We could not prepare the analysis request for that website.',
    )
  }

  return (await response.json()) as T
}

export function submitAnalysis(request: AnalysisRequest): Promise<AnalysisResponse> {
  return apiPost<AnalysisResponse>(ANALYSIS_API_URL, request)
}

export function submitExperiments(
  request: ExperimentRequest,
): Promise<{ experiments: AnalysisExperiment[] }> {
  return apiPost<{ experiments: AnalysisExperiment[] }>(EXPERIMENTS_API_URL, request)
}
