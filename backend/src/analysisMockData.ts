import type {
  AnalysisEvidence,
  AnalysisPageType,
} from '../../src/types/analysis'

export type SiteType = AnalysisPageType

export function getMockEvidence(siteType: SiteType): AnalysisEvidence {
  const evidenceBySiteType: Record<SiteType, AnalysisEvidence> = {
    ecommerce: {
      pageType: 'ecommerce',
      heroText: 'Shop top products with fast shipping, limited-time offers, and easy returns.',
      ctaCount: 5,
      hasForm: false,
      primaryCTAAboveFold: false,
      trustSignalsVisible: false,
    },
    travel: {
      pageType: 'travel',
      heroText: 'Find your next stay with flexible dates, verified reviews, and transparent pricing.',
      ctaCount: 4,
      hasForm: true,
      primaryCTAAboveFold: true,
      trustSignalsVisible: false,
    },
    saas: {
      pageType: 'saas',
      heroText: 'Personalize every customer journey from one fast, flexible experimentation workspace.',
      ctaCount: 2,
      hasForm: true,
      primaryCTAAboveFold: false,
      trustSignalsVisible: true,
    },
  }

  return evidenceBySiteType[siteType]
}
