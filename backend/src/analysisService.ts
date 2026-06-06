import { buildEvidence } from './services/buildEvidence'
import { classifySite, buildDescriptor, type SiteClassification } from './services/classifyService'
import { detectTechStack } from './services/techStackDetector'
import { extractHtmlSignals } from './services/extractHtmlSignals'
import { extractRenderedSignals } from './services/extractRenderedSignals'
import { generateIssues } from './services/generateIssues'
import { analyzeWithAI, buildUserPromptPreview } from './services/openAiService'
import { retrieveComparableSites } from './services/ragService'
import { runAgentAnalysis } from './services/agentService'
import type { ExtractedPageSignals } from './services/extractPageSignals'
import type {
  AgentSession,
  AnalysisEvidence,
  AnalysisIssue,
  AnalysisProgressEvent,
  AnalysisRequest,
  AnalysisResponse,
  ComparableSite,
} from '../../shared/analysis.ts'
import type { ExtractionResult } from './services/extractionTypes'

type OnProgress = (event: AnalysisProgressEvent) => void

function extractVisionCaptions(session: AgentSession | null): string[] {
  if (!session) return []
  const FALLBACK_PREFIXES = ['Screenshot captured', 'Mid-page screenshot captured', 'Clicked "']
  return session.observations
    .filter(
      (o) =>
        o.screenshotUrl &&
        o.result.length > 60 &&
        !FALLBACK_PREFIXES.some((p) => o.result.startsWith(p)),
    )
    .map((o) => {
      const label =
        o.action === 'screenshot' ? 'Above fold' :
        o.action === 'scroll' ? 'Mid-page' :
        `After clicking "${o.target ?? 'CTA'}"`
      return `${label}: ${o.result}`
    })
}

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
  onProgress?: OnProgress,
): Promise<AnalysisResponse> {
  const emit = (event: AnalysisProgressEvent) => onProgress?.(event)

  const analyzedUrl = new URL(request.url).toString()
  const hostname = new URL(analyzedUrl).hostname.replace(/^www\./, '')

  // Start agent in parallel immediately — it has its own 60 s timeout
  emit({ id: 'agent-navigate', label: 'Starting browser agent…', status: 'active' })
  const agentPromise: Promise<AgentSession | null> = runAgentAnalysis(analyzedUrl).catch((err) => {
    console.warn('[analyze] agent failed:', err instanceof Error ? err.message : String(err))
    return null
  })

  emit({ id: 'fetch', label: 'Fetching page…', status: 'active' })
  const htmlResult = await extractHtmlSignals(analyzedUrl)

  // Build preliminary signals from HTML for early classify — these are good enough for business DNA
  const htmlCombinedText = [
    htmlResult.signals.title,
    htmlResult.signals.h1,
    htmlResult.signals.heroText,
    htmlResult.signals.textSample,
    ...htmlResult.signals.ctaTexts,
  ]
    .join(' ')
    .toLowerCase()

  const htmlAdaptedSignals: ExtractedPageSignals = {
    resolvedUrl: htmlResult.signals.finalUrl || analyzedUrl,
    pageTitle: htmlResult.signals.title,
    metaDescription: '',
    firstH1Text: htmlResult.signals.h1,
    heroText: htmlResult.signals.heroText,
    hasForm: htmlResult.signals.hasForm,
    formCount: htmlResult.signals.hasForm ? 1 : 0,
    buttonCount: htmlResult.signals.buttonCount,
    anchorCount: 0,
    candidateCtaTexts: htmlResult.signals.ctaTexts,
    pageText: htmlResult.signals.textSample,
    primaryCtaHeuristic:
      htmlResult.signals.primaryCtaAboveFold ??
      (htmlResult.signals.ctaTexts.length > 0 &&
        Boolean(htmlResult.signals.heroText || htmlResult.signals.h1)),
    trustSignalKeywords: trustKeywords.filter((keyword) => htmlCombinedText.includes(keyword)),
  }
  const htmlEvidence = buildEvidence(htmlAdaptedSignals)

  // Run classify and browser fallback in parallel — classify only needs HTML signals
  let browserFallbackPromise: Promise<ExtractionResult | null> = Promise.resolve(null)
  if (shouldAttemptBrowserFallback(htmlResult)) {
    emit({ id: 'browser-fallback', label: 'Running browser fallback…', status: 'active', detail: 'HTML extraction had limited signals' })
    browserFallbackPromise = extractRenderedSignals(analyzedUrl).then((r) => {
      emit({ id: 'browser-fallback', label: 'Browser extraction complete', status: 'done' })
      return r
    })
  }

  let classifyPromise: Promise<SiteClassification | null> = Promise.resolve(null)
  if (process.env.AZURE_OPENAI_KEY) {
    emit({ id: 'classify', label: 'Classifying business context…', status: 'active' })
    classifyPromise = classifySite(htmlAdaptedSignals, htmlEvidence)
  }

  const [browserResult, classification] = await Promise.all([browserFallbackPromise, classifyPromise])

  const bestExtraction = pickBestExtraction(htmlResult, browserResult)
  emit({
    id: 'fetch',
    label: 'Page fetched',
    status: bestExtraction.extractionQuality === 'blocked' ? 'warn' : 'done',
    detail: `${bestExtraction.extractionMode} · ${bestExtraction.extractionQuality}`,
  })

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
      bestExtraction.signals.primaryCtaAboveFold ??
      (bestExtraction.signals.ctaTexts.length > 0 &&
        Boolean(bestExtraction.signals.heroText || bestExtraction.signals.h1)),
    trustSignalKeywords: trustKeywords.filter((keyword) => combinedText.includes(keyword)),
  }

  const techStack = detectTechStack(bestExtraction.rawHtml)
  const evidence = buildEvidence(adaptedSignals)

  let issues: AnalysisIssue[]
  let summary: string
  let comparableSites: ComparableSite[] | undefined
  let siteDescriptor: string | undefined
  let agentSession: AgentSession | null = null

  if (process.env.AZURE_OPENAI_KEY) {
    console.log('[analyze] Using GPT-5.2 for analysis')

    // Classify result is already resolved (ran in parallel with browser fallback)
    if (classification) {
      siteDescriptor = buildDescriptor(classification)
      console.log(`[analyze] Classification: ${siteDescriptor}`)
      emit({ id: 'classify', label: 'Business context identified', status: 'done', detail: siteDescriptor })
    } else {
      console.warn('[analyze] Classification failed — falling back to hero text for RAG')
      emit({ id: 'classify', label: 'Classification skipped', status: 'warn' })
    }

    // Step 2 — retrieve comparable sites by business DNA embedding
    const ragQuery = siteDescriptor ?? (adaptedSignals.heroText || adaptedSignals.pageTitle || '')
    emit({ id: 'rag', label: 'Finding comparable businesses…', status: 'active' })
    const retrieved = await retrieveComparableSites(ragQuery, 3, analyzedUrl)

    if (retrieved.length > 0) {
      comparableSites = retrieved
      console.log(`[analyze] RAG: ${retrieved.length} comparable sites`)
      console.log('[analyze] RAG sites:', retrieved.map((s) => s.url).join(', '))
      emit({
        id: 'rag',
        label: `${retrieved.length} comparable ${retrieved.length === 1 ? 'business' : 'businesses'} found`,
        status: 'done',
        detail: retrieved.map((s) => new URL(s.url).hostname).join(', '),
      })
    } else {
      console.warn('[analyze] RAG: no comparable sites found')
      emit({ id: 'rag', label: 'No comparable sites in index', status: 'warn' })
    }

    // Await agent before GPT so vision captions from the browser session can inform the analysis.
    // Agent has been running in parallel during HTML+classify+RAG (~10-15 s); above-fold screenshot typically completes within the 25 s budget.
    agentSession = await agentPromise
    if (agentSession) {
      emit({ id: 'agent-synthesise', label: 'Browser agent complete', status: 'done', detail: `${agentSession.screenshots.length} screenshots captured` })
      for (const t of agentSession.techStack) {
        if (!techStack.some((s) => s.name === t.name)) techStack.push(t)
      }
    } else {
      emit({ id: 'agent-synthesise', label: 'Browser agent did not complete', status: 'warn' })
    }

    const agentCaptions = extractVisionCaptions(agentSession)

    const promptPreview = buildUserPromptPreview(adaptedSignals, evidence, techStack, retrieved, agentCaptions)
    emit({ id: 'gpt', label: 'Sending prompt to GPT-5.2…', status: 'active', prompt: promptPreview })

    const aiResult = await analyzeWithAI(adaptedSignals, evidence, techStack, retrieved, agentCaptions)
    issues = aiResult.issues
    summary = aiResult.summary

    emit({ id: 'gpt', label: 'Analysis received', status: 'done', detail: `${issues.length} issues identified` })
  } else {
    console.warn('[analyze] AZURE_OPENAI_KEY not set, using template fallback')
    emit({ id: 'rag', label: 'RAG skipped — no AI key configured', status: 'warn' })
    emit({ id: 'gpt', label: 'Using template fallback — no AI key configured', status: 'warn' })
    issues = generateIssues(evidence, adaptedSignals)
    summary = buildSummary(hostname, evidence, issues)
    agentSession = await agentPromise
    if (agentSession) {
      emit({ id: 'agent-synthesise', label: 'Browser agent complete', status: 'done', detail: `${agentSession.screenshots.length} screenshots captured` })
      for (const t of agentSession.techStack) {
        if (!techStack.some((s) => s.name === t.name)) techStack.push(t)
      }
    } else {
      emit({ id: 'agent-synthesise', label: 'Browser agent did not complete', status: 'warn' })
    }
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
    agentSession: agentSession ?? undefined,
    comparableSites,
    siteClassification: siteDescriptor ? { descriptor: siteDescriptor } : undefined,
  }
}
