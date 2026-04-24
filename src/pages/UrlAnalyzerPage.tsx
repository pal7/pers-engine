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


    const intervalId = window.setInterval(() => {
      setCurrentStepIndex((currentIndex) =>
        // Advance through first 3 steps automatically; hold on step 4 until response arrives
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
        {result ? <UrlAnalyzerResult result={result} /> : null}
      </div>
    </AppShell>
  )
}
