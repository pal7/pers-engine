import { useState } from 'react'
import { ChevronDown, Lock } from 'lucide-react'
import type { AgentObservation, AnalysisExperiment, AnalysisResponse, DetectedTech, TechStackCategory } from "../../types/analysis";

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
  'tag-manager': 'Tag managers',
  cms: 'CMS',
  framework: 'UI framework',
  cdp: 'CDP',
  ecommerce: 'Ecommerce',
  heatmap: 'Heatmap & replay',
  crm: 'CRM',
  consent: 'Consent & CMP',
  monitoring: 'Monitoring',
  font: 'Fonts',
  chat: 'Chat & support',
}

const CATEGORY_ORDER: TechStackCategory[] = [
  'tag-manager', 'analytics', 'ab-testing', 'personalisation',
  'framework', 'cdp', 'cms', 'ecommerce', 'heatmap', 'crm',
  'consent', 'monitoring', 'font', 'chat',
]

const SCREENSHOT_STEP_LABELS: Record<string, string> = {
  screenshot: 'Above the fold',
  scroll: 'Mid-page',
  click: 'After CTA click',
}

function getObservationForScreenshot(
  observations: AgentObservation[],
  url: string,
): AgentObservation | undefined {
  return observations.find((o) => o.screenshotUrl === url)
}

export function UrlAnalyzerResult({ result, experimentStatus, experiments, onGenerateExperiments }: UrlAnalyzerResultProps) {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null)
  const [expandedExperimentId, setExpandedExperimentId] = useState<string | null>(null)
  const debugData = result.debug;
  const agentSession = result.agentSession;
  const visibleExperiments = experiments?.slice(0, 2) ?? null;

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
            <div className='tech-stack-groups' role='list' aria-label='Detected technologies'>
              {CATEGORY_ORDER.filter((cat) => result.techStack.some((t) => t.category === cat)).map((cat) => {
                const tools = result.techStack.filter((t) => t.category === cat)
                return (
                  <div key={cat} className='tech-stack-group' role='listitem'>
                    <h4 className='tech-stack-group__label'>{CATEGORY_LABELS[cat]}</h4>
                    <div className='tech-stack-group__chips'>
                      {tools.map((tech: DetectedTech) => (
                        <span
                          key={tech.name}
                          className='tech-stack-chip'
                          title={tech.evidence}
                          aria-label={`${tech.name} — ${tech.confidence === 'definitive' ? 'confirmed' : 'likely'}`}
                        >
                          <span className='tech-stack-chip__name'>{tech.name}</span>
                          <span className={`badge tech-stack-chip__badge--${tech.category}`} aria-hidden='true'>
                            {tech.confidence === 'definitive' ? '✓' : '~'}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
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

          <ul className='issues-list' role='list'>
            {result.issues.map((issue) => {
              const isExpanded = expandedIssueId === issue.id
              return (
                <li key={issue.id}>
                  <article className='issue-card'>
                    <button
                      className='issue-card__header'
                      onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`issue-body-${issue.id}`}
                      type='button'
                    >
                      <span className={`badge badge--severity-${issue.severity}`} aria-label={`Severity: ${issue.severity}`}>
                        {issue.severity}
                      </span>
                      <span className='issue-card__title'>{issue.title}</span>
                      <ChevronDown
                        className={`issue-card__chevron${isExpanded ? ' issue-card__chevron--open' : ''}`}
                        size={16}
                        aria-hidden='true'
                      />
                    </button>
                    {isExpanded && (
                      <div
                        id={`issue-body-${issue.id}`}
                        className='issue-card__body'
                        role='region'
                        aria-label={issue.title}
                      >
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
                </li>
              )
            })}
          </ul>
        </section>

        {agentSession && agentSession.screenshots.length > 0 && (
          <section
            className='url-analyzer-result__section'
            aria-labelledby='analysis-screenshots-title'
          >
            <div className='url-analyzer-result__section-header'>
              <h3 id='analysis-screenshots-title'>Agent screenshots</h3>
              <p>Captured during the live browser session — used to generate experiment ideas below.</p>
            </div>
            <div className='screenshot-gallery'>
              {agentSession.screenshots.map((url, i) => {
                const obs = getObservationForScreenshot(agentSession.observations, url)
                const label = obs ? (SCREENSHOT_STEP_LABELS[obs.action] ?? `Step ${obs.step}`) : `Screenshot ${i + 1}`
                return (
                  <figure key={url} className='screenshot-item'>
                    <div className='screenshot-item__img-wrap'>
                      <a href={url} target='_blank' rel='noopener noreferrer' aria-label={`Open ${label} screenshot in new tab`}>
                        <img src={url} alt={label} className='screenshot-item__img' loading='lazy' />
                      </a>
                    </div>
                    <figcaption className='screenshot-item__caption'>
                      <span className='screenshot-item__label'>{label}</span>
                      {obs?.result && (
                        <p className='screenshot-item__analysis'>{obs.result}</p>
                      )}
                    </figcaption>
                  </figure>
                )
              })}
            </div>
          </section>
        )}

        <section
          className='url-analyzer-result__section'
          aria-labelledby='analysis-experiments-title'
        >
          <div className='url-analyzer-result__section-header'>
            <h3 id='analysis-experiments-title'>Experiment suggestions</h3>
            <p>Top two A/B tests to run based on the identified issues.</p>
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

          {experimentStatus === 'success' && visibleExperiments && (
            <>
              <ul className='experiment-list-accordion' role='list'>
                {visibleExperiments.map((experiment) => {
                  const isExpanded = expandedExperimentId === experiment.id
                  return (
                    <li key={experiment.id}>
                      <article className='experiment-card'>
                        <button
                          className='experiment-card__header'
                          onClick={() => setExpandedExperimentId(isExpanded ? null : experiment.id)}
                          aria-expanded={isExpanded}
                          aria-controls={`experiment-body-${experiment.id}`}
                          type='button'
                        >
                          <div className='experiment-card__title-row'>
                            <span className='experiment-card__title'>{experiment.title}</span>
                            <span className='experiment-card__badges'>
                              {experiment.confidence && (
                                <span className='badge badge--neutral' aria-label={`Confidence: ${experiment.confidence}`}>
                                  {experiment.confidence}
                                </span>
                              )}
                            </span>
                          </div>
                          <ChevronDown
                            className={`issue-card__chevron${isExpanded ? ' issue-card__chevron--open' : ''}`}
                            size={16}
                            aria-hidden='true'
                          />
                        </button>
                        {isExpanded && (
                          <div
                            id={`experiment-body-${experiment.id}`}
                            className='experiment-card__body'
                            role='region'
                            aria-label={experiment.title}
                          >
                            <p className='experiment-card__hypothesis'>{experiment.hypothesis}</p>
                            <dl className='experiment-card__details'>
                              <div>
                                <dt className='label'>Variant change</dt>
                                <dd>{experiment.variant}</dd>
                              </div>
                              <div>
                                <dt className='label'>Primary metric</dt>
                                <dd>{experiment.metric}</dd>
                              </div>
                              {experiment.implementationHint ? (
                                <div className='experiment-card__details-full'>
                                  <dt className='label'>Implementation</dt>
                                  <dd>{experiment.implementationHint}</dd>
                                </div>
                              ) : null}
                            </dl>
                          </div>
                        )}
                      </article>
                    </li>
                  )
                })}
              </ul>

              <div className='generate-more-teaser' aria-label='Premium feature'>
                <Lock size={14} aria-hidden='true' />
                <span>Generate more experiments</span>
                <span className='badge badge--neutral'>Premium</span>
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
