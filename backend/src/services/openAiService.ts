import { AzureOpenAI } from 'openai/azure'
import type {
  AnalysisEvidence,
  AnalysisIssue,
  DetectedTech,
} from '../../../shared/analysis.ts'
import type { ExtractedPageSignals } from './extractPageSignals.ts'
import type { ComparableSite } from '../../../shared/analysis.ts'

const PAGE_TEXT_LIMIT = 800

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
      return 'product benefits unclear, buy button hard to find, too few reviews near the buy button, surprise costs revealed at checkout'
    case 'saas':
      return 'unclear what the product does or who it is for, no free trial offer, pricing hidden or confusing, no recognisable customer logos'
    case 'travel':
      return 'too many steps to book, fees revealed late, hard to compare options, no social proof near the search or book button'
    case 'finance':
      return 'too much jargon, unclear fees, weak security or trust signals, sign-up form asks for too much upfront'
    default:
      return 'unclear opening headline, main button hard to find, no visible trust signals, confusing navigation'
  }
}

function buildUserPrompt(
  signals: ExtractedPageSignals,
  evidence: AnalysisEvidence,
  techStack: DetectedTech[],
  comparableSites: ComparableSite[] = [],
  agentCaptions: string[] = [],
): string {
  return buildUserPromptPreview(signals, evidence, techStack, comparableSites, agentCaptions)
}

// TODO: Review conversion research (Baymard Institute, Nielsen Norman Group, Google Core Web Vitals,
// CXL Institute) to validate signal priorities and ensure highest-impact indicators are listed first.
export function buildUserPromptPreview(
  signals: ExtractedPageSignals,
  evidence: AnalysisEvidence,
  techStack: DetectedTech[],
  comparableSites: ComparableSite[] = [],
  agentCaptions: string[] = [],
): string {
  const metaLines: string[] = [`URL: ${signals.resolvedUrl}`]
  if (signals.pageTitle) metaLines.push(`Title: ${signals.pageTitle}`)
  if (signals.metaDescription) metaLines.push(`Meta description: ${signals.metaDescription}`)
  if (signals.firstH1Text) metaLines.push(`H1: ${signals.firstH1Text}`)

  const signalLines: string[] = [
    `Has form: ${evidence.hasForm}`,
    `Main button visible without scrolling: ${evidence.primaryCTAAboveFold}`,
    `Trust signals visible: ${evidence.trustSignalsVisible}`,
    `CTA count: ${evidence.ctaCount}`,
  ]
  if (signals.candidateCtaTexts.length > 0) {
    signalLines.push(`Button labels: ${signals.candidateCtaTexts.join(', ')}`)
  }
  if (techStack.length > 0) {
    signalLines.push(
      `Detected tech stack: ${techStack
        .map((t) => `${t.name} (${t.category}, ${t.confidence} confidence — ${t.evidence})`)
        .join(', ')}`,
    )
  }

  const archLines: string[] = [`Button count: ${signals.buttonCount}`]
  if (signals.heroText) archLines.push(`Opening headline: ${signals.heroText}`)
  if (signals.formCount > 0) archLines.push(`Form count: ${signals.formCount}`)
  if (signals.trustSignalKeywords.length > 0) {
    archLines.push(`Trust words found: ${signals.trustSignalKeywords.join(', ')}`)
  }

  const pageTextSample = signals.pageText.slice(0, PAGE_TEXT_LIMIT)

  const comparableSection =
    comparableSites.length > 0
      ? '\n\nCOMPARABLE BUSINESSES\nThese sites share a similar business model and audience. Identify where the analyzed site has the same friction patterns and where it diverges:\n' +
        comparableSites
          .map(
            (s, i) => {
              const profile = [s.businessType, s.productCategory, s.audience, s.industryVertical]
                .filter(Boolean).join(' | ')
              return `${i + 1}. ${s.url}${profile ? ` — ${profile}` : ''}\n   ${s.summary}`
            },
          )
          .join('\n')
      : ''

  const visualSection =
    agentCaptions.length > 0
      ? '\n\nVISUAL OBSERVATIONS\nFrom a live browser session (screenshot + AI vision):\n' +
        agentCaptions.map((c) => `- ${c}`).join('\n')
      : ''

  return `PAGE CONTEXT
Category: ${evidence.pageType}
Common problems for this type: ${getCategoryContext(evidence.pageType)}

PAGE METADATA
${metaLines.join('\n')}

PAGE SIGNALS
${signalLines.join('\n')}

PAGE ARCHITECTURE
${archLines.join('\n')}

PAGE TEXT SAMPLE
${pageTextSample}${comparableSection}${visualSection}

WHAT TO CHECK (priority order)
1. Does the opening headline clearly say what the product does and who it is for?
2. Is the main action button easy to spot without scrolling?
3. Are there reviews, guarantees, or recognisable logos near the main button?
4. Does a sign-up or contact form ask for too much information upfront?
5. Does the page title match the main heading?

Return JSON only — no markdown, no extra text:
{"summary":"2-3 sentences: what this page is trying to achieve, the biggest obstacle stopping visitors from acting, and one specific change that would help","issues":[{"id":"kebab-slug","title":"Plain-English title (max 8 words)","severity":"high|medium|low","detail":"What is wrong and which observed signal shows it","impact":"What gets better if this is fixed","confidence":"High|Medium|Low"}]}

Exactly 2 issues, most severe first. No experiments.`
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

export async function analyzeWithVision(imageUrl: string, prompt: string): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-5.2'

  if (!apiKey || !endpoint) {
    throw new Error('AZURE_OPENAI_KEY and AZURE_OPENAI_ENDPOINT are required for vision analysis.')
  }

  const client = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion: '2025-01-01-preview', timeout: 20_000 })

  try {
    const completion = await client.chat.completions.create({
      model: deployment,
      max_completion_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })
    return completion.choices[0]?.message?.content ?? ''
  } catch (error) {
    throw new Error(`Azure OpenAI vision request failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function analyzeWithAI(
  signals: ExtractedPageSignals,
  evidence: AnalysisEvidence,
  techStack: DetectedTech[],
  comparableSites: ComparableSite[] = [],
  agentCaptions: string[] = [],
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

  const userPrompt = buildUserPrompt(signals, evidence, techStack, comparableSites, agentCaptions)
  const hasComparables = userPrompt.includes('COMPARABLE BUSINESSES')
  console.log(`[openai] prompt built — ${userPrompt.length} chars, comparable section: ${hasComparables}, visual captions: ${agentCaptions.length}`)
  if (hasComparables) {
    const idx = userPrompt.indexOf('COMPARABLE BUSINESSES')
    console.log('[openai] comparable inject preview:', userPrompt.slice(idx, idx + 200).replace(/\n/g, ' '))
  }

  let rawJson: string

  try {
    const completion = await client.chat.completions.create({
      model: deployment,
      response_format: { type: 'json_object' },
      max_completion_tokens: 1024,
      messages: [
        {
          role: 'system',
          content: [
            'You are a website improvement expert helping business owners understand why their pages lose visitors.',
            'Write in plain English that a founder without a marketing background can understand.',
            'Never use jargon: avoid "CRO", "above-fold", "primary CTA", "progressive disclosure", "cognitive load", "hero section". Instead write "top of page", "main button", "sign-up form", "too many steps", "opening headline".',
            '',
            'Ground every issue in specific signals from the page data — never invent signals not present in the prompt.',
            'Return only valid JSON. No markdown. No preamble.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: userPrompt,
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
