import type { AnalysisResponse } from '../../types/analysis'

interface UrlAnalyzerResultProps {
  result: AnalysisResponse
}

export function UrlAnalyzerResult({ result }: UrlAnalyzerResultProps) {
  const experimentConfidenceByIndex = ['High', 'Medium', 'Medium']

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
                    <dd>{issue.severity === 'high' ? 'High' : 'Medium'}</dd>
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
            {result.experiments.map((experiment, index) => (
              <article className="url-analyzer-result__card" key={experiment.id}>
                <strong>{experiment.name}</strong>
                <p>{experiment.hypothesis}</p>
                <dl className="url-analyzer-result__details">
                  <div>
                    <dt className="label">Impact</dt>
                    <dd>{experiment.expectedImpact}</dd>
                  </div>
                  <div>
                    <dt className="label">Confidence</dt>
                    <dd>{experimentConfidenceByIndex[index] ?? 'Medium'}</dd>
                  </div>
                  <div className="url-analyzer-result__details-full">
                    <dt className="label">Audience</dt>
                    <dd>{experiment.audience}</dd>
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
