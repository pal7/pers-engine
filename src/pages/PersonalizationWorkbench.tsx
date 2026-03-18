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
import {
  buildExperimentFromDraft,
  buildResultsDecisionSummary,
  createExperimentDraft,
  loadExperiments,
  saveExperiments,
} from '../lib/experiments'
import { workbenchTabs } from '../lib/workbench'
import type { WorkbenchTab } from '../lib/workbench'
import type { ExperimentDraft, ExperimentStatus } from '../types/experiment'

export function PersonalizationWorkbench() {
  const [experiments, setExperiments] = useState(() => loadExperiments(mockExperiments))
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

  const selectedExperiment =
    experiments.find(({ id }) => id === selectedExperimentId) ?? defaultExperiment

  if (!selectedExperiment) {
    return null
  }

  const selectedAudience = mockAudiences.find(
    ({ id }) => id === selectedExperiment.audienceId,
  )
  const resultsDecisionSummary = buildResultsDecisionSummary(selectedExperiment)

  const updateBuilderDraft = <K extends keyof ExperimentDraft>(
    field: K,
    value: ExperimentDraft[K],
  ) => {
    setBuilderDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const updateBuilderVariant = (
    variantId: string,
    field: 'headline' | 'ctaText' | 'theme' | 'notes',
    value: string,
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

  const tabContent = {
    Overview: (
      <div className="workbench-section">
        <StatsCards experiments={experiments} />
        <section className="content-grid content-grid--primary">
          <ExperimentDetails experiment={selectedExperiment} />
          <ResultsSummary
            decisionSummary={resultsDecisionSummary}
            experimentName={selectedExperiment.name}
            metricTrend={selectedExperiment.metricTrend}
            segmentPerformance={selectedExperiment.segmentPerformance}
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
        <ExperimentDetails experiment={selectedExperiment} />
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
        experimentName={selectedExperiment.name}
        metricTrend={selectedExperiment.metricTrend}
        segmentPerformance={selectedExperiment.segmentPerformance}
      />
    ),
    Simulator: <SimulatorPanel audiences={mockAudiences} experiments={experiments} />,
  } satisfies Record<WorkbenchTab, ReactNode>

  return (
    <AppShell
      primaryActions={
        <>
          <span className="badge badge--neutral">{selectedExperiment.status}</span>
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
