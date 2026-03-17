import { formatPercent, formatSignedPercent } from '../../lib/formatters'
import type {
  MetricTrendPoint,
  SegmentPerformancePoint,
} from '../../types/experiment'

interface DecisionSummary {
  recommendedWinner: string
  strongestMetric: string
  bestPattern: string
  nextAction: string
}

interface ResultsSummaryProps {
  experimentName: string
  metricTrend: MetricTrendPoint[]
  segmentPerformance: SegmentPerformancePoint[]
  decisionSummary: DecisionSummary
}

export function ResultsSummary({
  experimentName,
  metricTrend,
  segmentPerformance,
  decisionSummary,
}: ResultsSummaryProps) {
  const maxLift = Math.max(
    ...segmentPerformance.map(({ lift }) => Math.abs(lift)),
    0.01,
  )

  const decisionCards = [
    { label: 'Recommended winner', value: decisionSummary.recommendedWinner },
    { label: 'Strongest metric', value: decisionSummary.strongestMetric },
    { label: 'Best pattern', value: decisionSummary.bestPattern },
    { label: 'Next action', value: decisionSummary.nextAction },
  ]

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Results summary</h2>
          <p>Decision-ready snapshot for {experimentName}.</p>
        </div>
      </div>

      <div className="results-summary__layout">
        <article className="results-summary__chart-card">
          <div className="results-summary__chart-header">
            <div>
              <span className="label">Segment lift chart</span>
              <p>Current chart integration point for segment-level performance.</p>
            </div>
          </div>

          <div className="results-summary__chart-surface" aria-label="Segment lift chart placeholder">
            <div className="results-summary__chart-grid" aria-hidden="true" />
            <div className="results-summary__chart-bars">
              {segmentPerformance.map((segment) => {
                const barHeight = `${Math.max((Math.abs(segment.lift) / maxLift) * 100, 18)}%`

                return (
                  <div className="results-summary__chart-column" key={segment.id}>
                    <span className="results-summary__chart-value">
                      {formatSignedPercent(segment.lift)}
                    </span>
                    <div className="results-summary__chart-bar-wrap">
                      <div
                        className="results-summary__chart-bar"
                        style={{ height: barHeight }}
                      />
                    </div>
                    <strong>{segment.segmentName}</strong>
                    <span>{formatPercent(segment.conversionRate)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="results-summary__chart-footer">
            {metricTrend.map((point) => (
              <div className="results-summary__trend-point" key={point.date}>
                <span>{point.date}</span>
                <strong>{formatPercent(point.value)}</strong>
              </div>
            ))}
          </div>
        </article>

        <div className="results-summary__decisions">
          {decisionCards.map((card) => (
            <article className="results-summary__decision-card" key={card.label}>
              <span className="label">{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
