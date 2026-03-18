import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AudienceLibrary } from '../components/audiences/AudienceLibrary'
import { AudienceRuleBuilder } from '../components/audiences/AudienceRuleBuilder'
import { StatsCards } from '../components/dashboard/StatsCards'
import { ExperimentDetails } from '../components/experiments/ExperimentDetails'
import { ExperimentForm } from '../components/experiments/ExperimentForm'
import { ExperimentList } from '../components/experiments/ExperimentList'
import { VariantBuilder } from '../components/experiments/VariantBuilder'
import { AppShell } from '../components/layout/AppShell'
import { WorkbenchTabs } from '../components/layout/WorkbenchTabs'
import { ResultsSummary } from '../components/results/ResultsSummary'
import { SimulatorPanel } from '../components/simulator/SimulatorPanel'
import { mockAudiences } from '../data/mockAudiences'
import { mockExperiments } from '../data/mockExperiments'
import { buildExperimentWithEventResults } from '../lib/experimentEventResults'
import { clearDemoData } from '../lib/demoReset'
import {
  buildExperimentFromDraft,
  buildResultsDecisionSummary,
  createExperimentDraft,
  formatExperimentStatus,
  loadExperiments,
  saveExperiments,
} from '../lib/experiments'
import {
  createExperimentEvent,
  hasTrackedImpression,
  loadExperimentEvents,
  saveExperimentEvents,
} from '../lib/simulatorEvents'
import type { SimulationRequestContext, SimulationResult } from '../lib/simulator'
import { workbenchTabs } from '../lib/workbench'
import type { WorkbenchTab } from '../lib/workbench'
import type {
  ExperimentDraft,
  ExperimentDraftVariant,
  ExperimentEvent,
  ExperimentEventType,
  ExperimentStatus,
} from '../types/experiment'

interface EventTrackResult {
  ok: boolean
  message: string
}

