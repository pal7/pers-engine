import {
  createCtaVisibilityIssue,
  createHeadlineClarityIssue,
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

  return issues
}
