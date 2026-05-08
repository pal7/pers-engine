import type {
  AnalysisExperiment,
  AnalysisProgressEvent,
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
const ANALYSIS_STREAM_URL = `${API_BASE}/api/analyze/stream`
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

export function submitAnalysisStream(
  request: AnalysisRequest,
  onProgress: (event: AnalysisProgressEvent) => void,
  onResult: (result: AnalysisResponse) => void,
  onError: (message: string) => void,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    let response: Response
    try {
      response = await fetch(ANALYSIS_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError('We could not reach the analysis service. Please try again.')
      }
      return
    }

    if (!response.ok || !response.body) {
      const errorBody = await response.json().catch(() => null) as { message?: string } | null
      onError(errorBody?.message ?? 'Analysis service returned an error.')
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentEvent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6)) as unknown
            if (currentEvent === 'progress') {
              onProgress(parsed as AnalysisProgressEvent)
            } else if (currentEvent === 'result') {
              onResult(parsed as AnalysisResponse)
            } else if (currentEvent === 'error') {
              onError(((parsed as { message?: string }).message) ?? 'Analysis failed.')
            }
          } catch { /* malformed SSE line */ }
          currentEvent = ''
        }
      }
    }
  })()

  return () => controller.abort()
}

export function submitExperiments(
  request: ExperimentRequest,
): Promise<{ experiments: AnalysisExperiment[] }> {
  return apiPost<{ experiments: AnalysisExperiment[] }>(EXPERIMENTS_API_URL, request)
}
