<<<<<<< HEAD
import { buildEvidence } from './services/buildEvidence'
import { extractPageSignals } from './services/extractPageSignals'
import { fetchPage } from './services/fetchPage'
import { generateExperiments } from './services/generateExperiments'
import { generateIssues } from './services/generateIssues'
=======
import { createExperimentFromIssue } from './analysisExperimentTemplates'
import {
  createCompetingActionsIssue,
  createCtaVisibilityIssue,
  createFormFrictionIssue,
  createHeadlineClarityIssue,
  createTrustReinforcementIssue,
} from './analysisIssueTemplates'
import { extractHtmlSignals } from './services/extractHtmlSignals.ts'
import { extractRenderedSignals } from './services/extractRenderedSignals.ts'
import type { ExtractionResult, PageSignals } from './services/extractionTypes.ts'
>>>>>>> b908bc75df7938daea8c55056ae7fdf3b51ab876
import type {
  AnalysisDebugData,
  AnalysisEvidence,
  AnalysisIssue,
  AnalysisPageType,
  AnalysisRequest,
  AnalysisResponse,
} from '../../shared/analysis.ts'

<<<<<<< HEAD
=======
const ecommerceDomains = ['nike.com', 'amazon.com', 'bestbuy.com', 'apple.com']
const travelDomains = ['airbnb.com', 'booking.com', 'expedia.com']
const trustKeywords = [
  'reviews',
  'testimonial',
  'customers',
  'trusted by',
  'stars',
  'guarantee',
  'secure checkout',
  'free returns',
  'verified',
  'ratings',
]

function matchesKnownDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

function inferPageType(url: string, signals: PageSignals): AnalysisPageType {
  const hostname = new URL(url).hostname.toLowerCase()
  const combinedText = [
    hostname,
    signals.title,
    signals.h1,
    signals.heroText,
    signals.textSample,
    ...signals.ctaTexts,
  ]
    .join(' ')
    .toLowerCase()

  if (
    ecommerceDomains.some((domain) => matchesKnownDomain(hostname, domain)) ||
    /(add to cart|shop now|buy now|product|checkout)/.test(combinedText)
  ) {
    return 'ecommerce'
  }

  if (
    travelDomains.some((domain) => matchesKnownDomain(hostname, domain)) ||
    /(book your stay|search flights|destinations|vacation rentals|hotel)/.test(
      combinedText,
    )
  ) {
    return 'travel'
  }

  return 'saas'
}

>>>>>>> b908bc75df7938daea8c55056ae7fdf3b51ab876
function buildSummary(hostname: string, evidence: AnalysisEvidence, issues: AnalysisIssue[]): string {
  const trustSignalSummary = evidence.trustSignalsVisible
    ? 'some trust reinforcement is already visible'
    : 'trust reinforcement appears limited'
  const heroText = evidence.heroText || 'the page message is still unclear'
  const primaryOpportunity = issues[0]?.title.toLowerCase() ?? 'message clarity'

<<<<<<< HEAD
  return `${hostname} presents as a ${evidence.pageType} experience with "${evidence.heroText}" leading the page. The current signal set suggests ${trustSignalSummary}, ${evidence.ctaCount} likely calls to action competing for attention, and the clearest near-term opportunity around ${primaryOpportunity}.`
=======
  return `${hostname} presents as a ${evidence.pageType} experience with "${heroText}" leading the page. The current signal set suggests ${trustSignalSummary}, ${evidence.ctaCount} primary actions competing for attention, and the clearest near-term opportunity around ${primaryOpportunity}.`
}

function buildIssues(evidence: AnalysisEvidence): AnalysisIssue[] {
  const issues: AnalysisIssue[] = []

  if (!evidence.primaryCTAAboveFold) {
    issues.push(createCtaVisibilityIssue())
  }

  if (evidence.ctaCount > 3) {
    issues.push(createCompetingActionsIssue())
  }

  if (evidence.hasForm && evidence.pageType === 'saas') {
    issues.push(createFormFrictionIssue())
  }

  if (!evidence.trustSignalsVisible) {
    issues.push(createTrustReinforcementIssue())
  }

  if (issues.length === 0) {
    issues.push(createHeadlineClarityIssue())
  }

  return issues
}

