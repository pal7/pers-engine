import { useState } from 'react'
import {
  formatExperimentStatus,
  formatTargetMatchType,
} from '../../lib/experiments'
import { getExperimentEventsForContext } from '../../lib/simulatorEvents'
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

  const assignmentEvents =
    assignedExperiment && assignedVariant && simulationResult.audienceMatched
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
  const passedRuleCount = simulationResult.audienceRuleResults.filter(
    (result) => result.matched,
  ).length
  const failedRuleCount = simulationResult.audienceRuleResults.length - passedRuleCount

  const matchingExplanation = assignedExperiment
    ? simulationResult.audienceMatched
      ? `Matched because the request satisfied ${formatTargetMatchType(assignedExperiment.targetMatchType).toLowerCase()} targeting for ${assignedExperiment.targetUrlPattern}.`
      : `Matched ${assignedExperiment.name} on URL targeting, but the audience did not qualify this request.`
    : simulationResult.notes[0] ?? 'No eligible experiment matched this request.'

  const audienceExplanation = assignedExperiment
    ? simulationResult.audienceRuleResults.length > 0
      ? simulationResult.audienceMatched
        ? `Audience passed ${passedRuleCount} of ${simulationResult.audienceRuleResults.length} evaluated rules.`
        : `Audience failed ${failedRuleCount} of ${simulationResult.audienceRuleResults.length} evaluated rules.`
      : simulationResult.audienceMatched
        ? 'Audience qualified for delivery.'
        : 'Audience was not evaluated for delivery.'
    : 'Audience evaluation was skipped because no eligible experiment matched.'

  const assignmentExplanation = assignedVariant
    ? `Assignment was ${formatAssignmentState(simulationResult.assignmentState).toLowerCase()} and returned ${assignedVariant.name}.`
    : 'No variant was returned because the request did not qualify for delivery.'

  const variantReason = assignedVariant
    ? simulationResult.notes.find(
        (note) =>
          note.includes('Reused stored assignment') ||
          note.includes('Assigned a new variant') ||
          note.includes('Created and stored a new assignment'),
      ) ?? `Returned ${assignedVariant.name} for this request.`
    : 'No assignment note is available for this request.'

  const decisionNotes = [
    matchingExplanation,
    audienceExplanation,
    assignmentExplanation,
    variantReason,
  ]

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
            <p>Structured delivery explanation based on the current frontend state.</p>
          </div>
        </div>

        <div className="simulator-result__sections">
          <article className="simulator-result__section-card">
            <div className="simulator-result__section-header">
              <h3>Request Context</h3>
              <p>Inputs used for this decision.</p>
            </div>
            <div className="simulator-result__detail-grid">
              <div>
                <span className="label">Page URL</span>
                <p>{request.pageUrl}</p>
              </div>
              <div>
                <span className="label">User key</span>
                <p>{request.userKey || 'anonymous'}</p>
              </div>
              <div>
                <span className="label">Session id</span>
                <p>{request.sessionId || 'anonymous'}</p>
              </div>
              <div>
                <span className="label">Device</span>
                <p>{request.device}</p>
              </div>
              <div>
                <span className="label">Country</span>
                <p>{request.country}</p>
              </div>
              <div>
                <span className="label">Returning user</span>
                <p>{request.isReturningUser ? 'True' : 'False'}</p>
              </div>
            </div>
          </article>

          <article className="simulator-result__section-card">
            <div className="simulator-result__section-header">
              <h3>Matching Experiment</h3>
              <p>Experiment targeting and eligibility outcome.</p>
            </div>
            <div className="simulator-result__detail-grid">
              <div>
                <span className="label">Experiment</span>
                <p>{assignedExperiment?.name ?? 'No eligible experiment'}</p>
              </div>
              <div>
                <span className="label">Status</span>
                <p>
                  {simulationResult.experimentStatus === 'noMatch'
                    ? 'No match'
                    : formatExperimentStatus(simulationResult.experimentStatus)}
                </p>
              </div>
              <div>
                <span className="label">Match type</span>
                <p>
                  {assignedExperiment
                    ? formatTargetMatchType(assignedExperiment.targetMatchType)
                    : 'Not evaluated'}
                </p>
              </div>
              <div>
                <span className="label">Target URL</span>
                <p>{assignedExperiment?.targetUrlPattern ?? 'Not applicable'}</p>
              </div>
            </div>
            <p className="simulator-result__section-copy">{matchingExplanation}</p>
          </article>

          <article className="simulator-result__section-card">
            <div className="simulator-result__section-header">
              <h3>Audience Evaluation</h3>
              <p>Whether the request qualified for audience delivery.</p>
            </div>
            <div className="simulator-result__detail-grid">
              <div>
                <span className="label">Audience matched</span>
                <p>{simulationResult.audienceMatched ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <span className="label">Rules passed</span>
                <p>{String(passedRuleCount)}</p>
              </div>
              <div>
                <span className="label">Rules failed</span>
                <p>{String(failedRuleCount)}</p>
              </div>
              <div>
                <span className="label">Rules evaluated</span>
                <p>{String(simulationResult.audienceRuleResults.length)}</p>
              </div>
            </div>
            <p className="simulator-result__section-copy">{audienceExplanation}</p>
            {simulationResult.audienceRuleResults.length > 0 ? (
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
            ) : null}
          </article>

          <article className="simulator-result__section-card">
            <div className="simulator-result__section-header">
              <h3>Variant Assignment</h3>
              <p>Returned treatment and assignment behavior.</p>
            </div>
            <div className="simulator-result__detail-grid">
              <div>
                <span className="label">Assigned variant</span>
                <p>{assignedVariant?.name ?? 'None'}</p>
              </div>
              <div>
                <span className="label">Assignment state</span>
                <p>{formatAssignmentState(simulationResult.assignmentState)}</p>
              </div>
              <div>
                <span className="label">Impressions</span>
                <p>{String(impressionCount)}</p>
              </div>
              <div>
                <span className="label">Conversions</span>
                <p>{String(conversionCount)}</p>
              </div>
            </div>
            <p className="simulator-result__section-copy">{assignmentExplanation}</p>

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

            {trackingMessage ? (
              <p className="simulator-result__action-copy">{trackingMessage}</p>
            ) : null}

            {hasAssignedVariant ? (
              assignmentEvents.length > 0 ? (
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
              )
            ) : null}
          </article>

          <article className="simulator-result__section-card">
            <div className="simulator-result__section-header">
              <h3>Decision Notes</h3>
              <p>Concise explanation of the delivery outcome.</p>
            </div>
            <div className="stack">
              {decisionNotes.map((note) => (
                <article className="simulator-result__note" key={note}>
                  <p>{note}</p>
                </article>
              ))}
              {simulationResult.notes
                .filter((note) => !decisionNotes.includes(note))
                .map((note) => (
                  <article className="simulator-result__note" key={note}>
                    <p>{note}</p>
                  </article>
                ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
