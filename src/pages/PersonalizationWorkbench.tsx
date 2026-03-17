import { useState } from 'react'
import { AudienceLibrary } from '../components/audiences/AudienceLibrary'
import { AudienceRuleBuilder } from '../components/audiences/AudienceRuleBuilder'
import { StatsCards } from '../components/dashboard/StatsCards'
import { AppShell } from '../components/layout/AppShell'
import { ExperimentDetails } from '../components/experiments/ExperimentDetails'
import { ExperimentForm } from '../components/experiments/ExperimentForm'
import { ExperimentList } from '../components/experiments/ExperimentList'
import { VariantBuilder } from '../components/experiments/VariantBuilder'
import { ResultsSummary } from '../components/results/ResultsSummary'
import { mockAudiences } from '../data/mockAudiences'
import { mockExperiments } from '../data/mockExperiments'
import { formatPercent, formatSignedPercent } from '../lib/formatters'
import type { Experiment, ExperimentStatus, Variant } from '../types/experiment'

type WorkbenchTab =
  | 'Overview'
  | 'Experiments'
  | 'Builder'
  | 'Audiences'
  | 'Results'

const tabs: WorkbenchTab[] = [
  'Overview',
  'Experiments',
  'Builder',
  'Audiences',
  'Results',
]

const getVariantConversionRate = (variant: Variant) =>
  variant.visitors === 0 ? 0 : variant.conversions / variant.visitors

const buildResultsSummaryProps = (experiment: Experiment) => {
  const recommendedWinner = experiment.variants.reduce((best, variant) =>
    getVariantConversionRate(variant) > getVariantConversionRate(best) ? variant : best,
  )
  const bestSegment = experiment.segmentPerformance.reduce((best, segment) =>
    segment.lift > best.lift ? segment : best,
  )
  const strongestMetric = `${experiment.primaryMetric} at ${formatPercent(
    experiment.results.conversionRate,
  )}`
  const bestPattern = `${bestSegment.segmentName} shows ${formatSignedPercent(
    bestSegment.lift,
  )} lift`
  const nextAction =
    experiment.results.confidence >= 0.95
      ? 'Ship the winner to eligible traffic and monitor guardrails.'
      : experiment.results.confidence >= 0.85
        ? 'Keep the test running until the signal is stable across more sessions.'
        : 'Hold rollout and collect more traffic before making a launch decision.'

  return {
    decisionSummary: {
      bestPattern,
      nextAction,
      recommendedWinner: recommendedWinner.name,
      strongestMetric,
    },
    experimentName: experiment.name,
    metricTrend: experiment.metricTrend,
    segmentPerformance: experiment.segmentPerformance,
  }
}

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
  const resultsSummaryProps = buildResultsSummaryProps(selectedExperiment)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <div className="workbench-section">
            <StatsCards experiments={mockExperiments} />
            <section className="content-grid content-grid--primary">
              <ExperimentDetails experiment={selectedExperiment} />
              <ResultsSummary {...resultsSummaryProps} />
            </section>
          </div>
        )
      case 'Experiments':
        return (
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
        )
      case 'Builder':
        return (
          <section className="content-grid">
            <ExperimentForm audiences={mockAudiences} experiment={selectedExperiment} />
            <VariantBuilder />
          </section>
        )
      case 'Audiences':
        return (
          <section className="content-grid">
            <AudienceLibrary
              audiences={mockAudiences}
              selectedAudienceId={selectedAudience?.id}
            />
            <AudienceRuleBuilder />
          </section>
        )
      case 'Results':
        return <ResultsSummary {...resultsSummaryProps} />
      default:
        return null
    }
  }

  return (
    <AppShell
      primaryActions={
        <>
          <span className="badge badge--neutral">{selectedExperiment.status}</span>
          <button className="button button--primary" onClick={() => setActiveTab('Builder')} type="button">
            Edit builder
          </button>
        </>
      }
      productName="Personalization Workbench"
      subtitle="Operate experiments, audience targeting, and decision workflows from a single frontend MVP."
    >
      <nav aria-label="Workbench sections" className="workbench-tabs">
        {tabs.map((tab) => (
          <button
            className={`workbench-tab${tab === activeTab ? ' is-active' : ''}`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>
      {renderTabContent()}
    </AppShell>
  )
}
