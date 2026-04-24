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
  overrides: Partial<AnalysisIssue>,
): AnalysisIssue => ({ ...issue, ...overrides })

export function generateIssues(
  evidence: AnalysisEvidence,
  signals: ExtractedPageSignals,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = []
  const ctaPreview =
    signals.candidateCtaTexts.length > 0
      ? signals.candidateCtaTexts.slice(0, 3).join(', ')
      : 'none detected'
  const headlineSource = signals.firstH1Text || signals.pageTitle || 'the current page headline'

  // 1 — Above-fold CTA experience (always relevant)
  issues.push(
    withContext(createCtaVisibilityIssue(), {
      severity: evidence.primaryCTAAboveFold ? 'medium' : 'high',
      detail: evidence.primaryCTAAboveFold
        ? `A CTA is present above the fold (${ctaPreview}), but its visual weight, copy specificity, and contrast relative to the hero message may still be leaving conversion speed on the table.`
        : `No clear primary CTA was detected in the above-fold region. Visible CTA labels found on the page: ${ctaPreview}. Visitors who are ready to act may disengage before scrolling far enough.`,
    }),
  )

  // 2 — Headline / value proposition clarity (always relevant)
  issues.push(
    withContext(createHeadlineClarityIssue(), {
      severity: 'medium',
      detail: `The leading page headline is "${headlineSource}". Without a direct outcome statement (who this is for, what they get, why now), first-time visitors may not self-qualify fast enough to commit to the next step.`,
      confidence: 'Medium',
    }),
  )

  // 3 — Trust reinforcement (always relevant; severity reflects what was found)
  const trustFound = signals.trustSignalKeywords.length > 0
  issues.push(
    withContext(createTrustReinforcementIssue(), {
      severity: trustFound ? 'low' : 'medium',
      detail: trustFound
        ? `Some trust signals were detected (${signals.trustSignalKeywords.join(', ')}), but they may not be positioned close enough to the decision moment — most effective when placed immediately adjacent to the primary CTA.`
        : `No clear trust cues (reviews, guarantees, customer counts, or verification language) were detected in the fetched copy. Lack of proof near the CTA increases hesitation for first-time visitors.`,
      confidence: trustFound ? 'Medium' : 'High',
    }),
  )

  // 4 — CTA hierarchy / competing actions (always relevant; calibrated to button count)
  const buttonNote =
    signals.buttonCount >= 4
      ? `The page exposes ${signals.buttonCount} buttons and ${signals.anchorCount} links — this volume can split visitor attention before the primary path is clear.`
      : `With ${signals.buttonCount} button${signals.buttonCount === 1 ? '' : 's'} detected, the hierarchy between primary and secondary actions should be made more visually explicit so visitors know which step matters most.`
  issues.push(
    withContext(createCompetingActionsIssue(), {
      severity: signals.buttonCount >= 4 ? 'medium' : 'low',
      detail: buttonNote,
    }),
  )

  // 5 — Form friction (only if a form is present)
  if (signals.hasForm) {
    issues.push(
      withContext(createFormFrictionIssue(), {
        severity: 'medium',
        detail: `At least ${signals.formCount} form element${signals.formCount === 1 ? '' : 's'} found. Forms shown before the value proposition and social proof have been established typically see higher abandonment rates.`,
      }),
    )
  }

  return issues
}