export function PersonalizationWorkbench() {
  const [experiments, setExperiments] = useState(() => loadExperiments(mockExperiments))
  const [experimentEvents, setExperimentEvents] = useState<ExperimentEvent[]>(() =>
    loadExperimentEvents(),
  )
  const defaultExperiment = experiments[0]
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('Overview')
  const [selectedExperimentId, setSelectedExperimentId] = useState(
    defaultExperiment?.id ?? '',
  )
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | ExperimentStatus>('All')
  const [builderDraft, setBuilderDraft] = useState<ExperimentDraft>(() =>
    createExperimentDraft(mockAudiences),
  )

  useEffect(() => {
    saveExperiments(experiments)
  }, [experiments])

  useEffect(() => {
    saveExperimentEvents(experimentEvents)
  }, [experimentEvents])

  const selectedExperiment =
    experiments.find(({ id }) => id === selectedExperimentId) ?? defaultExperiment

  if (!selectedExperiment) {
    return null
  }

  const selectedExperimentView = buildExperimentWithEventResults(
    selectedExperiment,
    experimentEvents,
  )
  const selectedAudience = mockAudiences.find(
    ({ id }) => id === selectedExperimentView.audienceId,
  )
  const resultsDecisionSummary = buildResultsDecisionSummary(selectedExperimentView)

  const updateBuilderDraft = <K extends keyof ExperimentDraft>(
    field: K,
    value: ExperimentDraft[K],
  ) => {
    setBuilderDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const updateBuilderVariant = <K extends keyof Omit<ExperimentDraftVariant, 'id' | 'name'>>(
    variantId: string,
    field: K,
    value: ExperimentDraftVariant[K],
  ) => {
    setBuilderDraft((current) => ({
      ...current,
      variants: current.variants.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              [field]: value,
            }
          : variant,
      ),
    }))
  }

  const handleSaveExperiment = () => {
    const newExperiment = buildExperimentFromDraft(builderDraft, mockAudiences)

    setExperiments((current) => [newExperiment, ...current])
    setSelectedExperimentId(newExperiment.id)
    setSearch('')
    setStatusFilter('All')
    setActiveTab('Experiments')
    setBuilderDraft(createExperimentDraft(mockAudiences))
  }

  const handleResetDemo = () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        'Reset demo data? This clears saved experiments, sticky assignments, and simulator events.',
      )
    ) {
      return
    }

    clearDemoData()
    setExperiments(mockExperiments)
    setExperimentEvents([])
    setSelectedExperimentId(mockExperiments[0]?.id ?? '')
    setSearch('')
    setStatusFilter('All')
    setActiveTab('Overview')
    setBuilderDraft(createExperimentDraft(mockAudiences))
  }

  const handleTrackSimulatorEvent = ({
    eventType,
    request,
    simulationResult,
  }: {
    eventType: ExperimentEventType
    request: SimulationRequestContext
    simulationResult: SimulationResult
  }): EventTrackResult => {
    const experiment = simulationResult.matchedExperiment
    const variant = simulationResult.assignedVariant

    if (!experiment || !variant || !simulationResult.audienceMatched) {
      return {
        ok: false,
        message: 'Track events only after a running experiment assigns a valid variant.',
      }
    }

    if (
      eventType === 'conversion' &&
      !hasTrackedImpression(experimentEvents, {
        experimentId: experiment.id,
        variantId: variant.id,
        userKey: request.userKey,
        sessionId: request.sessionId,
      })
    ) {
      return {
        ok: false,
        message: 'Track an impression before recording a conversion for this assignment.',
      }
    }

    const newEvent = createExperimentEvent({
      experimentId: experiment.id,
      variant,
      userKey: request.userKey,
      sessionId: request.sessionId,
      eventType,
      pageUrl: request.pageUrl,
    })

    setExperimentEvents((current) => [newEvent, ...current])

    return {
      ok: true,
      message: `Tracked ${eventType} for ${variant.name} in ${experiment.name}.`,
    }
  }

  const tabContent = {
    Overview: (
      <div className="workbench-section">
        <StatsCards experiments={experiments} />
        <section className="content-grid content-grid--primary">
          <ExperimentDetails experiment={selectedExperimentView} />
          <ResultsSummary
            decisionSummary={resultsDecisionSummary}
            experimentName={selectedExperimentView.name}
            metricTrend={selectedExperimentView.metricTrend}
            segmentPerformance={selectedExperimentView.segmentPerformance}
          />
        </section>
      </div>
    ),
    Experiments: (
      <section className="content-grid content-grid--primary">
        <ExperimentList
          experiments={experiments}
          onSearchChange={setSearch}
          onSelectExperiment={setSelectedExperimentId}
          onStatusFilterChange={setStatusFilter}
          search={search}
          selectedExperimentId={selectedExperiment.id}
          statusFilter={statusFilter}
        />
        <ExperimentDetails experiment={selectedExperimentView} />
      </section>
    ),
    Builder: (
      <section className="content-grid">
        <ExperimentForm
          audiences={mockAudiences}
          draft={builderDraft}
          onDraftChange={updateBuilderDraft}
          onSaveExperiment={handleSaveExperiment}
        />
        <VariantBuilder
          onVariantChange={updateBuilderVariant}
          variants={builderDraft.variants}
        />
      </section>
    ),
    Audiences: (
      <section className="content-grid">
        <AudienceLibrary audiences={mockAudiences} selectedAudienceId={selectedAudience?.id} />
        <AudienceRuleBuilder />
      </section>
    ),
    Results: (
      <ResultsSummary
        decisionSummary={resultsDecisionSummary}
        experimentName={selectedExperimentView.name}
        metricTrend={selectedExperimentView.metricTrend}
        segmentPerformance={selectedExperimentView.segmentPerformance}
      />
    ),
    Simulator: (
      <SimulatorPanel
        audiences={mockAudiences}
        events={experimentEvents}
        experiments={experiments}
        onTrackEvent={handleTrackSimulatorEvent}
      />
    ),
  } satisfies Record<WorkbenchTab, ReactNode>

  return (
    <AppShell
      primaryActions={
        <>
          <span className={`badge badge--${selectedExperimentView.status}`}>
            {formatExperimentStatus(selectedExperimentView.status)}
          </span>
          <button className="button button--secondary" onClick={handleResetDemo} type="button">
            Reset demo
          </button>
          <button
            className="button button--primary"
            onClick={() => setActiveTab('Builder')}
            type="button"
          >
            Edit builder
          </button>
        </>
      }
      productName="Personalization Workbench"
      subtitle="Operate experiments, audience targeting, and decision workflows from a single frontend MVP."
    >
      <WorkbenchTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={workbenchTabs} />
      {tabContent[activeTab]}
    </AppShell>
  )
}

