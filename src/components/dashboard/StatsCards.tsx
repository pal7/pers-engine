import { formatSignedPercent } from '../../lib/formatters'
import type { Experiment } from '../../types/experiment'

interface StatsCardsProps {
  experiments: Experiment[]
}

export function StatsCards({ experiments }: StatsCardsProps) {
  const totalExperiments = experiments.length
  const activeExperiments = experiments.filter(
    ({ status }) => status === 'running',
  ).length
  const winningExperiments = experiments.filter(
    ({ results }) => results.lift > 0,
  ).length
  const averageUplift =
    totalExperiments === 0
      ? 0
      : experiments.reduce((total, experiment) => total + experiment.results.lift, 0) /
        totalExperiments

  const stats = [
    { label: 'Total experiments', value: String(totalExperiments) },
    { label: 'Active experiments', value: String(activeExperiments) },
    { label: 'Winning experiments', value: String(winningExperiments) },
    { label: 'Average uplift', value: formatSignedPercent(averageUplift) },
  ]

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Overview</h2>
          <p>Quick performance stats across the current experiment set.</p>
        </div>
      </div>
      <div className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <p className="stat-card__label">{stat.label}</p>
            <strong className="stat-card__value">{stat.value}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
