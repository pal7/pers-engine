import type { AnalysisRequest, AnalysisResponse } from '../types/analysis'

const ANALYSIS_API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV
    ? 'http://localhost:3001/api/analyze'
    : 'https://pers-engine-backend.agreeableflower-05a7ca4e.canadacentral.azurecontainerapps.io/api/analyze')

export async function submitAnalysis(
  request: AnalysisRequest,
): Promise<AnalysisResponse> {
  let response: Response

  try {
    response = await fetch(ANALYSIS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })
  } catch {
    throw new Error('We could not reach the analysis service. Please try again.')
  }

  if (!response.ok) {
    const errorResponse = (await response.json().catch(() => null)) as
      | { message?: string }
      | null

    throw new Error(
      errorResponse?.message ??
        'We could not prepare the analysis request for that website.',
    )
  }

  return (await response.json()) as AnalysisResponse
}
