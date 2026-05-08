import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AnalysisExperiment, AnalysisResponse, TechStackCategory } from "../../types/analysis";

type ExperimentStatus = 'idle' | 'loading' | 'success' | 'error'

interface UrlAnalyzerResultProps {
  result: AnalysisResponse;
  experimentStatus: ExperimentStatus;
  experiments: AnalysisExperiment[] | null;
  onGenerateExperiments: () => void;
}

const CATEGORY_LABELS: Record<TechStackCategory, string> = {
  'ab-testing': 'A/B testing',
  personalisation: 'Personalisation',
  analytics: 'Analytics',
  'tag-manager': 'Tag manager',
  cms: 'CMS',
  framework: 'Framework',
  cdp: 'CDP',
  ecommerce: 'Ecommerce',
  heatmap: 'Heatmap',
  crm: 'CRM',
}

export function UrlAnalyzerResult({ result, experimentStatus, experiments, onGenerateExperiments }: UrlAnalyzerResultProps) {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null)
  const debugData = result.debug;

  return (
    <section className='panel'>
      <div className='panel__header'>
        <div>
          <h2>Analysis findings</h2>
          <p>Focused opportunities for personalization and conversion lift.</p>
        </div>
        <span className='badge badge--running'>Analyzed</span>
      </div>

      <div className='url-analyzer-result'>
        <article className='url-analyzer-result__hero'>
          <div className='url-analyzer-result__hero-meta'>
            <span className='label'>Analyzed page</span>
            <span className='badge badge--running'>Summary</span>
          </div>
          <strong>{result.analyzedUrl}</strong>
          <p>{result.summary}</p>
          <dl className='url-analyzer-result__details'>
            <div>
              <dt className='label'>Extraction mode</dt>
              <dd>{result.extractionMode}</dd>
            </div>
            <div>
              <dt className='label'>Extraction quality</dt>
              <dd>{result.extractionQuality}</dd>
            </div>
          </dl>
          {result.extractionWarnings.length > 0 ? (
            <div>
              <p className='label'>Extraction warnings</p>
              <ul>
                {result.extractionWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>

        <section
          className='url-analyzer-result__section'
          aria-labelledby='analysis-evidence-title'
        >
          <div className='url-analyzer-result__section-header'>
            <h3 id='analysis-evidence-title'>Observed evidence</h3>
            <p>Extracted page signals used to generate issues and experiment ideas.</p>
          </div>

          <article className='url-analyzer-result__card'>
            <strong>{result.evidence.heroText}</strong>
            <dl className='url-analyzer-result__details'>
              <div>
                <dt className='label'>Page type</dt>
                <dd>{result.evidence.pageType}</dd>
              </div>
              <div>
                <dt className='label'>CTA count</dt>
                <dd>{result.evidence.ctaCount}</dd>
              </div>
              <div>
                <dt className='label'>Form present</dt>
                <dd>{result.evidence.hasForm ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className='label'>Primary CTA above fold</dt>
                <dd>{result.evidence.primaryCTAAboveFold ? "Yes" : "No"}</dd>
              </div>
              <div className='url-analyzer-result__details-full'>
                <dt className='label'>Trust signals visible</dt>
                <dd>{result.evidence.trustSignalsVisible ? "Yes" : "No"}</dd>
              </div>
              <div className='url-analyzer-result__details-full'>
                <dt className='label'>Extracted title</dt>
                <dd>{result.extractedSignals.title || "None detected"}</dd>
              </div>
              <div className='url-analyzer-result__details-full'>
                <dt className='label'>First H1</dt>
                <dd>{result.extractedSignals.h1 || "None detected"}</dd>
              </div>
              <div className='url-analyzer-result__details-full'>
                <dt className='label'>Candidate CTAs</dt>
                <dd>
                  {result.extractedSignals.ctaTexts.length > 0
                    ? result.extractedSignals.ctaTexts.join(", ")
                    : "None detected"}
                </dd>
              </div>
            </dl>
          </article>
        </section>

        <section
          className='url-analyzer-result__section'
          aria-labelledby='analysis-techstack-title'
        >
          <div className='url-analyzer-result__section-header'>
            <h3 id='analysis-techstack-title'>Detected tech stack</h3>
            <p>Tools identified from script sources and page signals.</p>
          </div>

          {result.techStack.length > 0 ? (
            <div className='tech-stack-pills'>
              {result.techStack.map((tech) => (
                <span key={tech.name} className='tech-stack-pill'>
                  <span className='tech-stack-pill__name'>{tech.name}</span>
                  <span className={`badge tech-stack-chip__badge--${tech.category}`}>
                    {CATEGORY_LABELS[tech.category]}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className='tech-stack-empty'>No tools detected from page source.</p>
          )}
        </section>

        {debugData ? (
          <section
            className='url-analyzer-result__section'
            aria-labelledby='analysis-debug-title'
          >
            <details className='url-analyzer-debug'>
              <summary
                className='url-analyzer-debug__summary'
                id='analysis-debug-title'
              >
                <span>Debug / Evidence</span>
                <span className='badge badge--neutral'>Dev only</span>
              </summary>
              <div className='url-analyzer-debug__content'>
                <dl className='url-analyzer-result__details url-analyzer-debug__details'>
                  <div>
                    <dt className='label'>Resolved URL</dt>
                    <dd>{debugData.resolvedUrl}</dd>
                  </div>
                  <div>
                    <dt className='label'>Page title</dt>
                    <dd>{debugData.pageTitle || "Not found"}</dd>
                  </div>
                  <div>
                    <dt className='label'>Meta description</dt>
                    <dd>{debugData.metaDescription || "Not found"}</dd>
                  </div>
                  <div>
                    <dt className='label'>First H1</dt>
                    <dd>{debugData.firstH1Text || "Not found"}</dd>
                  </div>
                  <div>
                    <dt className='label'>Form present</dt>
                    <dd>{debugData.hasForm ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt className='label'>CTA count</dt>
                    <dd>{debugData.ctaCount}</dd>
                  </div>
                  <div className='url-analyzer-result__details-full'>
                    <dt className='label'>Candidate CTA texts</dt>
                    <dd>
                      {debugData.candidateCtaTexts.length > 0
                        ? debugData.candidateCtaTexts.join(", ")
                        : "None detected"}
                    </dd>
                  </div>
                </dl>
                <div className='url-analyzer-debug__json'>
                  <p className='label'>Final evidence object</p>
                  <pre>{JSON.stringify(debugData.evidence, null, 2)}</pre>
                </div>
              </div>
            </details>
          </section>
        ) : null}

        <section
          className='url-analyzer-result__section'
          aria-labelledby='analysis-issues-title'
        >
          <div className='url-analyzer-result__section-header'>
            <h3 id='analysis-issues-title'>Key issues</h3>
            <p>Priority observations to address before investing in new tests.</p>
          </div>

          <div className='issues-list'>
            {result.issues.map((issue) => {
              const isExpanded = expandedIssueId === issue.id
              return (
                <article className='issue-card' key={issue.id}>
                  <button
                    className='issue-card__header'
                    onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                    aria-expanded={isExpanded}
                    type='button'
                  >
                    <span className={`badge badge--severity-${issue.severity}`}>
                      {issue.severity}
                    </span>
                    <span className='issue-card__title'>{issue.title}</span>
                    <ChevronDown
                      className={`issue-card__chevron${isExpanded ? ' issue-card__chevron--open' : ''}`}
                      size={16}
                    />
                  </button>
                  {isExpanded && (
                    <div className='issue-card__body'>
                      <p>{issue.detail}</p>
                      <div className='issue-card__meta'>
                        <div>
                          <span className='label'>Impact</span>
                          <span>{issue.impact}</span>
                        </div>
                        <div>
                          <span className='label'>Confidence</span>
                          <span>{issue.confidence}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <section
          className='url-analyzer-result__section'
          aria-labelledby='analysis-experiments-title'
        >
          <div className='url-analyzer-result__section-header'>
            <h3 id='analysis-experiments-title'>Experiment suggestions</h3>
            <p>Practical follow-up tests that build directly on the observed issues.</p>
          </div>

          {experimentStatus === 'idle' && (
            <button
              className='generate-btn'
              onClick={onGenerateExperiments}
              type='button'
              aria-label='Generate A/B experiment suggestions based on the identified issues'
            >
              Generate experiment suggestions
            </button>
          )}

          {experimentStatus === 'loading' && (
            <p className='url-analyzer-result__experiments-status'>
              Generating experiment suggestions…
            </p>
          )}

          {experimentStatus === 'error' && (
            <p className='url-analyzer-result__experiments-status url-analyzer-result__experiments-status--error'>
              Could not generate experiment suggestions. Please try again.
            </p>
          )}

          {experimentStatus === 'success' && experiments && (
            <div className='url-analyzer-result__grid'>
              {experiments.map((experiment) => (
                <article
                  className='url-analyzer-result__card'
                  key={experiment.id}
                >
                  <strong>{experiment.title}</strong>
                  <p>{experiment.hypothesis}</p>
                  <dl className='url-analyzer-result__details'>
                    <div>
                      <dt className='label'>Impact</dt>
                      <dd>{experiment.impact}</dd>
                    </div>
                    <div>
                      <dt className='label'>Confidence</dt>
                      <dd>{experiment.confidence}</dd>
                    </div>
                    <div>
                      <dt className='label'>Variant</dt>
                      <dd>{experiment.variant}</dd>
                    </div>
                    <div className='url-analyzer-result__details-full'>
                      <dt className='label'>Metric</dt>
                      <dd>{experiment.metric}</dd>
                    </div>
                    {experiment.implementationHint ? (
                      <div className='url-analyzer-result__details-full'>
                        <dt className='label'>Implementation hint</dt>
                        <dd>{experiment.implementationHint}</dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
