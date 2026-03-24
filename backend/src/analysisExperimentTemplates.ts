import type {
  AnalysisEvidence,
  AnalysisExperiment,
  AnalysisIssue,
} from '../../shared/analysis.ts'

export function createExperimentFromIssue(
  issue: AnalysisIssue,
  evidence: AnalysisEvidence,
): AnalysisExperiment {
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


