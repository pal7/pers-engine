import { useEffect, useRef, useState } from 'react'
import { AnalysisActivityLog } from '../components/analyzer/AnalysisActivityLog'
import { UrlAnalyzerForm } from '../components/analyzer/UrlAnalyzerForm'
import { UrlAnalyzerResult } from '../components/analyzer/UrlAnalyzerResult'
import { UrlAnalyzerStatus } from '../components/analyzer/UrlAnalyzerStatus'
import { AppShell } from '../components/layout/AppShell'
import { submitAnalysisStream, submitExperiments } from '../lib/analysisApi'
import type { AnalysisExperiment, AnalysisProgressEvent, AnalysisResponse, AnalysisStatus } from '../types/analysis'

type ExperimentStatus = 'idle' | 'loading' | 'success' | 'error'

export function UrlAnalyzerPage() {
  const [rawUrl, setRawUrl] = useState('')
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [progressEvents, setProgressEvents] = useState<AnalysisProgressEvent[]>([])
  const [experimentStatus, setExperimentStatus] = useState<ExperimentStatus>('idle')
  const [experiments, setExperiments] = useState<AnalysisExperiment[] | null>(null)
  const cancelStreamRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      cancelStreamRef.current?.()
    }
  }, [])

  const handleReset = () => {
    cancelStreamRef.current?.()
    setStatus('idle')
    setErrorMessage('')
    setResult(null)
    setProgressEvents([])
    setExperiments(null)
    setExperimentStatus('idle')
    setRawUrl('')
  }

  const handleSubmit = (normalizedUrl: string) => {
    cancelStreamRef.current?.()

    setStatus('loading')
    setErrorMessage('')
    setResult(null)
    setProgressEvents([])
    setExperiments(null)
    setExperimentStatus('idle')

    const cancel = submitAnalysisStream(
      { url: normalizedUrl },
      (event) => {
        setProgressEvents((prev) => {
          // Replace existing event with same id+status=active, or append
          const existingActiveIdx = prev.findIndex((e) => e.id === event.id && e.status === 'active')
          if (existingActiveIdx !== -1 && event.status !== 'active') {
            const next = [...prev]
            next[existingActiveIdx] = event
            return next
          }
          return [...prev, event]
        })
      },
      (response) => {
        setResult(response)
        setStatus('success')
        setExperimentStatus('idle')
      },
      (message) => {
        setStatus('error')
        setErrorMessage(message)
      },
    )

    cancelStreamRef.current = cancel
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
    } catch {
      setExperimentStatus('error')
    }
  }

  return (
    <AppShell hideHeader>
      <div className="url-analyzer-page">
        <UrlAnalyzerForm
          onChange={setRawUrl}
          onReset={handleReset}
          onSubmit={handleSubmit}
          status={status}
          value={rawUrl}
        />

        {status === 'loading' ? (
          <AnalysisActivityLog events={progressEvents} />
        ) : (
          <UrlAnalyzerStatus
            errorMessage={errorMessage}
            status={status}
          />
        )}

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
