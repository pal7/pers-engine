import { getMockEvidence, type SiteType } from './analysisMockData'
import { createExperimentFromIssue } from './analysisExperimentTemplates'
import {
  createCompetingActionsIssue,
  createCtaVisibilityIssue,
  createFormFrictionIssue,
  createHeadlineClarityIssue,
  createTrustReinforcementIssue,
} from './analysisIssueTemplates'
import type {
  AnalysisEvidence,
  AnalysisExperiment,
  AnalysisIssue,
  AnalysisRequest,
  AnalysisResponse,
} from '../types/analysis'

const ANALYSIS_DELAY_MS = 1200
const ecommerceDomains = ['nike.com', 'amazon.com', 'bestbuy.com']
const travelDomains = ['airbnb.com', 'booking.com']

function matchesKnownDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

function getSiteType(url: string): SiteType {
  const hostname = new URL(url).hostname.toLowerCase()

  if (ecommerceDomains.some((domain) => matchesKnownDomain(hostname, domain))) {
    return 'ecommerce'
  }

  if (travelDomains.some((domain) => matchesKnownDomain(hostname, domain))) {
    return 'travel'
  }

  return 'saas'
}

function buildSummary(hostname: string, evidence: AnalysisEvidence, issues: AnalysisIssue[]): string {
  const trustSignalSummary = evidence.trustSignalsVisible
    ? 'some trust reinforcement is already visible'
    : 'trust reinforcement appears limited'
  const primaryOpportunity = issues[0]?.title.toLowerCase() ?? 'message clarity'

  return `${hostname} presents as a ${evidence.pageType} experience with "${evidence.heroText}" leading the page. The current signal set suggests ${trustSignalSummary}, ${evidence.ctaCount} primary actions competing for attention, and the clearest near-term opportunity around ${primaryOpportunity}.`
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
        const evidence = getMockEvidence(siteType)
        const issues = buildIssues(evidence)
        const experiments = buildExperiments(issues, evidence)
        const summary = buildSummary(hostname, evidence, issues)

        resolve({
          analyzedUrl,
          summary,
          evidence,
          issues,
          experiments,
        })
      } catch {
        reject(new Error('We could not prepare the analysis request for that website.'))
      }
    }, ANALYSIS_DELAY_MS)
  })
}
