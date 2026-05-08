import type { AnalysisStatus } from '../../types/analysis'

interface UrlAnalyzerStatusProps {
  status: AnalysisStatus
  errorMessage?: string
}

const statusContent: Record<
  Exclude<AnalysisStatus, 'error'>,
  { title: string; copy: string; tone: 'neutral' | 'loading' }
> = {
  idle: {
    title: 'Ready for analysis',
    copy: 'Enter a live page URL to generate a focused first-pass review with issues, impact areas, and experiment suggestions.',
    tone: 'neutral',
  },
  loading: {
    title: 'Analyzing your website…',
    copy: 'Preparing a product-style read on clarity, trust placement, visitor friction, and likely test opportunities.',
    tone: 'loading',
  },
  success: {
    title: 'Analysis complete',
    copy: 'The latest findings are ready below with prioritized issues and experiment ideas.',
    tone: 'neutral',
  },
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface AnalysisStepperProps {
  steps: string[]
  currentIndex: number
}

function AnalysisStepper({ steps, currentIndex }: AnalysisStepperProps) {
  const progressPct = Math.round(((currentIndex + 1) / steps.length) * 100)

  return (
    <div className="analysis-stepper">
      <div className="analysis-stepper__track">
        {steps.map((label, i) => {
          const state: 'done' | 'active' | 'pending' =
            i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending'
          return (
            <div className="analysis-stepper__item" key={label}>
              <div className={`analysis-stepper__node-wrap analysis-stepper__node-wrap--${state}`}>
                {state === 'active' && <div className="analysis-stepper__spinner" aria-hidden="true" />}
                <div className={`analysis-stepper__node analysis-stepper__node--${state}`}>
                  {state === 'done' ? <CheckIcon /> : <span>{i + 1}</span>}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`analysis-stepper__connector${state === 'done' ? ' analysis-stepper__connector--done' : ''}`}
                />
              )}
              <span className={`analysis-stepper__label analysis-stepper__label--${state}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="analysis-stepper__progress-track" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className="analysis-stepper__progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="analysis-stepper__status-line" aria-live="polite">
        Step {currentIndex + 1} of {steps.length} — {steps[currentIndex]}
      </p>
    </div>
  )
}

export function UrlAnalyzerStatus({
  status,
  errorMessage,
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
    <section
      className={`panel url-analyzer-status url-analyzer-status--${content.tone}`}
      role={status === 'error' ? 'alert' : 'status'}
      aria-live={status === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div className="panel__header url-analyzer-status__header">
        <div>
          <h2>{content.title}</h2>
          <p>{content.copy}</p>
        </div>
        <span className="badge badge--neutral">
          {status === 'loading' ? 'In progress' : status === 'error' ? 'Needs retry' : 'Awaiting URL'}
        </span>
      </div>

    </section>
  )
}
