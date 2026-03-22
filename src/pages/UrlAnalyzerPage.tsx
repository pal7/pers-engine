import { useEffect, useState } from 'react'
import { UrlAnalyzerForm } from '../components/analyzer/UrlAnalyzerForm'
import { UrlAnalyzerResult } from '../components/analyzer/UrlAnalyzerResult'
import { UrlAnalyzerStatus } from '../components/analyzer/UrlAnalyzerStatus'
import { AppShell } from '../components/layout/AppShell'
import { submitAnalysis } from '../lib/analysisApi'
import type { AnalysisResponse, AnalysisStatus } from '../types/analysis'

const analysisProgressSteps = [
  'Validating website URL',
  'Capturing page structure',
  'Reviewing conversion signals',
  'Generating experiment suggestions',
]

export function UrlAnalyzerPage() {
  const [rawUrl, setRawUrl] = useState('')
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  useEffect(() => {
    if (status !== 'loading') {
      return
    }

    setCurrentStepIndex(0)

    const intervalId = window.setInterval(() => {
      setCurrentStepIndex((currentIndex) =>
        Math.min(currentIndex + 1, analysisProgressSteps.length - 1),
      )
    }, 300)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [status])

  const handleSubmit = async (normalizedUrl: string) => {
    setStatus('loading')
    setErrorMessage('')
    setResult(null)

    try {
      const response = await submitAnalysis({ url: normalizedUrl })
      setResult(response)
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong while analyzing that website.',
      )
    }
  }

  return (
    <AppShell
      overline="Website personalization analyzer"
      productName="Website Personalization Analyzer"
      subtitle="Run a lightweight first-pass analysis on any live website and surface clear personalization opportunities, friction points, and next-test ideas in one focused view."
      primaryActions={<span className="badge badge--neutral">Phase 1 mock flow</span>}
    >
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
          totalSteps={status === 'loading' ? analysisProgressSteps.length : undefined}
        />
        {result ? <UrlAnalyzerResult result={result} /> : null}
      </div>
    </AppShell>
  )
}
