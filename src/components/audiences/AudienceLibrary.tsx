import { formatNumber } from '../../lib/formatters'
import type { Audience } from '../../types/experiment'

interface AudienceLibraryProps {
  audiences: Audience[]
  selectedAudienceId?: string
}

export function AudienceLibrary({
  audiences,
  selectedAudienceId,
}: AudienceLibraryProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Audience library</h2>
          <p>Reusable segments available for experimentation and personalization.</p>
        </div>
      </div>

      <div className="stack">
        {audiences.map((audience) => (
          <article
            className={`audience-card${selectedAudienceId === audience.id ? ' is-selected' : ''}`}
            key={audience.id}
          >
            <div className="audience-card__header">
              <strong>{audience.name}</strong>
              <span>{formatNumber(audience.size)} visitors</span>
            </div>
            <p>{audience.description}</p>
            <div className="audience-card__rules">
              {audience.rules.map((rule) => (
                <div className="audience-card__rule" key={rule.id}>
                  <span>{rule.field}</span>
                  <span>{rule.operator}</span>
                  <strong>{rule.value}</strong>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
