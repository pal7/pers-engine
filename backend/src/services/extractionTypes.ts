import type {
  AnalysisExtractedSignals,
  AnalysisExtractionMode,
  AnalysisExtractionQuality,
} from '../../../shared/analysis.ts'

export interface PageSignals extends AnalysisExtractedSignals {
  textSample: string
  contentLength: number
}

export interface ExtractionResult {
  extractionMode: AnalysisExtractionMode
  extractionQuality: AnalysisExtractionQuality
  extractionWarnings: string[]
  signals: PageSignals
}
