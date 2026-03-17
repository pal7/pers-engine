import type {
  Audience,
  ExperimentDraft,
  ExperimentStatus,
  ExperimentType,
} from '../../types/experiment'

interface ExperimentFormProps {
  audiences: Audience[]
  draft: ExperimentDraft
  onDraftChange: <K extends keyof ExperimentDraft>(
    field: K,
    value: ExperimentDraft[K],
  ) => void
  onSaveExperiment: () => void
}

const experimentTypeOptions: ExperimentType[] = [
  'A/B Test',
  'Feature Experiment',
  'Personalization',
]
const experimentStatusOptions: ExperimentStatus[] = [
  'Draft',
  'Running',
  'Paused',
  'Completed',
]

export function ExperimentForm({
  audiences,
  draft,
  onDraftChange,
  onSaveExperiment,
}: ExperimentFormProps) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Experiment setup</h2>
          <p>Frontend-only draft form for configuring a new experiment.</p>
        </div>
      </div>

      <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
        <label className="field field--full">
          <span>Experiment name</span>
          <input
            onChange={(event) => onDraftChange('experimentName', event.target.value)}
            type="text"
            value={draft.experimentName}
          />
        </label>

        <label className="field field--full">
          <span>Page URL or pattern</span>
          <input
            onChange={(event) => onDraftChange('pageUrl', event.target.value)}
            placeholder="https://app.example.com/pricing or /pricing/*"
            type="text"
            value={draft.pageUrl}
          />
        </label>

        <label className="field">
          <span>Experiment type</span>
          <select
            className="field__control"
            onChange={(event) =>
              onDraftChange('experimentType', event.target.value as ExperimentType)
            }
            value={draft.experimentType}
          >
            {experimentTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Status</span>
          <select
            className="field__control"
            onChange={(event) =>
              onDraftChange('status', event.target.value as ExperimentStatus)
            }
            value={draft.status}
          >
            {experimentStatusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Primary metric</span>
          <input
            onChange={(event) => onDraftChange('primaryMetric', event.target.value)}
            type="text"
            value={draft.primaryMetric}
          />
        </label>

        <label className="field">
          <span>Audience</span>
          <select
            className="field__control"
            onChange={(event) => onDraftChange('audienceId', event.target.value)}
            value={draft.audienceId}
          >
            {audiences.map((audience) => (
              <option key={audience.id} value={audience.id}>
                {audience.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--full">
          <span>Traffic allocation</span>
          <input
            max="100"
            min="1"
            onChange={(event) =>
              onDraftChange('trafficAllocation', Number(event.target.value) || 0)
            }
            type="number"
            value={draft.trafficAllocation}
          />
        </label>

        <div className="form-actions field--full">
          <button className="button button--primary" onClick={onSaveExperiment} type="button">
            Save experiment
          </button>
        </div>
      </form>
    </section>
  )
}
