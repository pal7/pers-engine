import { useState } from 'react'
import type { ReactNode } from 'react'
import { AudienceLibrary } from '../components/audiences/AudienceLibrary'
import { AudienceRuleBuilder } from '../components/audiences/AudienceRuleBuilder'
import { StatsCards } from '../components/dashboard/StatsCards'
import { AppShell } from '../components/layout/AppShell'
import { WorkbenchTabs } from '../components/layout/WorkbenchTabs'
import { ExperimentDetails } from '../components/experiments/ExperimentDetails'
import { ExperimentForm } from '../components/experiments/ExperimentForm'
import { ExperimentList } from '../components/experiments/ExperimentList'
import { VariantBuilder } from '../components/experiments/VariantBuilder'
import { ResultsSummary } from '../components/results/ResultsSummary'
import { mockAudiences } from '../data/mockAudiences'
import { mockExperiments } from '../data/mockExperiments'
import { buildResultsDecisionSummary } from '../lib/experiments'
import { workbenchTabs } from '../lib/workbench'
import type { WorkbenchTab } from '../lib/workbench'
import type { ExperimentStatus } from '../types/experiment'

export function PersonalizationWorkbench() {
  const defaultExperiment = mockExperiments[0]
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('Overview')
  const [selectedExperimentId, setSelectedExperimentId] = useState(
    defaultExperiment?.id ?? '',
  )
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | ExperimentStatus>('All')

  const selectedExperiment =
    mockExperiments.find(({ id }) => id === selectedExperimentId) ??
    defaultExperiment

  if (!selectedExperiment) {
    return null
  }

  const selectedAudience = mockAudiences.find(
    ({ id }) => id === selectedExperiment.audienceId,
  )
  const resultsDecisionSummary = buildResultsDecisionSummary(selectedExperiment)

  const tabContent = {
    Overview: (
      <div className="workbench-section">
        <StatsCards experiments={mockExperiments} />
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
          experiments={mockExperiments}
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
        <ExperimentForm audiences={mockAudiences} experiment={selectedExperiment} />
        <VariantBuilder />
      </section>
    ),
    Audiences: (
      <section className="content-grid">
        <AudienceLibrary
          audiences={mockAudiences}
          selectedAudienceId={selectedAudience?.id}
        />
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
      <WorkbenchTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={workbenchTabs}
      />
      {tabContent[activeTab]}
    </AppShell>
  )
}
