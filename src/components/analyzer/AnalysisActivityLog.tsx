import { useState } from 'react'
import type { AnalysisProgressEvent } from '../../types/analysis'

interface AnalysisActivityLogProps {
  events: AnalysisProgressEvent[]
}

function StepIcon({ status }: { status: AnalysisProgressEvent['status'] }) {
  if (status === 'active') {
    return <div className="activity-log__spinner" aria-hidden="true" />
  }
  if (status === 'done') {
    return (
      <svg className="activity-log__icon activity-log__icon--done" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (status === 'warn') {
    return (
      <svg className="activity-log__icon activity-log__icon--warn" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 2L12.5 12H1.5L7 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="7" y1="6" x2="7" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="7" cy="10.5" r="0.75" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg className="activity-log__icon activity-log__icon--error" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="4.5" y1="4.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.5" y1="4.5" x2="4.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PromptPreview({ prompt }: { prompt: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="activity-log__prompt-wrap">
      <button
        className="activity-log__prompt-toggle"
        onClick={() => setOpen((o) => !o)}
        type="button"
        aria-expanded={open}
      >
        {open ? 'Hide prompt' : 'Show prompt sent to GPT-5.2'}
      </button>
      {open && (
        <pre className="activity-log__prompt">{prompt}</pre>
      )}
    </div>
  )
}

export function AnalysisActivityLog({ events }: AnalysisActivityLogProps) {
  return (
    <section className="panel url-analyzer-status url-analyzer-status--loading" role="status" aria-live="polite" aria-atomic="false">
      <div className="panel__header url-analyzer-status__header">
        <div>
          <h2>Analyzing your website…</h2>
          <p>Preparing a product-style read on clarity, trust placement, visitor friction, and likely test opportunities.</p>
        </div>
        <span className="badge badge--neutral">In progress</span>
      </div>

      <div className="activity-log" aria-label="Analysis pipeline progress">
        {events.map((event, i) => (
          <div
            key={`${event.id}-${i}`}
            className={`activity-log__item activity-log__item--${event.status}`}
          >
            <div className="activity-log__icon-wrap">
              <StepIcon status={event.status} />
            </div>
            <div className="activity-log__content">
              <span className="activity-log__label">{event.label}</span>
              {event.detail && (
                <span className="activity-log__detail">{event.detail}</span>
              )}
              {event.prompt && event.status === 'active' && (
                <PromptPreview prompt={event.prompt} />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