function buildExperiments(
  issues: AnalysisIssue[],
  evidence: AnalysisEvidence,
): AnalysisExperiment[] {
  return issues.map((issue) => createExperimentFromIssue(issue, evidence))
>>>>>>> b908bc75df7938daea8c55056ae7fdf3b51ab876
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

function buildEvidence(url: string, signals: PageSignals): AnalysisEvidence {
  const pageType = inferPageType(url, signals)
  const combinedText = [
    signals.title,
    signals.h1,
    signals.heroText,
    signals.textSample,
    ...signals.ctaTexts,
  ]
    .join(' ')
    .toLowerCase()

  return {
    pageType,
    heroText: signals.heroText || signals.h1 || signals.title || 'No clear hero text detected.',
    ctaCount: Math.max(signals.ctaTexts.length, signals.buttonCount),
    hasForm: signals.hasForm,
    primaryCTAAboveFold:
      signals.ctaTexts.length > 0 && Boolean(signals.heroText || signals.h1),
    trustSignalsVisible: trustKeywords.some((keyword) => combinedText.includes(keyword)),
  }
}

export async function analyzeWebsite(
  request: AnalysisRequest,
): Promise<AnalysisResponse> {
<<<<<<< HEAD
  const fetchedPage = await fetchPage(request.url)
  const signals = extractPageSignals(fetchedPage)
  const evidence = buildEvidence(signals)
  const issues = generateIssues(evidence, signals)
  const experiments = generateExperiments(issues, evidence)
  const hostname = new URL(fetchedPage.resolvedUrl).hostname.replace(/^www\./, '')
  const summary = buildSummary(hostname, evidence, issues)
  const debug: AnalysisDebugData = {
    resolvedUrl: fetchedPage.resolvedUrl,
    pageTitle: signals.pageTitle,
    metaDescription: signals.metaDescription,
    firstH1Text: signals.firstH1Text,
    hasForm: signals.hasForm,
    ctaCount: evidence.ctaCount,
    candidateCtaTexts: signals.candidateCtaTexts,
    evidence,
  }

  console.log('[analyze] resolved URL:', fetchedPage.resolvedUrl)
  console.log('[analyze] extracted signals:', {
    pageTitle: signals.pageTitle,
    firstH1Text: signals.firstH1Text,
    hasForm: signals.hasForm,
    buttonCount: signals.buttonCount,
    anchorCount: signals.anchorCount,
    ctaCount: evidence.ctaCount,
    candidateCtaTexts: signals.candidateCtaTexts,
    trustSignalsVisible: evidence.trustSignalsVisible,
    pageType: evidence.pageType,
  })
  console.log('[analyze] issue count:', issues.length)
  console.log('[analyze] experiment count:', experiments.length)

  return {
    analyzedUrl: fetchedPage.resolvedUrl,
=======
  const analyzedUrl = new URL(request.url).toString()
  const hostname = new URL(analyzedUrl).hostname.replace(/^www\./, '')

  const htmlResult = await extractHtmlSignals(analyzedUrl)
  const browserResult = shouldAttemptBrowserFallback(htmlResult)
    ? await extractRenderedSignals(analyzedUrl)
    : null
  const bestExtraction = pickBestExtraction(htmlResult, browserResult)
  const evidence = buildEvidence(analyzedUrl, bestExtraction.signals)
  const issues = buildIssues(evidence)
  const experiments = buildExperiments(issues, evidence)
  const summary = buildSummary(hostname, evidence, issues)
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

  return {
    analyzedUrl: bestExtraction.signals.finalUrl || analyzedUrl,
>>>>>>> b908bc75df7938daea8c55056ae7fdf3b51ab876
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
    experiments,
    debug,
  }
}
