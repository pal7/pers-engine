import type { FormEvent } from 'react'
import { isValidWebsiteUrl, normalizeWebsiteUrl } from '../../lib/urlValidation'
import type { AnalysisStatus } from '../../types/analysis'

interface UrlAnalyzerFormProps {
  value: string
  status: AnalysisStatus
  onChange: (value: string) => void
  onSubmit: (normalizedUrl: string) => void
  onReset: () => void
}

export function UrlAnalyzerForm({
  value,
  status,
  onChange,
  onSubmit,
  onReset,
}: UrlAnalyzerFormProps) {
  const hasValue = value.trim().length > 0
  const normalizedUrl = normalizeWebsiteUrl(value)
  const isValid = isValidWebsiteUrl(value)
  const isDone = status === 'success'
  const validationMessage =
    hasValue && !isValid && !isDone
      ? 'Enter a valid website URL like example.com or https://example.com.'
      : ''

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!normalizedUrl || status === 'loading' || isDone) return
    onSubmit(normalizedUrl)
  }

  return (
    <section className="hero-input">
      <p className="hero-input__eyebrow">Personalization Engine</p>
      <h1 className="hero-input__title">Analyse any website</h1>

      <form className="hero-input__form" onSubmit={handleSubmit} aria-busy={status === 'loading'} noValidate>
        <div className="hero-input__row">
          <input
            aria-label="Website URL"
            aria-describedby={validationMessage ? 'url-validation-msg' : undefined}
            aria-invalid={validationMessage ? 'true' : undefined}
            autoComplete="url"
            className={`hero-input__field${isDone ? ' hero-input__field--done' : ''}`}
            id="website-url"
            onChange={(event) => !isDone && onChange(event.target.value)}
            placeholder="Enter any website URL to analyse"
            readOnly={isDone}
            type="text"
            value={value}
          />
          <button
            className="hero-input__cta button button--primary"
            disabled={status === 'loading' || !isValid || isDone}
            type="submit"
            aria-disabled={status === 'loading' || !isValid || isDone}
          >
            {status === 'loading' ? 'Analysing…' : 'Analyse'}
          </button>
        </div>

        {validationMessage ? (
          <p className="hero-input__validation" role="alert" id="url-validation-msg">
            {validationMessage}
          </p>
        ) : null}
      </form>

      {isDone ? (
        <button className="hero-input__reset" onClick={onReset} type="button">
          ← Analyse a different website
        </button>
      ) : (
        <p className="hero-input__tagline">
          Analyses the website · Identifies issues · Generates A/B experiments
        </p>
      )}
    </section>
  )
}
