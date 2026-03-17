import { formatNumber, formatPercent } from '../../lib/formatters'
import {
  getLaunchReadinessLabel,
  getVariantConversionRate,
} from '../../lib/experiments'
import type { Experiment } from '../../types/experiment'

interface ExperimentDetailsProps {
  experiment: Experiment
}

export function ExperimentDetails({ experiment }: ExperimentDetailsProps) {
  const confidence = experiment.results.confidence
  const readinessLabel = getLaunchReadinessLabel(confidence)
  const trafficAllocation = experiment.variants
    .map((variant) => `${variant.name} ${variant.allocation}%`)
    .join(' / ')

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Experiment details</h2>
          <p>Ownership, rollout signal, and side-by-side variant performance.</p>
        </div>
      </div>

      <div className="experiment-details__summary">
        <article className="experiment-details__meta-card">
          <div className="details-grid">
            <div>
              <span className="label">Owner</span>
              <p>{experiment.owner}</p>
            </div>
            <div>
              <span className="label">Audience</span>
              <p>{experiment.audienceName}</p>
            </div>
            <div>
              <span className="label">Traffic allocation</span>
              <p>{trafficAllocation}</p>
            </div>
            <div>
              <span className="label">Primary metric</span>
              <p>{experiment.primaryMetric}</p>
            </div>
          </div>
        </article>

        <article className="experiment-details__readiness-card">
          <div className="experiment-details__readiness-header">
            <span className="label">Launch readiness</span>
            <strong>{formatPercent(confidence)}</strong>
          </div>
          <div className="experiment-details__progress-track" aria-hidden="true">
            <div
              className="experiment-details__progress-fill"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <p className="experiment-details__readiness-copy">{readinessLabel}</p>
        </article>
      </div>

      <div className="experiment-details__variants">
        {experiment.variants.map((variant) => (
          <article className="experiment-details__variant-card" key={variant.id}>
            <div className="experiment-details__variant-header">
              <div>
                <strong>{variant.name}</strong>
                <p>{variant.description}</p>
              </div>
              <span className="badge badge--neutral">
                {variant.isControl ? 'Control' : 'Variant'}
              </span>
            </div>

            <div className="experiment-details__kpis">
              <div>
                <span className="label">Visitors</span>
                <strong>{formatNumber(variant.visitors)}</strong>
              </div>
              <div>
                <span className="label">Conversions</span>
                <strong>{formatNumber(variant.conversions)}</strong>
              </div>
              <div>
                <span className="label">Conversion rate</span>
                <strong>{formatPercent(getVariantConversionRate(variant))}</strong>
              </div>
            </div>

            <div className="experiment-details__config">
              <div>
                <span className="label">Headline</span>
                <p>{variant.config.headline}</p>
              </div>
              <div>
                <span className="label">CTA</span>
                <p>{variant.config.ctaLabel}</p>
              </div>
              <div>
                <span className="label">Theme</span>
                <p>{variant.config.theme}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
