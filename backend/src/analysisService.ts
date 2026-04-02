import { buildEvidence } from './services/buildEvidence'
import { extractPageSignals } from './services/extractPageSignals'
import { fetchPage } from './services/fetchPage'
import { generateExperiments } from './services/generateExperiments'
import { generateIssues } from './services/generateIssues'
import type {
  AnalysisDebugData,
  AnalysisEvidence,
  AnalysisIssue,
  AnalysisRequest,
  AnalysisResponse,
} from '../../shared/analysis.ts'

function buildSummary(hostname: string, evidence: AnalysisEvidence, issues: AnalysisIssue[]): string {
  const trustSignalSummary = evidence.trustSignalsVisible
    ? 'some trust reinforcement is already visible'
    : 'trust reinforcement appears limited'
  const primaryOpportunity = issues[0]?.title.toLowerCase() ?? 'message clarity'

  return `${hostname} presents as a ${evidence.pageType} experience with "${evidence.heroText}" leading the page. The current signal set suggests ${trustSignalSummary}, ${evidence.ctaCount} likely calls to action competing for attention, and the clearest near-term opportunity around ${primaryOpportunity}.`
}

export async function analyzeWebsite(
  request: AnalysisRequest,
): Promise<AnalysisResponse> {
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
    summary,
    evidence,
    issues,
    experiments,
    debug,
  }
}
