import {
  createCompetingActionsIssue,
  createCtaVisibilityIssue,
  createFormFrictionIssue,
  createHeadlineClarityIssue,
  createTrustReinforcementIssue,
} from '../analysisIssueTemplates'
import type { AnalysisEvidence, AnalysisIssue } from '../../../shared/analysis.ts'
import type { ExtractedPageSignals } from './extractPageSignals'

const withContext = (
  issue: AnalysisIssue,
  detail: string,
  impact: string = issue.impact,
): AnalysisIssue => ({
  ...issue,
  detail,
  impact,
})

export function generateIssues(
  evidence: AnalysisEvidence,
  signals: ExtractedPageSignals,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = []
  const ctaPreview =
    signals.candidateCtaTexts.length > 0
      ? signals.candidateCtaTexts.slice(0, 3).join(', ')
      : 'no strong CTA labels detected'

  if (!evidence.primaryCTAAboveFold || signals.candidateCtaTexts.length === 0) {
    const baseIssue = createCtaVisibilityIssue()

    issues.push(
      withContext(
        baseIssue,
        `${baseIssue.detail} Raw HTML signals suggest early-page CTA visibility is weak: ${ctaPreview}.`,
      ),
    )
  }

  if (evidence.ctaCount > 3 || signals.buttonCount >= 4) {
    const baseIssue = createCompetingActionsIssue()

    issues.push(
      withContext(
        baseIssue,
        `${baseIssue.detail} The page exposes ${signals.buttonCount} buttons and ${signals.anchorCount} links, which may be splitting attention across too many possible next steps.`,
      ),
    )
  }

  if (signals.hasForm && evidence.pageType === 'saas') {
    const baseIssue = createFormFrictionIssue()

    issues.push(
      withContext(
        baseIssue,
        `${baseIssue.detail} At least ${signals.formCount} form element${signals.formCount === 1 ? '' : 's'} were found in the fetched HTML.`,
      ),
    )
  }

  if (!evidence.trustSignalsVisible) {
    const baseIssue = createTrustReinforcementIssue()

    issues.push(
      withContext(
        baseIssue,
        `${baseIssue.detail} The fetched page copy did not clearly surface trust cues such as reviews, guarantees, customer proof, or verification language.`,
      ),
    )
  }

  if (issues.length === 0) {
    const baseIssue = createHeadlineClarityIssue()
    const headlineSource = signals.firstH1Text || signals.pageTitle || 'the current page headline'

    issues.push(
      withContext(
        baseIssue,
        `${baseIssue.detail} Current top-of-page copy appears to center on "${headlineSource}".`,
      ),
    )
  }

  return issues
}
