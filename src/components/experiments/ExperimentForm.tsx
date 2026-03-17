import { useEffect, useState } from 'react'
import {
  buildExperimentPageUrl,
  getTotalTrafficAllocation,
} from '../../lib/experiments'
import type { Audience, Experiment, ExperimentType } from '../../types/experiment'

interface ExperimentFormProps {
  experiment: Experiment
  audiences: Audience[]
}

interface ExperimentFormState {
  experimentName: string
  pageUrl: string
  experimentType: ExperimentType
  primaryMetric: string
  audienceId: string
  trafficAllocation: number
  guardrailEnabled: boolean
  guardrailType: string
  threshold: string
}

const defaultGuardrailType = 'Bounce rate'
const experimentTypeOptions: ExperimentType[] = [
  'A/B Test',
  'Feature Experiment',
  'Personalization',
]
const guardrailTypeOptions = [
  'Bounce rate',
  'Exit rate',
  'Error rate',
  'Latency',
]

const createInitialState = (experiment: Experiment): ExperimentFormState => ({
  experimentName: experiment.name,
  pageUrl: buildExperimentPageUrl(experiment.page),
  experimentType: experiment.type,
  primaryMetric: experiment.primaryMetric,
  audienceId: experiment.audienceId,
  trafficAllocation: getTotalTrafficAllocation(experiment.variants),
  guardrailEnabled: true,
  guardrailType: defaultGuardrailType,
  threshold: '5%',
})

export function ExperimentForm({ experiment, audiences }: ExperimentFormProps) {
  const [formState, setFormState] = useState<ExperimentFormState>(() =>
    createInitialState(experiment),
  )

  useEffect(() => {
    setFormState(createInitialState(experiment))
  }, [experiment])

  const updateField = <K extends keyof ExperimentFormState>(
    field: K,
    value: ExperimentFormState[K],
  ) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }))
  }

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
            onChange={(event) => updateField('experimentName', event.target.value)}
            type="text"
            value={formState.experimentName}
          />
        </label>

        <label className="field field--full">
          <span>Page URL</span>
          <input
            onChange={(event) => updateField('pageUrl', event.target.value)}
            placeholder="https://app.example.com/pricing"
            type="url"
            value={formState.pageUrl}
          />
        </label>

        <label className="field">
          <span>Experiment type</span>
          <select
            className="field__control"
            onChange={(event) =>
              updateField('experimentType', event.target.value as ExperimentType)
            }
            value={formState.experimentType}
          >
            {experimentTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Primary metric</span>
          <input
            onChange={(event) => updateField('primaryMetric', event.target.value)}
            type="text"
            value={formState.primaryMetric}
          />
        </label>

        <label className="field">
          <span>Audience</span>
          <select
            className="field__control"
            onChange={(event) => updateField('audienceId', event.target.value)}
            value={formState.audienceId}
          >
            {audiences.map((audience) => (
              <option key={audience.id} value={audience.id}>
                {audience.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Traffic allocation</span>
          <input
            max="100"
            min="1"
            onChange={(event) =>
              updateField('trafficAllocation', Number(event.target.value) || 0)
            }
            type="number"
            value={formState.trafficAllocation}
          />
        </label>

        <label className="field field--full field--checkbox">
          <span>Guardrail enabled</span>
          <label className="checkbox-row">
            <input
              checked={formState.guardrailEnabled}
              onChange={(event) =>
                updateField('guardrailEnabled', event.target.checked)
              }
              type="checkbox"
            />
            <span>Pause the experiment if the guardrail metric crosses the threshold.</span>
          </label>
        </label>

        <label className="field">
          <span>Guardrail type</span>
          <select
            className="field__control"
            disabled={!formState.guardrailEnabled}
            onChange={(event) => updateField('guardrailType', event.target.value)}
            value={formState.guardrailType}
          >
            {guardrailTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Threshold</span>
          <input
            disabled={!formState.guardrailEnabled}
            onChange={(event) => updateField('threshold', event.target.value)}
            placeholder="5%"
            type="text"
            value={formState.threshold}
          />
        </label>
      </form>
    </section>
  )
}
