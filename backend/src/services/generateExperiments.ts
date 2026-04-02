import { createExperimentFromIssue } from '../analysisExperimentTemplates'
import type {
  AnalysisEvidence,
  AnalysisExperiment,
  AnalysisIssue,
} from '../../../shared/analysis.ts'

export function generateExperiments(
  issues: AnalysisIssue[],
  evidence: AnalysisEvidence,
): AnalysisExperiment[] {
  return issues.map((issue) => createExperimentFromIssue(issue, evidence))
}
