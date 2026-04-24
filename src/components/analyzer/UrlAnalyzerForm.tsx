import type { FormEvent } from 'react'
import { isValidWebsiteUrl, normalizeWebsiteUrl } from '../../lib/urlValidation'
import type { AnalysisStatus } from '../../types/analysis'

interface UrlAnalyzerFormProps {
  value: string
  status: AnalysisStatus
  onChange: (value: string) => void
  onSubmit: (normalizedUrl: string) => void
}

export function UrlAnalyzerForm({
  value,
  status,
  onChange,
  onSubmit,
}: UrlAnalyzerFormProps) {
  const hasValue = value.trim().length > 0
  const normalizedUrl = normalizeWebsiteUrl(value)
  const isValid = isValidWebsiteUrl(value)
  const validationMessage =
    hasValue && !isValid
      ? 'Enter a valid website URL like example.com or https://example.com.'
      : ''

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!normalizedUrl || status === 'loading') {
      return
    }

    onSubmit(normalizedUrl)
  }

  return (
    <section className="hero-input">
      <p className="hero-input__eyebrow">Personalization Engine</p>
      <h1 className="hero-input__title">Analyse any website</h1>

      <form className="hero-input__form" onSubmit={handleSubmit}>
        <div className="hero-input__row">
          <input
            aria-label="Website URL"
            autoComplete="url"
            className="hero-input__field"
            id="website-url"
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter any website URL to analyse"
            type="text"
            value={value}
          />
          <button
            className="hero-input__cta button button--primary"
            disabled={status === 'loading' || !isValid}
            type="submit"
          >
            {status === 'loading' ? 'Analysing…' : 'Analyse'}
          </button>
        </div>

        {validationMessage ? (
          <p className="hero-input__validation" role="alert">
            {validationMessage}
          </p>
        ) : null}
      </form>

      <p className="hero-input__tagline">
        Detects tech stack · Identifies UX issues · Generates A/B experiments
      </p>
    </section>
  )
}
