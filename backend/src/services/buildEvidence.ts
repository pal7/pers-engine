import type { AnalysisEvidence, AnalysisPageType } from '../../../shared/analysis.ts'
import type { ExtractedPageSignals } from './extractPageSignals'

const PAGE_TYPE_RULES: Array<{ type: AnalysisPageType; keywords: string[] }> = [
  {
    type: 'ecommerce',
    keywords: [
      'add to cart', 'buy now', 'shop', 'checkout', 'product', 'shipping',
      'order', 'cart', 'store', 'collection', 'sale', 'discount', 'returns',
      'free shipping', 'size',
    ],
  },
  {
    type: 'travel',
    keywords: [
      'book', 'hotel', 'flight', 'check-in', 'check-out', 'nights',
      'destination', 'travel', 'trip', 'vacation', 'resort', 'airline',
      'rental car', 'cruise', 'guests', 'reservation', 'stay',
    ],
  },
  {
    type: 'saas',
    keywords: [
      'dashboard', 'workspace', 'integrations', 'api', 'free trial', 'pricing',
      'features', 'collaborate', 'productivity', 'workflow', 'automate',
      'platform', 'software', 'app', 'tool', 'signin', 'login', 'signup',
      'demo', 'integration', 'sign up', 'start free',
    ],
  },
  {
    type: 'finance',
    keywords: [
      'invest', 'portfolio', 'banking', 'transfer', 'account balance',
      'mortgage', 'loan', 'credit', 'savings', 'trading', 'stocks', 'etf',
      'wealthsimple', 'insurance', 'premium', 'coverage', 'quote',
    ],
  },
  {
    type: 'healthcare',
    keywords: [
      'appointment', 'doctor', 'patient', 'clinic', 'prescription',
      'telehealth', 'symptoms', 'diagnosis', 'health', 'medical', 'therapy',
      'mental health',
    ],
  },
]

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

  let bestType: AnalysisPageType = 'general'
  let bestScore = 0

  for (const { type, keywords } of PAGE_TYPE_RULES) {
    const score = keywords.reduce(
      (s, keyword) => (keywordCorpus.includes(keyword) ? s + 1 : s),
      0,
    )
    if (score > bestScore) {
      bestScore = score
      bestType = type
    }
  }

  return bestType
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
