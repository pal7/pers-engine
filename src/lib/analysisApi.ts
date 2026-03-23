import { getMockEvidence, type SiteType } from './analysisMockData'
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
    issues.push({
      id: 'cta-visibility',
      title: 'Primary CTA may not be visible early enough',
      severity: 'high',
      detail:
        'The main conversion action appears below the initial viewport, which can delay momentum for visitors who are ready to act.',
      impact:
        'Lower early CTA visibility can suppress click-through from high-intent visitors.',
      confidence: 'High',
    })
  }

  if (evidence.ctaCount > 3) {
    issues.push({
      id: 'competing-actions',
      title: 'Too many competing calls to action may dilute focus',
      severity: 'medium',
      detail:
        'Multiple visible actions can create decision friction when the page should be guiding visitors toward one primary next step.',
      impact:
        'This can reduce progression into the highest-value conversion path.',
      confidence: 'Medium',
    })
  }

  if (evidence.hasForm && evidence.pageType === 'saas') {
    issues.push({
      id: 'form-friction',
      title: 'Form flow may introduce avoidable friction',
      severity: 'medium',
      detail:
        'A visible lead-capture form can create resistance if it appears before the value proposition and proof have fully done their job.',
      impact:
        'Higher-friction forms can reduce completion rate for otherwise qualified traffic.',
      confidence: 'Medium',
    })
  }

  if (!evidence.trustSignalsVisible) {
    issues.push({
      id: 'trust-reinforcement',
      title: 'Trust reinforcement appears too light',
      severity: 'medium',
      detail:
        'The page does not appear to surface enough reassurance through reviews, proof points, guarantees, or credibility cues near decision areas.',
      impact:
        'Missing trust support can increase hesitation before visitors commit to the next step.',
      confidence: 'Medium',
    })
  }

  if (issues.length === 0) {
    issues.push({
      id: 'headline-clarity',
      title: 'Hero message may still feel broad for first-time visitors',
      severity: 'low',
      detail:
        'Even with a workable page structure, the top-of-page narrative may not communicate the clearest possible outcome fast enough.',
      impact:
        'Sharper positioning could improve engagement from visitors evaluating fit in the first few seconds.',
      confidence: 'Low',
    })
  }

  return issues
}

function buildExperiment(issue: AnalysisIssue, evidence: AnalysisEvidence): AnalysisExperiment {
  const experimentMap: Record<
    AnalysisIssue['id'],
    Omit<AnalysisExperiment, 'id' | 'confidence'>
  > = {
    'cta-visibility': {
      title: 'Bring the primary CTA higher in the page hierarchy',
      hypothesis:
        'If the main conversion action is visible within the first viewport, more qualified visitors will take the next step without extra scrolling.',
      variant: 'Move the primary CTA into the hero and repeat it near the first supporting proof block.',
      metric:
        evidence.pageType === 'ecommerce'
          ? 'Add-to-cart rate'
          : evidence.pageType === 'travel'
            ? 'Search progression rate'
            : 'Primary CTA click-through rate',
      impact: 'Increase early engagement with the main conversion path.',
    },
    'competing-actions': {
      title: 'Reduce CTA competition and reinforce one primary next step',
      hypothesis:
        'If secondary actions are deprioritized and one primary CTA is emphasized, more visitors will progress through the intended funnel path.',
      variant: 'Keep one primary CTA style above the fold and demote secondary actions to text links or lower emphasis.',
      metric: 'Primary CTA click-through rate',
      impact: 'Improve clarity and reduce hesitation caused by too many choices.',
    },
    'form-friction': {
      title: 'Simplify the first-step form experience',
      hypothesis:
        'If the first conversion form asks for less information, more visitors will begin and complete the flow.',
      variant: 'Reduce the initial form to the minimum required fields and defer the rest to a later step.',
      metric: 'Form completion rate',
      impact: 'Lift completion rate on the first conversion step.',
    },
    'trust-reinforcement': {
      title: 'Add stronger trust cues near the primary decision area',
      hypothesis:
        'If the page surfaces credibility and reassurance where visitors make decisions, more users will progress without needing extra validation.',
      variant: 'Introduce customer proof, ratings, guarantees, or policy reassurance beside the main CTA.',
      metric:
        evidence.pageType === 'travel'
          ? 'Listing-to-booking progression'
          : 'Primary conversion rate',
      impact: 'Reduce hesitation and improve confidence near the conversion point.',
    },
    'headline-clarity': {
      title: 'Test a sharper headline tied to one concrete outcome',
      hypothesis:
        'If the hero message explains the core value more directly, more visitors will understand relevance and continue.',
      variant: 'Replace the current hero message with one outcome-led headline and supporting subcopy.',
      metric: 'Hero CTA click-through rate',
      impact: 'Improve above-the-fold engagement and message clarity.',
    },
  }

  return {
    id: issue.id,
    confidence: issue.confidence,
    ...experimentMap[issue.id],
  }
}

function buildExperiments(
  issues: AnalysisIssue[],
  evidence: AnalysisEvidence,
): AnalysisExperiment[] {
  return issues.map((issue) => buildExperiment(issue, evidence))
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
