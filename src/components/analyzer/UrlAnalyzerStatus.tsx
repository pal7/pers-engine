import type { AnalysisStatus } from '../../types/analysis'

interface UrlAnalyzerStatusProps {
  status: AnalysisStatus
  errorMessage?: string
  currentStep?: string
  currentStepIndex?: number
  totalSteps?: number
}

const statusContent: Record<
  Exclude<AnalysisStatus, 'error'>,
  { title: string; copy: string; tone: 'neutral' | 'loading' }
> = {
  idle: {
    title: 'Ready for analysis',
    copy:
      'Enter a live page URL to generate a focused first-pass review with issues, impact areas, and experiment suggestions.',
    tone: 'neutral',
  },
  loading: {
    title: 'Scanning messaging and conversion cues',
    copy:
      'We are preparing an initial product-style read on clarity, trust placement, visitor friction, and likely test opportunities.',
    tone: 'loading',
  },
  success: {
    title: 'Analysis complete',
    copy: 'The latest findings are ready below with prioritized issues and experiment ideas.',
    tone: 'neutral',
  },
}

export function UrlAnalyzerStatus({
  status,
  errorMessage,
  currentStep,
  currentStepIndex,
  totalSteps,
}: UrlAnalyzerStatusProps) {
  if (status === 'success') {
    return null
  }

  const content =
    status === 'error'
      ? {
          title: 'Analysis could not be completed',
          copy:
            errorMessage ??
            'Something went wrong while preparing the analysis. Please retry with a valid website URL.',
          tone: 'error' as const,
        }
      : statusContent[status]

  return (
    <section className={`panel url-analyzer-status url-analyzer-status--${content.tone}`}>
      <div className="panel__header url-analyzer-status__header">
        <div>
          <h2>{content.title}</h2>
          <p>{content.copy}</p>
        </div>
        <span className="badge badge--neutral">
          {status === 'loading' ? 'In progress' : status === 'error' ? 'Needs retry' : 'Awaiting URL'}
        </span>
      </div>

      {status === 'loading' && currentStep ? (
        <div className="url-analyzer-status__step" aria-live="polite">
          <span className="label">
            Step {typeof currentStepIndex === 'number' ? currentStepIndex + 1 : 1}
            {totalSteps ? ` of ${totalSteps}` : ''}
          </span>
          <strong>{currentStep}</strong>
        </div>
      ) : null}
    </section>
  )
}
