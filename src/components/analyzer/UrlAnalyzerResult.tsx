import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { AgentObservation, AnalysisExperiment, AnalysisExtractionQuality, AnalysisResponse, ComparableSite, DetectedTech, TechStackCategory } from "../../types/analysis";

type ExperimentStatus = 'idle' | 'loading' | 'success' | 'error'

const QUALITY_LABELS: Record<AnalysisExtractionQuality, string> = {
  good: 'Complete',
  limited: 'Partial',
  blocked: 'Blocked',
}

function getExtractionNote(quality: AnalysisExtractionQuality, warnings: string[]): string | null {
  if (quality === 'blocked') return 'Blocked by anti-bot protection'
  if (quality === 'limited') {
    const text = warnings.join(' ').toLowerCase()
    if (text.includes('timeout')) return 'Timed out — partial data captured'
    if (text.includes('javascript')) return 'JS-heavy page — partial extraction'
    return 'Partial extraction'
  }
  return null
}

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

// Pick the most relevant agent screenshot for an experiment card.
// Prefers post-click for form/checkout experiments, mid-page for social proof,
// above-fold (index 0) for everything else.
function getExperimentScreenshot(
  title: string,
  hypothesis: string,
  observations: AgentObservation[],
): AgentObservation | undefined {
  const text = (title + ' ' + hypothesis).toLowerCase()
  const isPostClick = /form|checkout|sign.?up|register|submit|conversion/.test(text)
  const isMidPage = /social proof|trust|testimonial|review|scroll|below.?fold/.test(text)

  const byAction = (action: string) => observations.find((o) => o.action === action && o.screenshotUrl)
  if (isPostClick) return byAction('click') ?? byAction('screenshot')
  if (isMidPage) return byAction('scroll') ?? byAction('screenshot')
  return byAction('screenshot')
}

