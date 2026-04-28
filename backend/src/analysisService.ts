import { buildEvidence } from './services/buildEvidence'
import { detectTechStack } from './services/techStackDetector'
import { extractHtmlSignals } from './services/extractHtmlSignals'
import { extractRenderedSignals } from './services/extractRenderedSignals'
import { generateIssues } from './services/generateIssues'
import { analyzeWithAI } from './services/openAiService'
import type { ExtractedPageSignals } from './services/extractPageSignals'
import type {
  AnalysisEvidence,
  AnalysisIssue,
  AnalysisRequest,
  AnalysisResponse,
} from '../../shared/analysis.ts'
import type { ExtractionResult } from './services/extractionTypes'

const trustKeywords = [
  'customer stories',
  'customers',
  'guarantee',
  'money back',
  'rated',
  'rating',
  'reviews',
  'secure',
  'testimonial',
  'testimonials',
  'trusted by',
  'verified',
]

function buildSummary(hostname: string, evidence: AnalysisEvidence, issues: AnalysisIssue[]): string {
  const trustSignalSummary = evidence.trustSignalsVisible
    ? 'some trust reinforcement is already visible'
    : 'trust reinforcement appears limited'
  const primaryOpportunity = issues[0]?.title.toLowerCase() ?? 'message clarity'

  return `${hostname} presents as a ${evidence.pageType} experience with "${evidence.heroText}" leading the page. The current signal set suggests ${trustSignalSummary}, ${evidence.ctaCount} likely calls to action competing for attention, and the clearest near-term opportunity around ${primaryOpportunity}.`
}

function shouldAttemptBrowserFallback(result: ExtractionResult): boolean {
  if (result.extractionQuality !== 'good') {
    return true
  }

  const combinedText = [
    result.signals.title,
    result.signals.h1,
    result.signals.heroText,
    result.signals.textSample,
  ]
    .join(' ')
    .toLowerCase()

  return (
    combinedText.includes('javascript is disabled') ||
    combinedText.includes('enable javascript') ||
    result.signals.ctaTexts.length === 0
  )
}

function getExtractionScore(result: ExtractionResult): number {
  const qualityScore =
    result.extractionQuality === 'good'
      ? 200
      : result.extractionQuality === 'limited'
        ? 100
        : 0

  return (
    qualityScore +
    (result.signals.title ? 20 : 0) +
    (result.signals.h1 ? 20 : 0) +
    (result.signals.heroText ? 30 : 0) +
    Math.min(result.signals.ctaTexts.length, 5) * 10 +
    Math.min(result.signals.buttonCount, 5) * 4 +
    Math.min(result.signals.contentLength, 1000) / 20
  )
}

function pickBestExtraction(
  htmlResult: ExtractionResult,
  browserResult: ExtractionResult | null,
): ExtractionResult {
  if (!browserResult) {
    return htmlResult
  }

  return getExtractionScore(browserResult) >= getExtractionScore(htmlResult)
    ? browserResult
    : htmlResult
}

export async function analyzeWebsite(
  request: AnalysisRequest,
): Promise<AnalysisResponse> {
  const analyzedUrl = new URL(request.url).toString()
  const hostname = new URL(analyzedUrl).hostname.replace(/^www\./, '')

  const htmlResult = await extractHtmlSignals(analyzedUrl)
  const browserResult = shouldAttemptBrowserFallback(htmlResult)
    ? await extractRenderedSignals(analyzedUrl)
    : null
  const bestExtraction = pickBestExtraction(htmlResult, browserResult)

  const combinedText = [
    bestExtraction.signals.title,
    bestExtraction.signals.h1,
    bestExtraction.signals.heroText,
    bestExtraction.signals.textSample,
    ...bestExtraction.signals.ctaTexts,
  ]
    .join(' ')
    .toLowerCase()

  const adaptedSignals: ExtractedPageSignals = {
    resolvedUrl: bestExtraction.signals.finalUrl || analyzedUrl,
    pageTitle: bestExtraction.signals.title,
    metaDescription: '',
    firstH1Text: bestExtraction.signals.h1,
    heroText: bestExtraction.signals.heroText,
    hasForm: bestExtraction.signals.hasForm,
    formCount: bestExtraction.signals.hasForm ? 1 : 0,
    buttonCount: bestExtraction.signals.buttonCount,
    anchorCount: 0,
    candidateCtaTexts: bestExtraction.signals.ctaTexts,
    pageText: bestExtraction.signals.textSample,
    primaryCtaHeuristic:
      bestExtraction.signals.ctaTexts.length > 0 &&
      Boolean(bestExtraction.signals.heroText || bestExtraction.signals.h1),
    trustSignalKeywords: trustKeywords.filter((keyword) => combinedText.includes(keyword)),
  }

  const techStack = detectTechStack(bestExtraction.rawHtml)

  const evidence = buildEvidence(adaptedSignals)

  let issues: AnalysisIssue[]
  let summary: string

  if (process.env.AZURE_OPENAI_KEY) {
    console.log('[analyze] Using GPT-5.2 for analysis')
    const aiResult = await analyzeWithAI(adaptedSignals, evidence, techStack)
    issues = aiResult.issues
    summary = aiResult.summary
  } else {
    console.warn('[analyze] AZURE_OPENAI_KEY not set, using template fallback')
    issues = generateIssues(evidence, adaptedSignals)
    summary = buildSummary(hostname, evidence, issues)
  }
  const extractionWarnings = Array.from(
    new Set([
      ...bestExtraction.extractionWarnings,
      ...(browserResult && bestExtraction.extractionMode === 'browser'
        ? htmlResult.extractionWarnings.map((warning) => `HTML fast path: ${warning}`)
        : []),
      ...(browserResult && bestExtraction.extractionMode !== 'browser'
        ? ['Browser extraction did not improve the usable signal set.']
        : []),
      ...(browserResult &&
      bestExtraction.extractionMode === 'html' &&
      browserResult.extractionWarnings.length > 0
        ? browserResult.extractionWarnings.map(
            (warning) => `Browser fallback: ${warning}`,
          )
        : []),
    ]),
  )

  console.log('[analyze] resolved URL:', bestExtraction.signals.finalUrl || analyzedUrl)
  console.log('[analyze] extraction mode:', bestExtraction.extractionMode)
  console.log('[analyze] extraction quality:', bestExtraction.extractionQuality)
  console.log('[analyze] issue count:', issues.length)

  return {
    analyzedUrl: bestExtraction.signals.finalUrl || analyzedUrl,
    summary,
    evidence,
    extractionMode: bestExtraction.extractionMode,
    extractionQuality: bestExtraction.extractionQuality,
    extractionWarnings,
    extractedSignals: {
      finalUrl: bestExtraction.signals.finalUrl,
      title: bestExtraction.signals.title,
      h1: bestExtraction.signals.h1,
      heroText: bestExtraction.signals.heroText,
      hasForm: bestExtraction.signals.hasForm,
      buttonCount: bestExtraction.signals.buttonCount,
      ctaTexts: bestExtraction.signals.ctaTexts,
    },
    issues,
    techStack,
  }
}
