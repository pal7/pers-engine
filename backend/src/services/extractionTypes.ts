import type {
  AnalysisExtractedSignals,
  AnalysisExtractionMode,
  AnalysisExtractionQuality,
} from "../../../shared/analysis.ts";

export interface PageSignals extends AnalysisExtractedSignals {
  title: string;
  h1: string;
  heroText: string;
  ctaTexts: string[];
  buttonCount: number;
  hasForm: boolean;
  finalUrl: string;
  textSample: string;
  contentLength: number;
}

export interface ExtractionResult {
  extractionMode: AnalysisExtractionMode;
  extractionQuality: AnalysisExtractionQuality;
  extractionWarnings: string[];
  signals: PageSignals;
  rawHtml: string;
}
