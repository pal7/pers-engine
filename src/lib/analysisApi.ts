import { getAnalysisContent, type SiteType } from './analysisMockData'
import type { AnalysisRequest, AnalysisResponse } from '../types/analysis'

const ANALYSIS_DELAY_MS = 1200

function getSiteType(url: string): SiteType {
  const hostname = new URL(url).hostname.toLowerCase()

  if (['nike', 'amazon', 'bestbuy'].some((domain) => hostname.includes(domain))) {
    return 'ecommerce'
  }

  if (['airbnb', 'booking'].some((domain) => hostname.includes(domain))) {
    return 'travel'
  }

  return 'saas'
}

export async function submitAnalysis(
  request: AnalysisRequest,
): Promise<AnalysisResponse> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try {
        const analyzedUrl = new URL(request.url).toString()
        const hostname = new URL(request.url).hostname.replace(/^www\./, '')
        const siteType = getSiteType(request.url)
        const analysisContent = getAnalysisContent(siteType, hostname)

        resolve({
          analyzedUrl,
          ...analysisContent,
        })
      } catch {
        reject(new Error('We could not prepare the analysis request for that website.'))
      }
    }, ANALYSIS_DELAY_MS)
  })
}
