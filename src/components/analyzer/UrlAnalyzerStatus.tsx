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
