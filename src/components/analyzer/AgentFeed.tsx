import { useState } from 'react'
import type { AgentObservation } from '../../types/analysis'

interface AgentFeedProps {
  observations: AgentObservation[]
  isStreaming: boolean
}

const ACTION_LABELS: Record<AgentObservation['action'], string> = {
  navigate: 'Navigating to site',
  screenshot: 'Capturing screenshot',
  scroll: 'Scrolling mid-page',
  click: 'Clicking primary CTA',
  extract: 'Extracting signals',
}

function ActionIcon({ action }: { action: AgentObservation['action'] }) {
  const icons: Record<AgentObservation['action'], string> = {
    navigate: '🔍',
    screenshot: '📸',
    scroll: '↕',
    click: '🖱',
    extract: '✅',
  }
  return <span aria-hidden="true" style={{ marginRight: '6px' }}>{icons[action]}</span>
}

function ScreenshotThumb({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="agent-feed__screenshot-wrap">
      <img
        src={url}
        alt="Agent screenshot"
        className="agent-feed__screenshot-thumb"
        onClick={() => setExpanded((x) => !x)}
        style={{ maxWidth: expanded ? '100%' : '280px', cursor: 'pointer', display: 'block', marginTop: '8px', borderRadius: '4px', border: '1px solid var(--border-subtle, #e5e7eb)' }}
      />
      {expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          style={{ fontSize: '12px', marginTop: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #6b7280)' }}
        >
          Collapse
        </button>
      )}
    </div>
  )
}

export function AgentFeed({ observations, isStreaming }: AgentFeedProps) {
  return (
    <section
      className="panel url-analyzer-status url-analyzer-status--loading"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="panel__header url-analyzer-status__header">
        <div>
          <h2>Agent Analysis</h2>
          <p>An AI agent is actively navigating the site, capturing screenshots, and synthesising findings.</p>
        </div>
        {isStreaming && <span className="badge badge--neutral">In progress</span>}
        {!isStreaming && observations.length > 0 && <span className="badge badge--success">Complete</span>}
      </div>

      <div className="activity-log" aria-label="Agent observation feed">
        {observations.map((obs) => (
          <div
            key={obs.step}
            className="activity-log__item activity-log__item--done"
          >
            <div className="activity-log__icon-wrap">
              <svg className="activity-log__icon activity-log__icon--done" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="activity-log__content">
              <span className="activity-log__label">
                <ActionIcon action={obs.action} />
                {ACTION_LABELS[obs.action]}
                {obs.target && <span style={{ color: 'var(--text-secondary, #6b7280)', fontWeight: 400 }}> — {obs.target}</span>}
              </span>
              <span className="activity-log__detail">{obs.result}</span>
              {obs.screenshotUrl && <ScreenshotThumb url={obs.screenshotUrl} />}
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="activity-log__item activity-log__item--active">
            <div className="activity-log__icon-wrap">
              <div className="activity-log__spinner" aria-hidden="true" />
            </div>
            <div className="activity-log__content">
              <span className="activity-log__label">Agent working…</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
