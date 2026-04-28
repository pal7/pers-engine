import { AzureOpenAI } from 'openai/azure'
import type {
  AnalysisEvidence,
  AnalysisIssue,
  DetectedTech,
} from '../../../shared/analysis.ts'
import type { ExtractedPageSignals } from './extractPageSignals.ts'

const PAGE_TEXT_LIMIT = 1500

// Raw shape GPT returns before we validate and stamp IDs
interface RawIssue {
  id?: unknown
  title?: unknown
  severity?: unknown
  detail?: unknown
  impact?: unknown
  confidence?: unknown
}

interface RawAiResponse {
  summary?: unknown
  issues?: unknown
}

function getCategoryContext(pageType: string): string {
  switch (pageType) {
    case 'ecommerce':
      return 'Typical issues: cart abandonment, trust signals, CTA hierarchy, product clarity'
    case 'saas':
      return 'Typical issues: value proposition clarity, trial friction, feature overwhelm, social proof'
    case 'travel':
      return 'Typical issues: booking friction, trust signals, urgency patterns, price transparency'
    case 'finance':
      return 'Typical issues: trust and compliance signals, complexity reduction, CTA clarity'
    default:
      return 'Typical issues: messaging clarity, CTA hierarchy, trust signals, conversion friction'
  }
}


function buildUserPrompt(
  signals: ExtractedPageSignals,
  evidence: AnalysisEvidence,
  techStack: DetectedTech[],
): string {
  const metaLines: string[] = [`URL: ${signals.resolvedUrl}`]
  if (signals.pageTitle) metaLines.push(`Title: ${signals.pageTitle}`)
  if (signals.metaDescription) metaLines.push(`Meta description: ${signals.metaDescription}`)
  if (signals.firstH1Text) metaLines.push(`H1: ${signals.firstH1Text}`)

  const signalLines: string[] = [
    `Has form: ${evidence.hasForm}`,
    `Primary CTA above fold: ${evidence.primaryCTAAboveFold}`,
    `Trust signals visible: ${evidence.trustSignalsVisible}`,
    `CTA count: ${evidence.ctaCount}`,
  ]
  if (signals.candidateCtaTexts.length > 0) {
    signalLines.push(`Candidate CTAs: ${signals.candidateCtaTexts.join(', ')}`)
  }
  if (techStack.length > 0) {
    signalLines.push(
      `Detected tech stack: ${techStack
        .map((t) => `${t.name} (${t.category}, ${t.confidence} confidence — ${t.evidence})`)
        .join(', ')}`,
    )
  }

  const archLines: string[] = [`Button count: ${signals.buttonCount}`]
  if (signals.heroText) archLines.push(`Above-fold hero text: ${signals.heroText}`)
  if (signals.formCount > 0) archLines.push(`Form count: ${signals.formCount}`)
  if (signals.trustSignalKeywords.length > 0) {
    archLines.push(`Trust signal keywords found: ${signals.trustSignalKeywords.join(', ')}`)
  }

  const pageTextSample = signals.pageText.slice(0, PAGE_TEXT_LIMIT)

  return `ANALYSIS CONTEXT
Page category: ${evidence.pageType}
Industry benchmark: ${getCategoryContext(evidence.pageType)}

PAGE METADATA
${metaLines.join('\n')}

PAGE SIGNALS
${signalLines.join('\n')}

PAGE ARCHITECTURE
${archLines.join('\n')}

PAGE CONTENT SAMPLE
${pageTextSample}

INSTRUCTIONS
ANALYSIS PRIORITIES — evaluate in this order:
1. Above-fold experience and hero messaging clarity
2. CTA hierarchy and decision friction
3. Trust signal placement and specificity
4. Form friction and progressive disclosure
5. SEO signals — title tag, H1, meta description alignment
6. Page architecture — load order, content hierarchy, crawlability

Return a JSON object with EXACTLY this structure — no markdown fences, no explanation, only the JSON:
{
  "summary": "2-3 sentences: primary conversion goal of this page, the single biggest friction point observed, and one specific quick win",
  "issues": [
    {
      "id": "<kebab-case-descriptor>",
      "title": "Short issue title",
      "severity": "high" | "medium" | "low",
      "detail": "Specific explanation referencing signals from this page",
      "impact": "Expected impact if addressed",
      "confidence": "High" | "Medium" | "Low"
    }
  ]
}

Generate exactly 4 issues ordered by severity.
Do not generate experiments — those are handled separately.`
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

export async function analyzeWithAI(
  signals: ExtractedPageSignals,
  evidence: AnalysisEvidence,
  techStack: DetectedTech[],
): Promise<{ summary: string; issues: AnalysisIssue[] }> {
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
    timeout: 30_000,
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
            'You are an expert CRO analyst, UX strategist, and digital marketing specialist with deep knowledge of:',
            '- Conversion rate optimisation: funnel analysis, hypothesis design, A/B testing methodology',
            '- UX psychology: cognitive load, decision friction, trust signals, social proof patterns',
            '- SEO fundamentals: title/H1/meta alignment, content hierarchy, Core Web Vitals impact',
            '- Personalisation platforms: Adobe Target, Optimizely, VWO — implementation patterns and best practices',
            '',
            'Your analysis is grounded strictly in observed page signals. You never invent signals not present in the data. Every issue must cite a specific signal. Every experiment must follow this hypothesis format exactly:',
            '"If we [specific change], we expect [measurable outcome] because [reason grounded in observed signals]."',
            '',
            'Return only valid JSON. No markdown. No preamble. No explanation.',
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

  return { summary, issues }
}
