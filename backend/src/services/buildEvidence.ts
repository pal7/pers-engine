import type { AnalysisEvidence, AnalysisPageType } from '../../../shared/analysis.ts'
import type { ExtractedPageSignals } from './extractPageSignals'

const ecommerceKeywords = [
  'add to cart',
  'cart',
  'checkout',
  'free shipping',
  'product',
  'sale',
  'shop',
  'size',
]
const travelKeywords = [
  'book',
  'destination',
  'flight',
  'guests',
  'hotel',
  'reservation',
  'stay',
  'trip',
]
const saasKeywords = [
  'api',
  'demo',
  'integration',
  'platform',
  'sign up',
  'software',
  'start free',
  'workspace',
]

const scoreKeywords = (haystack: string, keywords: string[]) =>
  keywords.reduce(
    (score, keyword) => (haystack.includes(keyword) ? score + 1 : score),
    0,
  )

const detectPageType = (signals: ExtractedPageSignals): AnalysisPageType => {
  const keywordCorpus = [
    signals.resolvedUrl,
    signals.pageTitle,
    signals.metaDescription,
    signals.firstH1Text,
    ...signals.candidateCtaTexts,
    signals.pageText.slice(0, 3000),
  ]
    .join(' ')
    .toLowerCase()

  const pageTypeScores: Record<AnalysisPageType, number> = {
    ecommerce: scoreKeywords(keywordCorpus, ecommerceKeywords),
    travel: scoreKeywords(keywordCorpus, travelKeywords),
    saas: scoreKeywords(keywordCorpus, saasKeywords),
  }

  const strongestMatch = (Object.entries(pageTypeScores) as Array<
    [AnalysisPageType, number]
  >).sort((left, right) => right[1] - left[1])[0]

  return strongestMatch && strongestMatch[1] > 0 ? strongestMatch[0] : 'saas'
}

const buildHeroText = (signals: ExtractedPageSignals) => {
  const candidateHeroText =
    signals.firstH1Text || signals.metaDescription || signals.pageTitle

  if (candidateHeroText) {
    return candidateHeroText
  }

  return new URL(signals.resolvedUrl).hostname.replace(/^www\./, '')
}

const buildCtaCount = (signals: ExtractedPageSignals) => {
  if (signals.candidateCtaTexts.length > 0) {
    return signals.candidateCtaTexts.length
  }

  return Math.min(signals.buttonCount, 6)
}

export function buildEvidence(signals: ExtractedPageSignals): AnalysisEvidence {
  return {
    heroText: buildHeroText(signals),
    ctaCount: buildCtaCount(signals),
    hasForm: signals.hasForm,
    primaryCTAAboveFold: signals.primaryCtaHeuristic,
    trustSignalsVisible: signals.trustSignalKeywords.length > 0,
    pageType: detectPageType(signals),
  }
}
