import { useState } from 'react'
import { formatExperimentStatus } from '../../lib/experiments'
import {
  getExperimentEventsForContext,
} from '../../lib/simulatorEvents'
import {
  createSimulationRequest,
  formatAssignmentState,
  simulatorDeviceOptions,
  simulateExperimentDecision,
} from '../../lib/simulator'
import type {
  SimulationRequestContext,
  SimulationResult,
  SimulatorDevice,
} from '../../lib/simulator'
import type {
  Audience,
  Experiment,
  ExperimentEvent,
  ExperimentEventType,
} from '../../types/experiment'

interface EventTrackResult {
  ok: boolean
  message: string
}

interface SimulatorPanelProps {
  experiments: Experiment[]
  audiences: Audience[]
  events: ExperimentEvent[]
  onTrackEvent: (input: {
    eventType: ExperimentEventType
    request: SimulationRequestContext
    simulationResult: SimulationResult
  }) => EventTrackResult
}

export function SimulatorPanel({
  experiments,
  audiences,
  events,
  onTrackEvent,
}: SimulatorPanelProps) {
  const [request, setRequest] = useState<SimulationRequestContext>(() =>
    createSimulationRequest(),
  )
  const [trackingMessage, setTrackingMessage] = useState('')
  const simulationResult = simulateExperimentDecision(experiments, audiences, request)

  const updateRequest = <K extends keyof SimulationRequestContext>(
    field: K,
    value: SimulationRequestContext[K],
  ) => {
    setRequest((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const assignedExperiment = simulationResult.matchedExperiment
  const assignedVariant = simulationResult.assignedVariant
  const hasAssignedVariant =
    assignedExperiment !== null &&
    assignedVariant !== null &&
    simulationResult.audienceMatched

  const assignmentEvents = assignedExperiment && assignedVariant && simulationResult.audienceMatched
    ? getExperimentEventsForContext(events, {
        experimentId: assignedExperiment.id,
        variantId: assignedVariant.id,
        userKey: request.userKey,
        sessionId: request.sessionId,
      })
    : []
  const impressionCount = assignmentEvents.filter(
    (event) => event.eventType === 'impression',
  ).length
  const conversionCount = assignmentEvents.filter(
    (event) => event.eventType === 'conversion',
  ).length
  const canTrackConversion = hasAssignedVariant && impressionCount > 0

  const handleTrackEvent = (eventType: ExperimentEventType) => {
    const result = onTrackEvent({
      eventType,
      request,
      simulationResult,
    })

    setTrackingMessage(result.message)
  }

  return (
    <div className="simulator-grid">
      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>Request simulator</h2>
            <p>Preview how the frontend decision flow would evaluate an incoming page request.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
          <label className="field field--full">
            <span>Page URL</span>
            <input
              onChange={(event) => updateRequest('pageUrl', event.target.value)}
              placeholder="https://app.example.com/pricing or /pricing"
              type="text"
              value={request.pageUrl}
            />
          </label>

          <label className="field">
            <span>User key</span>
            <input
              onChange={(event) => updateRequest('userKey', event.target.value)}
              type="text"
              value={request.userKey}
            />
          </label>

          <label className="field">
            <span>Session id</span>
            <input
              onChange={(event) => updateRequest('sessionId', event.target.value)}
              type="text"
              value={request.sessionId}
            />
          </label>

          <label className="field">
            <span>Device</span>
            <select
              className="field__control"
              onChange={(event) =>
                updateRequest('device', event.target.value as SimulatorDevice)
              }
              value={request.device}
            >
              {simulatorDeviceOptions.map((device) => (
                <option key={device} value={device}>
                  {device}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Country</span>
            <input
              onChange={(event) => updateRequest('country', event.target.value)}
              type="text"
              value={request.country}
            />
          </label>

          <label className="field field--full">
            <span>Returning user</span>
            <select
              className="field__control"
              onChange={(event) =>
                updateRequest('isReturningUser', event.target.value === 'true')
              }
              value={String(request.isReturningUser)}
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </label>
        </form>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>Simulation result</h2>
            <p>Result based on the current in-memory experiments and audiences.</p>
          </div>
        </div>

        <div className="simulator-result__summary">
          <article className="simulator-result__card">
            <span className="label">Matched experiment</span>
            <strong>
              {simulationResult.matchedExperiment?.name ?? 'No experiment matched'}
            </strong>
          </article>
          <article className="simulator-result__card">
            <span className="label">Experiment status</span>
            <strong>
              {simulationResult.experimentStatus === 'noMatch'
                ? 'No match'
                : formatExperimentStatus(simulationResult.experimentStatus)}
            </strong>
          </article>
          <article className="simulator-result__card">
            <span className="label">Audience matched</span>
            <strong>{simulationResult.audienceMatched ? 'Yes' : 'No'}</strong>
          </article>
          <article className="simulator-result__card">
            <span className="label">Assigned variant</span>
            <strong>{simulationResult.assignedVariant?.name ?? 'None'}</strong>
          </article>
          <article className="simulator-result__card">
            <span className="label">Assignment state</span>
            <strong>{formatAssignmentState(simulationResult.assignmentState)}</strong>
          </article>
        </div>

        <div className="simulator-result__actions">
          <button
            className="button button--primary"
            disabled={!hasAssignedVariant}
            onClick={() => handleTrackEvent('impression')}
            type="button"
          >
            Track Impression
          </button>
          <button
            className="button simulator-result__secondary-action"
            disabled={!canTrackConversion}
            onClick={() => handleTrackEvent('conversion')}
            type="button"
          >
            Track Conversion
          </button>
        </div>

        <p className="simulator-result__action-copy">
          {hasAssignedVariant
            ? canTrackConversion
              ? 'This assignment can record both impression and conversion events.'
              : 'Track an impression before recording a conversion event.'
            : 'Event tracking is available only after a running experiment assigns a valid variant.'}
        </p>

        {trackingMessage ? <p className="simulator-result__action-copy">{trackingMessage}</p> : null}

        {hasAssignedVariant ? (
          <div className="simulator-result__notes">
            <span className="label">Tracked events for this assignment</span>
            <div className="simulator-result__summary simulator-result__summary--compact">
              <article className="simulator-result__card">
                <span className="label">Impressions</span>
                <strong>{String(impressionCount)}</strong>
              </article>
              <article className="simulator-result__card">
                <span className="label">Conversions</span>
                <strong>{String(conversionCount)}</strong>
              </article>
            </div>
            {assignmentEvents.length > 0 ? (
              <div className="stack">
                {assignmentEvents.slice(0, 5).map((event) => (
                  <article className="simulator-result__note" key={event.id}>
                    <div className="simulator-result__note-header">
                      <strong>{event.variantName}</strong>
                      <span className={`badge badge--${event.eventType === 'conversion' ? 'completed' : 'running'}`}>
                        {event.eventType}
                      </span>
                    </div>
                    <p>{`${event.pageUrl} at ${event.timestamp}`}</p>
                  </article>
                ))}
              </div>
            ) : (
              <article className="simulator-result__note">
                <p>No events tracked yet for this assigned variant.</p>
              </article>
            )}
          </div>
        ) : null}

        {simulationResult.audienceRuleResults.length > 0 ? (
          <div className="simulator-result__notes">
            <span className="label">Audience rule evaluation</span>
            <div className="stack">
              {simulationResult.audienceRuleResults.map((result) => (
                <article className="simulator-result__note" key={result.ruleId}>
                  <div className="simulator-result__note-header">
                    <strong>{result.field}</strong>
                    <span className={`badge badge--${result.matched ? 'completed' : 'paused'}`}>
                      {result.matched ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                  <p>{result.note}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <div className="simulator-result__notes">
          <span className="label">Reason / evaluation notes</span>
          <div className="stack">
            {simulationResult.notes.map((note) => (
              <article className="simulator-result__note" key={note}>
                <p>{note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

