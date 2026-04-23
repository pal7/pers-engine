import { AzureOpenAI } from 'openai/azure'
import type {
  AnalysisEvidence,
  AnalysisExperiment,
  AnalysisIssue,
  DetectedTech,
} from '../../../shared/analysis.ts'
import type { ExtractedPageSignals } from './extractPageSignals.ts'

const PAGE_TEXT_LIMIT = 3000

// Raw shape GPT returns before we validate and stamp IDs
interface RawIssue {
  id?: unknown
  title?: unknown
  severity?: unknown
  detail?: unknown
  impact?: unknown
  confidence?: unknown
}

interface RawExperiment {
  id?: unknown
  title?: unknown
  hypothesis?: unknown
  variant?: unknown
  metric?: unknown
  impact?: unknown
  confidence?: unknown
  implementationHint?: unknown
}

interface RawAiResponse {
  summary?: unknown
  issues?: unknown
  experiments?: unknown
}

function buildImplementationGuidance(techStack: DetectedTech[]): string {
  const names = techStack.map((t) => t.name)
  const lines: string[] = []

  if (names.includes('Adobe Target')) {
    lines.push(
      'For any experiment that can be delivered via Adobe Target, set implementationHint to a concrete description of the Target XT (Experience Targeting) or A/B activity to create, including which mbox or VEC selector to use.',
    )
  }

  if (names.includes('Optimizely')) {
    lines.push(
      'For any experiment that can be delivered via Optimizely, set implementationHint to a concrete description of the Optimizely feature flag or A/B experiment to configure, including the variation key and metric event name.',
    )
  }

  if (lines.length === 0) {
    return 'Omit the implementationHint field from all experiments.'
  }

  return lines.join('\n')
}

function buildUserPrompt(
  signals: ExtractedPageSignals,
  evidence: AnalysisEvidence,
  techStack: DetectedTech[],
): string {
  const techStackLine =
    techStack.length > 0
      ? techStack
          .map((t) => `${t.name} (${t.category}, ${t.confidence} confidence — ${t.evidence})`)
          .join(', ')
      : 'None detected'

  const ctaLine =
    signals.candidateCtaTexts.length > 0
      ? signals.candidateCtaTexts.join(', ')
      : 'None detected'

  const trustLine =
    signals.trustSignalKeywords.length > 0
      ? signals.trustSignalKeywords.join(', ')
      : 'None detected'

  const pageTextSample = signals.pageText.slice(0, PAGE_TEXT_LIMIT)

  return `Analyze the following website page for UX and conversion issues.

PAGE METADATA
URL: ${signals.resolvedUrl}
Title: ${signals.pageTitle || 'Not detected'}
Meta description: ${signals.metaDescription || 'Not detected'}
H1: ${signals.firstH1Text || 'Not detected'}

PAGE SIGNALS
Page type: ${evidence.pageType}
Has form: ${evidence.hasForm}
Primary CTA above fold: ${evidence.primaryCTAAboveFold}
Trust signals visible: ${evidence.trustSignalsVisible}
CTA count: ${evidence.ctaCount}
Candidate CTAs: ${ctaLine}
Detected tech stack: ${techStackLine}

PAGE ARCHITECTURE
Above-fold hero text: ${signals.heroText ?? 'Not detected'}
Button count: ${signals.buttonCount}
Anchor/link count: ${signals.anchorCount}
Form count: ${signals.formCount}
Trust signal keywords found: ${trustLine}

PAGE CONTENT SAMPLE
${pageTextSample}

INSTRUCTIONS
Return a JSON object with EXACTLY this structure — no markdown fences, no explanation, only the JSON:
{
  "summary": "3-4 sentences: what the page is trying to do, who it's for, its biggest conversion opportunity, and one SEO or architectural observation",
  "issues": [
    {
      "id": "<kebab-case-descriptor>",
      "title": "Short issue title",
      "severity": "high" | "medium" | "low",
      "detail": "Specific explanation referencing signals from this page",
      "impact": "Expected impact if addressed",
      "confidence": "High" | "Medium" | "Low"
    }
  ],
  "experiments": [
    {
      "id": "<same-kebab-as-matching-issue>",
      "title": "Experiment title",
      "hypothesis": "If we [specific change referencing page signals], we expect [measurable outcome] because [psychological or architectural reason grounded in observed data]",
      "variant": "Specific description of what to build and test",
      "metric": "Primary metric to measure success",
      "impact": "Expected outcome if the hypothesis is correct",
      "confidence": "High" | "Medium" | "Low",
      "implementationHint": "..."
    }
  ]
}

Generate 4-6 issues ordered by severity, and one experiment per issue.
${buildImplementationGuidance(techStack)}

ANALYSIS PRIORITIES
1. Above-fold experience and hero messaging clarity
2. CTA hierarchy and decision friction
3. Trust signal placement and specificity
4. Form friction and progressive disclosure
5. SEO signals — title tag, H1, meta description alignment
6. Page architecture — load order, content hierarchy, crawlability`
}

