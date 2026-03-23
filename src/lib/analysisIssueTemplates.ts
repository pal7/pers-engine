import type { AnalysisIssue } from '../types/analysis'

export function createCtaVisibilityIssue(): AnalysisIssue {
  return {
    id: 'cta-visibility',
    title: 'Primary CTA may not be visible early enough',
    severity: 'high',
    detail:
      'The main conversion action appears below the initial viewport, which can delay momentum for visitors who are ready to act.',
    impact:
      'Lower early CTA visibility can suppress click-through from high-intent visitors.',
    confidence: 'High',
  }
}

export function createCompetingActionsIssue(): AnalysisIssue {
  return {
    id: 'competing-actions',
    title: 'Too many competing calls to action may dilute focus',
    severity: 'medium',
    detail:
      'Multiple visible actions can create decision friction when the page should be guiding visitors toward one primary next step.',
    impact:
      'This can reduce progression into the highest-value conversion path.',
    confidence: 'Medium',
  }
}

export function createFormFrictionIssue(): AnalysisIssue {
  return {
    id: 'form-friction',
    title: 'Form flow may introduce avoidable friction',
    severity: 'medium',
    detail:
      'A visible lead-capture form can create resistance if it appears before the value proposition and proof have fully done their job.',
    impact:
      'Higher-friction forms can reduce completion rate for otherwise qualified traffic.',
    confidence: 'Medium',
  }
}

export function createTrustReinforcementIssue(): AnalysisIssue {
  return {
    id: 'trust-reinforcement',
    title: 'Trust reinforcement appears too light',
    severity: 'medium',
    detail:
      'The page does not appear to surface enough reassurance through reviews, proof points, guarantees, or credibility cues near decision areas.',
    impact:
      'Missing trust support can increase hesitation before visitors commit to the next step.',
    confidence: 'Medium',
  }
}

export function createHeadlineClarityIssue(): AnalysisIssue {
  return {
    id: 'headline-clarity',
    title: 'Hero message may still feel broad for first-time visitors',
    severity: 'low',
    detail:
      'Even with a workable page structure, the top-of-page narrative may not communicate the clearest possible outcome fast enough.',
    impact:
      'Sharper positioning could improve engagement from visitors evaluating fit in the first few seconds.',
    confidence: 'Low',
  }
}
