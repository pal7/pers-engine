import type { AnalysisRequest, AnalysisResponse } from '../types/analysis'

const ANALYSIS_API_URL = 'http://localhost:3001/api/analyze'

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
