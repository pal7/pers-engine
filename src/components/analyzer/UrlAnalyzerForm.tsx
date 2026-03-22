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
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Start with a live URL</h2>
          <p>
            Paste a page you want to review and we will return an initial read on
            messaging, trust, and experimentation opportunities.
          </p>
        </div>
      </div>

      <form className="url-analyzer-form" onSubmit={handleSubmit}>
        <div className="url-analyzer-form__entry">
          <label className="field url-analyzer-form__field" htmlFor="website-url">
            <span>Website URL</span>
            <input
              autoComplete="url"
              id="website-url"
              onChange={(event) => onChange(event.target.value)}
              placeholder="example.com/pricing"
              type="text"
              value={value}
            />
          </label>

          <div className="url-analyzer-form__actions">
            <button
              className="button button--primary"
              disabled={status === 'loading' || !isValid}
              type="submit"
            >
              {status === 'loading' ? 'Analyzing...' : 'Run analysis'}
            </button>

            <div className="url-analyzer-form__meta">
              <span className="label">Request preview</span>
              {normalizedUrl ? (
                <p className="url-analyzer-form__hint">{normalizedUrl}</p>
              ) : (
                <p className="url-analyzer-form__hint">
                  We automatically add `https://` when the protocol is missing.
                </p>
              )}
            </div>
          </div>
        </div>

        {validationMessage ? (
          <p className="url-analyzer-form__validation" role="alert">
            {validationMessage}
          </p>
        ) : null}
      </form>
    </section>
  )
}