function coerceConfidence(raw: unknown): 'High' | 'Medium' | 'Low' {
  if (raw === 'High' || raw === 'Medium' || raw === 'Low') return raw
  return 'Medium'
}

function coerceSeverity(raw: unknown): 'high' | 'medium' | 'low' {
  if (raw === 'high' || raw === 'medium' || raw === 'low') return raw
  return 'medium'
}

function parseIssues(raw: unknown): AnalysisIssue[] {
  if (!Array.isArray(raw)) return []

  return (raw as RawIssue[]).map((item, index) => ({
    id: typeof item.id === 'string' && item.id ? item.id : `issue-${index + 1}`,
    title: typeof item.title === 'string' ? item.title : 'Untitled issue',
    severity: coerceSeverity(item.severity),
    detail: typeof item.detail === 'string' ? item.detail : '',
    impact: typeof item.impact === 'string' ? item.impact : '',
    confidence: coerceConfidence(item.confidence),
  })) as AnalysisIssue[]
}

function parseExperiments(raw: unknown): AnalysisExperiment[] {
  if (!Array.isArray(raw)) return []

  return (raw as RawExperiment[]).map((item, index) => {
    const experiment: AnalysisExperiment = {
      id: typeof item.id === 'string' && item.id ? item.id : `experiment-${index + 1}`,
      title: typeof item.title === 'string' ? item.title : 'Untitled experiment',
      hypothesis: typeof item.hypothesis === 'string' ? item.hypothesis : '',
      variant: typeof item.variant === 'string' ? item.variant : '',
      metric: typeof item.metric === 'string' ? item.metric : '',
      impact: typeof item.impact === 'string' ? item.impact : '',
      confidence: coerceConfidence(item.confidence),
    }

    if (typeof item.implementationHint === 'string' && item.implementationHint) {
      experiment.implementationHint = item.implementationHint
    }

    return experiment
  })
}

export async function analyzeWithAI(
  signals: ExtractedPageSignals,
  evidence: AnalysisEvidence,
  techStack: DetectedTech[],
): Promise<{ summary: string; issues: AnalysisIssue[]; experiments: AnalysisExperiment[] }> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-5.2'

  if (!apiKey) {
    throw new Error(
      'AZURE_OPENAI_KEY is not set. Set this environment variable to enable AI analysis.',
    )
  }

  if (!endpoint) {
    throw new Error(
      'AZURE_OPENAI_ENDPOINT is not set. Set this environment variable to enable AI analysis.',
    )
  }

  const client = new AzureOpenAI({
    endpoint,
    apiKey,
    deployment,
    apiVersion: '2025-01-01-preview',
  })

  let rawJson: string

  try {
    const completion = await client.chat.completions.create({
      model: deployment,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'You are the world\'s leading conversion rate optimisation and digital marketing specialist, combining deep expertise across:',
            '- CRO methodology (hypothesis-driven testing, statistical significance, funnel analysis)',
            '- SEO and organic performance (Core Web Vitals, content hierarchy, crawlability signals)',
            '- Web architecture and frontend performance (page structure, load patterns, JS rendering impact)',
            '- Consumer and B2B psychology (trust signals, cognitive load, decision friction, social proof)',
            '- Personalisation and segmentation (audience-specific messaging, intent detection, progressive disclosure)',
            '',
            'You analyse real websites and return precise, actionable insights grounded in what you can actually observe on the page. You never generate generic advice. Every issue and experiment must reference specific signals from the page data provided.',
            '',
            'Return only valid JSON matching the exact structure specified. No markdown, no explanation, no preamble.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: buildUserPrompt(signals, evidence, techStack),
        },
      ],
    })

    rawJson = completion.choices[0]?.message?.content ?? '{}'
  } catch (error) {
    throw new Error(
      `Azure OpenAI request failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  let parsed: RawAiResponse
  try {
    parsed = JSON.parse(rawJson) as RawAiResponse
  } catch {
    throw new Error(`Azure OpenAI returned invalid JSON: ${rawJson.slice(0, 200)}`)
  }

  const summary = typeof parsed.summary === 'string' ? parsed.summary : ''
  const issues = parseIssues(parsed.issues)
  const experiments = parseExperiments(parsed.experiments)

  return { summary, issues, experiments }
}
