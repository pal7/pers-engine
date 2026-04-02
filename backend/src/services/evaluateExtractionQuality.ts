import type {
  AnalysisExtractionMode,
  AnalysisExtractionQuality,
} from '../../../shared/analysis.ts'
import type { ExtractionResult, PageSignals } from './extractionTypes.ts'

const blockedPhrases = [
  'access denied',
  'verify you are human',
  'enable javascript',
  'forbidden',
  'request blocked',
  'temporarily unavailable',
  'captcha',
  'checking your browser',
  'attention required',
  'unusual traffic',
  'press and hold',
  'automated access',
]

const limitedHeroPhrases = [
  'javascript is disabled',
  'please enable javascript',
  'enable javascript to continue',
  'javascript required',
  'loading...',
  'please wait',
]

export function evaluateExtractionQuality(input: {
  extractionMode: AnalysisExtractionMode
  signals: PageSignals
  baseWarnings?: string[]
}): ExtractionResult {
  const warnings = [...(input.baseWarnings ?? [])]
  const combinedText = [
    input.signals.title,
    input.signals.h1,
    input.signals.heroText,
    input.signals.textSample,
    ...input.signals.ctaTexts,
  ]
    .join(' ')
    .toLowerCase()

  if (!input.signals.heroText) {
    warnings.push('Hero text was empty.')
  }

  if (
    limitedHeroPhrases.some((phrase) =>
      combinedText.includes(phrase),
    )
  ) {
    warnings.push('Hero text suggests the page may still be a JavaScript shell.')
  }

  if (!input.signals.title && !input.signals.h1) {
    warnings.push('No title or H1 was detected.')
  }

  if (input.signals.ctaTexts.length === 0) {
    warnings.push('No candidate CTA texts were detected.')
  }

  if (input.signals.contentLength < 140) {
    warnings.push('Page content looked too thin for a strong read.')
  }

  const hasBlockedPhrase = blockedPhrases.some((phrase) =>
    combinedText.includes(phrase),
  )

  let extractionQuality: AnalysisExtractionQuality = 'good'

  if (hasBlockedPhrase) {
    extractionQuality = 'blocked'
    warnings.push('The page content appears blocked or anti-bot protected.')
  } else if (
    warnings.some((warning) =>
      [
        'Hero text was empty.',
        'No title or H1 was detected.',
        'Page content looked too thin for a strong read.',
        'Hero text suggests the page may still be a JavaScript shell.',
      ].includes(warning),
    )
  ) {
    extractionQuality = 'limited'
  }

  return {
    extractionMode: input.extractionMode,
    extractionQuality,
    extractionWarnings: Array.from(new Set(warnings)),
    signals: input.signals,
  }
}
