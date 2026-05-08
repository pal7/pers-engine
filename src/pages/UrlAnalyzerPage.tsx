import { useEffect, useState } from 'react'
import { UrlAnalyzerForm } from '../components/analyzer/UrlAnalyzerForm'
import { UrlAnalyzerResult } from '../components/analyzer/UrlAnalyzerResult'
import { UrlAnalyzerStatus } from '../components/analyzer/UrlAnalyzerStatus'
import { AppShell } from '../components/layout/AppShell'
import { submitAnalysis, submitExperiments } from '../lib/analysisApi'
import type { AnalysisExperiment, AnalysisResponse, AnalysisStatus } from '../types/analysis'

const analysisProgressSteps = [
  'Validating website URL',
  'Capturing page structure',
  'Reviewing conversion signals',
]

type ExperimentStatus = 'idle' | 'loading' | 'success' | 'error'

export function UrlAnalyzerPage() {
  const [rawUrl, setRawUrl] = useState('')
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [experimentStatus, setExperimentStatus] = useState<ExperimentStatus>('idle')
  const [experiments, setExperiments] = useState<AnalysisExperiment[] | null>(null)

  useEffect(() => {
    if (status !== 'loading') {
      return
    }

    const intervalId = window.setInterval(() => {
      setCurrentStepIndex((currentIndex) =>
        currentIndex < analysisProgressSteps.length - 2
          ? currentIndex + 1
          : analysisProgressSteps.length - 1,
      )
    }, 2800)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [status])

  const handleSubmit = async (normalizedUrl: string) => {
    setCurrentStepIndex(0)
    setStatus('loading')
    setErrorMessage('')
    setResult(null)
    setExperiments(null)
    setExperimentStatus('idle')

    try {
      const response = await submitAnalysis({ url: normalizedUrl })
      setResult(response)
      setStatus('success')
      setExperimentStatus('idle')
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while analyzing that website.',
      )
    }
  }

  const handleGenerateExperiments = async () => {
    if (!result) return
    setExperimentStatus('loading')

    try {
      const response = await submitExperiments({
        issues: result.issues,
        techStack: result.techStack,
        evidence: result.evidence,
        pageContext: {
          url: result.analyzedUrl,
          summary: result.summary,
          pageType: result.evidence.pageType,
          heroText: result.evidence.heroText,
          ctaTexts: result.extractedSignals.ctaTexts,
          pageText: '',
          trustSignalKeywords: [],
        },
      })
      setExperiments(response.experiments)
      setExperimentStatus('success')
    } catch (error) {
      setExperimentStatus('error')
    }
  }

  return (
    <AppShell hideHeader>
      <div className="url-analyzer-page">
        <UrlAnalyzerForm
          onChange={setRawUrl}
          onSubmit={handleSubmit}
          status={status}
          value={rawUrl}
        />
        <UrlAnalyzerStatus
          currentStep={status === 'loading' ? analysisProgressSteps[currentStepIndex] : undefined}
          currentStepIndex={status === 'loading' ? currentStepIndex : undefined}
          errorMessage={errorMessage}
          status={status}
          steps={status === 'loading' ? analysisProgressSteps : undefined}
          totalSteps={status === 'loading' ? analysisProgressSteps.length : undefined}
        />
        <div aria-live="polite" aria-atomic="false">
          {result ? (
            <UrlAnalyzerResult
              result={result}
              experimentStatus={experimentStatus}
              experiments={experiments}
              onGenerateExperiments={handleGenerateExperiments}
            />
          ) : null}
        </div>
      </div>
    </AppShell>
  )
}