export function UrlAnalyzerResult({ result, experimentStatus, experiments, onGenerateExperiments }: UrlAnalyzerResultProps) {
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null)
  const [expandedExperimentId, setExpandedExperimentId] = useState<string | null>(null)
  const [showMoreToast, setShowMoreToast] = useState(false)
  const [signalsExpanded, setSignalsExpanded] = useState(false)
  const [ragExpanded, setRagExpanded] = useState(false)
  const debugData = result.debug;
  const agentSession = result.agentSession;
  const visibleExperiments = experiments?.slice(0, 2) ?? null;
  const extractionNote = getExtractionNote(result.extractionQuality, result.extractionWarnings)

  const handleGenerateMore = () => {
    setShowMoreToast(true)
    setTimeout(() => setShowMoreToast(false), 3000)
  }

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
              <dd className={`extraction-quality extraction-quality--${result.extractionQuality}`}>
                {QUALITY_LABELS[result.extractionQuality]}
              </dd>
            </div>
          </dl>
          {extractionNote && (
            <div className={`extraction-note extraction-note--${result.extractionQuality}`}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path d="M6.5 1.5a5 5 0 100 10 5 5 0 000-10zM6.5 4v3M6.5 8.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span>{extractionNote}</span>
            </div>
          )}
        </article>

        <article className='signals-accordion'>
          <button
            className='signals-accordion__header'
            onClick={() => setSignalsExpanded((v) => !v)}
            aria-expanded={signalsExpanded}
            aria-controls='signals-body'
            type='button'
          >
            <h3 className='signals-accordion__title'>Page signals</h3>
            <span className='label signals-accordion__sub'>Indicators used in our analysis and experiment tools</span>
            <ChevronDown
              className={`issue-card__chevron${signalsExpanded ? ' issue-card__chevron--open' : ''}`}
              size={16}
              aria-hidden='true'
            />
          </button>
          {signalsExpanded && (
            <div id='signals-body' className='signals-accordion__body'>
              <table className='signals-table'>
                <tbody>
                  <tr><td className='signals-table__key'>Page type</td><td className='signals-table__val'>{result.evidence.pageType}</td></tr>
                  <tr><td className='signals-table__key'>Form present</td><td className='signals-table__val'>{result.evidence.hasForm ? 'Yes' : 'No'}</td></tr>
                  <tr><td className='signals-table__key'>Primary CTA above fold</td><td className='signals-table__val'>{result.evidence.primaryCTAAboveFold ? 'Yes' : 'No'}</td></tr>
                  <tr><td className='signals-table__key'>Trust signals visible</td><td className='signals-table__val'>{result.evidence.trustSignalsVisible ? 'Yes' : 'No'}</td></tr>
                  <tr><td className='signals-table__key'>CTA count</td><td className='signals-table__val'>{result.evidence.ctaCount}</td></tr>
                  <tr><td className='signals-table__key'>Button count</td><td className='signals-table__val'>{result.extractedSignals.buttonCount}</td></tr>
                  <tr><td className='signals-table__key'>Page title</td><td className='signals-table__val'>{result.extractedSignals.title || 'None detected'}</td></tr>
                  <tr><td className='signals-table__key'>First H1</td><td className='signals-table__val'>{result.extractedSignals.h1 || 'None detected'}</td></tr>
                  {result.extractedSignals.ctaTexts.length > 0 && (
                    <tr><td className='signals-table__key'>Candidate CTAs</td><td className='signals-table__val'>{result.extractedSignals.ctaTexts.join(' · ')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </article>

        {result.comparableSites && result.comparableSites.length > 0 && (
          <article className='signals-accordion'>
            <button
              className='signals-accordion__header'
              onClick={() => setRagExpanded((v) => !v)}
              aria-expanded={ragExpanded}
              aria-controls='comparable-sites-body'
              type='button'
            >
              <h3 className='signals-accordion__title'>Comparable businesses</h3>
              <span className='label signals-accordion__sub'>
                {result.comparableSites.length} similar {result.comparableSites.length === 1 ? 'business' : 'businesses'} used to contextualise this analysis
                {result.siteClassification && ` · ${result.siteClassification.descriptor}`}
              </span>
              <ChevronDown
                className={`issue-card__chevron${ragExpanded ? ' issue-card__chevron--open' : ''}`}
                size={16}
                aria-hidden='true'
              />
            </button>
            {ragExpanded && (
              <div id='comparable-sites-body' className='signals-accordion__body'>
                <ul className='rag-sources-list'>
                  {result.comparableSites.map((site: ComparableSite) => (
                    <li key={site.url} className='rag-source-item'>
                      <div className='rag-source-item__header'>
                        <a
                          href={site.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='rag-source-item__url'
                        >
                          {new URL(site.url).hostname.replace(/^www\./, '')}
                        </a>
                        {site.businessType && <span className='badge'>{site.businessType}</span>}
                        {site.industryVertical && <span className='badge badge--neutral'>{site.industryVertical}</span>}
                      </div>
                      {(site.productCategory || site.audience) && (
                        <p className='rag-source-item__dna'>
                          {[site.productCategory, site.audience].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className='rag-source-item__summary'>{site.summary}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        )}

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
                      <span className='issue-card__title'>{issue.title}</span>
                      <span className={`badge badge--severity-${issue.severity}`} aria-label={`Severity: ${issue.severity}`}>
                        {issue.severity}
                      </span>
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
                        {issue.impact && (
                          <div className='issue-card__meta'>
                            <div>
                              <span className='label'>Impact</span>
                              <span>{issue.impact}</span>
                            </div>
                          </div>
                        )}
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
              <h3 id='analysis-screenshots-title'>Areas analysed</h3>
              <p>Page sections captured during the live browser session.</p>
            </div>
            <div className='screenshot-gallery'>
              {agentSession.screenshots.map((url, i) => {
                const obs = getObservationForScreenshot(agentSession.observations, url)
                const label = obs ? (SCREENSHOT_STEP_LABELS[obs.action] ?? `Screenshot ${i + 1}`) : `Screenshot ${i + 1}`
                return (
                  <figure key={url} className='screenshot-item'>
                    <div className='screenshot-item__img-wrap'>
                      <a href={url} target='_blank' rel='noopener noreferrer' aria-label={`Open ${label} screenshot in new tab`}>
                        <img src={url} alt={label} className='screenshot-item__img' loading='lazy' />
                      </a>
                    </div>
                    <figcaption className='screenshot-item__caption'>
                      <span className='screenshot-item__label'>{label}</span>
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
            <p>Two experiment suggestions based on the identified issues.</p>
          </div>

          {experimentStatus === 'idle' && (
            <button
              className='generate-btn'
              onClick={onGenerateExperiments}
              type='button'
              aria-label='Generate experiment suggestions based on the identified issues'
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
                  const expScreenshotObs = agentSession
                    ? getExperimentScreenshot(experiment.title, experiment.hypothesis, agentSession.observations)
                    : undefined
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
                                <span
                                  className={`badge badge--severity-${experiment.confidence.toLowerCase()}`}
                                  aria-label={`Confidence: ${experiment.confidence}`}
                                >
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
                            {expScreenshotObs?.screenshotUrl && (
                              <figure className='experiment-card__screenshot'>
                                <a href={expScreenshotObs.screenshotUrl} target='_blank' rel='noopener noreferrer'>
                                  <img
                                    src={expScreenshotObs.screenshotUrl}
                                    alt={`Current state: ${SCREENSHOT_STEP_LABELS[expScreenshotObs.action] ?? 'Page screenshot'}`}
                                    className='experiment-card__screenshot-img'
                                    loading='lazy'
                                  />
                                </a>
                                <figcaption className='label'>
                                  Current state — {SCREENSHOT_STEP_LABELS[expScreenshotObs.action] ?? 'Page screenshot'}
                                </figcaption>
                              </figure>
                            )}
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

              <div className='generate-more-wrap'>
                <button
                  className='generate-more-btn'
                  onClick={handleGenerateMore}
                  type='button'
                  aria-label='Generate more experiments and insights'
                >
                  <span>Generate more experiments & insights</span>
                  <span className='badge badge--neutral'>Premium</span>
                </button>
                {showMoreToast && (
                  <div className='generate-more-toast' role='status' aria-live='polite'>
                    Feature in development — coming soon
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
