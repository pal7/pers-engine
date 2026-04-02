import type { AnalysisResponse } from '../../types/analysis'

interface UrlAnalyzerResultProps {
  result: AnalysisResponse
}

export function UrlAnalyzerResult({ result }: UrlAnalyzerResultProps) {
  const debugData = result.debug

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Analysis findings</h2>
          <p>Focused opportunities for personalization and conversion lift.</p>
        </div>
        <span className="badge badge--running">Analyzed</span>
      </div>

      <div className="url-analyzer-result">
        <article className="url-analyzer-result__hero">
          <div className="url-analyzer-result__hero-meta">
            <span className="label">Analyzed page</span>
            <span className="badge badge--running">Summary</span>
          </div>
          <strong>{result.analyzedUrl}</strong>
          <p>{result.summary}</p>
        </article>

        <section className="url-analyzer-result__section" aria-labelledby="analysis-evidence-title">
          <div className="url-analyzer-result__section-header">
            <h3 id="analysis-evidence-title">Observed evidence</h3>
            <p>Observed page signals used to generate issues and experiment ideas.</p>
          </div>

          <article className="url-analyzer-result__card">
            <strong>{result.evidence.heroText}</strong>
            <dl className="url-analyzer-result__details">
              <div>
                <dt className="label">Page type</dt>
                <dd>{result.evidence.pageType}</dd>
              </div>
              <div>
                <dt className="label">CTA count</dt>
                <dd>{result.evidence.ctaCount}</dd>
              </div>
              <div>
                <dt className="label">Form present</dt>
                <dd>{result.evidence.hasForm ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="label">Primary CTA above fold</dt>
                <dd>{result.evidence.primaryCTAAboveFold ? 'Yes' : 'No'}</dd>
              </div>
              <div className="url-analyzer-result__details-full">
                <dt className="label">Trust signals visible</dt>
                <dd>{result.evidence.trustSignalsVisible ? 'Yes' : 'No'}</dd>
              </div>
            </dl>
          </article>
        </section>

        {debugData ? (
          <section className="url-analyzer-result__section" aria-labelledby="analysis-debug-title">
            <details className="url-analyzer-debug">
              <summary className="url-analyzer-debug__summary" id="analysis-debug-title">
                <span>Debug / Evidence</span>
                <span className="badge badge--neutral">Dev only</span>
              </summary>
              <div className="url-analyzer-debug__content">
                <dl className="url-analyzer-result__details url-analyzer-debug__details">
                  <div>
                    <dt className="label">Resolved URL</dt>
                    <dd>{debugData.resolvedUrl}</dd>
                  </div>
                  <div>
                    <dt className="label">Page title</dt>
                    <dd>{debugData.pageTitle || 'Not found'}</dd>
                  </div>
                  <div>
                    <dt className="label">Meta description</dt>
                    <dd>{debugData.metaDescription || 'Not found'}</dd>
                  </div>
                  <div>
                    <dt className="label">First H1</dt>
                    <dd>{debugData.firstH1Text || 'Not found'}</dd>
                  </div>
                  <div>
                    <dt className="label">Form present</dt>
                    <dd>{debugData.hasForm ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt className="label">CTA count</dt>
                    <dd>{debugData.ctaCount}</dd>
                  </div>
                  <div className="url-analyzer-result__details-full">
                    <dt className="label">Candidate CTA texts</dt>
                    <dd>
                      {debugData.candidateCtaTexts.length > 0
                        ? debugData.candidateCtaTexts.join(', ')
                        : 'None detected'}
                    </dd>
                  </div>
                </dl>
                <div className="url-analyzer-debug__json">
                  <p className="label">Final evidence object</p>
                  <pre>{JSON.stringify(debugData.evidence, null, 2)}</pre>
                </div>
              </div>
            </details>
          </section>
        ) : null}

        <section className="url-analyzer-result__section" aria-labelledby="analysis-issues-title">
          <div className="url-analyzer-result__section-header">
            <h3 id="analysis-issues-title">Key issues</h3>
            <p>Priority observations to address before investing in new tests.</p>
          </div>

          <div className="url-analyzer-result__grid">
            {result.issues.map((issue) => (
              <article className="url-analyzer-result__card" key={issue.id}>
                <div className="url-analyzer-result__card-header">
                  <strong>{issue.title}</strong>
                  <span className="badge badge--neutral">{issue.severity}</span>
                </div>
                <p>{issue.detail}</p>
                <dl className="url-analyzer-result__details">
                  <div>
                    <dt className="label">Impact</dt>
                    <dd>{issue.impact}</dd>
                  </div>
                  <div>
                    <dt className="label">Confidence</dt>
                    <dd>{issue.confidence}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section
          className="url-analyzer-result__section"
          aria-labelledby="analysis-experiments-title"
        >
          <div className="url-analyzer-result__section-header">
            <h3 id="analysis-experiments-title">Experiment suggestions</h3>
            <p>Practical follow-up tests that build directly on the observed issues.</p>
          </div>

          <div className="url-analyzer-result__grid">
            {result.experiments.map((experiment) => (
              <article className="url-analyzer-result__card" key={experiment.id}>
                <strong>{experiment.title}</strong>
                <p>{experiment.hypothesis}</p>
                <dl className="url-analyzer-result__details">
                  <div>
                    <dt className="label">Impact</dt>
                    <dd>{experiment.impact}</dd>
                  </div>
                  <div>
                    <dt className="label">Confidence</dt>
                    <dd>{experiment.confidence}</dd>
                  </div>
                  <div>
                    <dt className="label">Variant</dt>
                    <dd>{experiment.variant}</dd>
                  </div>
                  <div className="url-analyzer-result__details-full">
                    <dt className="label">Metric</dt>
                    <dd>{experiment.metric}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}
