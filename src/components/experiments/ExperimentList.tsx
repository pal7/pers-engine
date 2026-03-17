import { formatPercent, formatSignedPercent } from '../../lib/formatters'
import type { Experiment, ExperimentStatus } from '../../types/experiment'

interface ExperimentListProps {
  experiments: Experiment[]
  selectedExperimentId: string
  onSelectExperiment: (experimentId: string) => void
  search: string
  onSearchChange: (value: string) => void
  statusFilter: 'All' | ExperimentStatus
  onStatusFilterChange: (value: 'All' | ExperimentStatus) => void
}

const statusOptions: Array<'All' | ExperimentStatus> = [
  'All',
  'Draft',
  'Running',
  'Paused',
  'Completed',
]

export function ExperimentList({
  experiments,
  selectedExperimentId,
  onSelectExperiment,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: ExperimentListProps) {
  const normalizedSearch = search.trim().toLowerCase()
  const filteredExperiments = experiments.filter((experiment) => {
    const matchesStatus =
      statusFilter === 'All' || experiment.status === statusFilter
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [
        experiment.name,
        experiment.page,
        experiment.audienceName,
        experiment.primaryMetric,
        experiment.type,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)

    return matchesStatus && matchesSearch
  })

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Experiments</h2>
          <p>Search and review tests across the personalization program.</p>
        </div>
      </div>

      <div className="experiment-list__controls">
        <input
          aria-label="Search experiments"
          className="experiment-list__search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search experiments"
          type="search"
          value={search}
        />
        <select
          aria-label="Filter by status"
          className="experiment-list__filter"
          onChange={(event) =>
            onStatusFilterChange(event.target.value as 'All' | ExperimentStatus)
          }
          value={statusFilter}
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="experiment-list">
        {filteredExperiments.map((experiment) => {
          const isSelected = experiment.id === selectedExperimentId

          return (
            <button
              className={`experiment-list__item${isSelected ? ' is-selected' : ''}`}
              key={experiment.id}
              onClick={() => onSelectExperiment(experiment.id)}
              type="button"
            >
              <div className="experiment-list__title-row">
                <strong>{experiment.name}</strong>
                <span className={`badge badge--${experiment.status.toLowerCase()}`}>
                  {experiment.status}
                </span>
              </div>

              <div className="experiment-list__details">
                <div className="experiment-list__detail">
                  <span>Page</span>
                  <strong>{experiment.page}</strong>
                </div>
                <div className="experiment-list__detail">
                  <span>Audience</span>
                  <strong>{experiment.audienceName}</strong>
                </div>
                <div className="experiment-list__detail">
                  <span>Metric</span>
                  <strong>{experiment.primaryMetric}</strong>
                </div>
                <div className="experiment-list__detail">
                  <span>Type</span>
                  <strong>{experiment.type}</strong>
                </div>
                <div className="experiment-list__detail">
                  <span>Lift</span>
                  <strong>{formatSignedPercent(experiment.results.lift)}</strong>
                </div>
                <div className="experiment-list__detail">
                  <span>Confidence</span>
                  <strong>{formatPercent(experiment.results.confidence)}</strong>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {filteredExperiments.length === 0 ? (
        <p className="experiment-list__empty">No experiments match the current filters.</p>
      ) : null}
    </section>
  )
}
