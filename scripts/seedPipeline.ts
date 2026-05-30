import { SearchClient, AzureKeyCredential } from '@azure/search-documents'
import { AzureOpenAI } from 'openai/azure'
import pLimit from 'p-limit'
import { SEED_URLS } from './seedUrls.ts'
import { extractHtmlSignals } from '../backend/src/services/extractHtmlSignals.ts'
import { detectTechStack } from '../backend/src/services/techStackDetector.ts'
import { buildEvidence } from '../backend/src/services/buildEvidence.ts'
import type { AnalysisEvidence, AnalysisIssue } from '../shared/analysis.ts'
import type { ExtractedPageSignals } from '../backend/src/services/extractPageSignals.ts'

// ── env validation ────────────────────────────────────────────────────────────

const AZURE_OPENAI_ENDPOINT      = process.env.AZURE_OPENAI_ENDPOINT      ?? ''
const AZURE_OPENAI_KEY           = process.env.AZURE_OPENAI_KEY           ?? ''
const AZURE_OPENAI_DEPLOYMENT    = process.env.AZURE_OPENAI_DEPLOYMENT    ?? ''
const AZURE_EMBEDDING_ENDPOINT   = process.env.AZURE_EMBEDDING_ENDPOINT   ?? ''
const AZURE_EMBEDDING_KEY        = process.env.AZURE_EMBEDDING_KEY        ?? ''
const AZURE_EMBEDDING_DEPLOYMENT = process.env.AZURE_EMBEDDING_DEPLOYMENT ?? 'text-embedding-ada-002'
const AZURE_SEARCH_ENDPOINT      = process.env.AZURE_SEARCH_ENDPOINT      ?? ''
const AZURE_SEARCH_KEY           = process.env.AZURE_SEARCH_KEY           ?? ''

if (!AZURE_OPENAI_KEY || !AZURE_OPENAI_ENDPOINT) {
  console.error('AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY must be set.')
  process.exit(1)
}
if (!AZURE_OPENAI_DEPLOYMENT) {
  console.error('AZURE_OPENAI_DEPLOYMENT must be set (check backend/.env for the actual deployment name).')
  process.exit(1)
}
if (!AZURE_EMBEDDING_ENDPOINT || !AZURE_EMBEDDING_KEY) {
  console.error('AZURE_EMBEDDING_ENDPOINT and AZURE_EMBEDDING_KEY must be set.')
  process.exit(1)
}
if (!AZURE_SEARCH_ENDPOINT || !AZURE_SEARCH_KEY) {
  console.error('AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_KEY must be set.')
  process.exit(1)
}

// ── clients ───────────────────────────────────────────────────────────────────

const embeddingClient = new AzureOpenAI({
  endpoint: AZURE_EMBEDDING_ENDPOINT,
  apiKey: AZURE_EMBEDDING_KEY,
  deployment: AZURE_EMBEDDING_DEPLOYMENT,
  apiVersion: '2025-01-01-preview',
  timeout: 30_000,
})

interface AnalysisDocument {
  id: string
  url: string
  category: string
  summary: string
  issues: string
  experiments: string
  techStack: string
  pageType: string
  heroText: string
  ctaTexts: string
  embedding: number[]
  scrapedAt: string
}

const searchClient = new SearchClient<AnalysisDocument>(
  AZURE_SEARCH_ENDPOINT,
  'analyses',
  new AzureKeyCredential(AZURE_SEARCH_KEY),
)

// ── trust keywords (mirrors analysisService.ts) ───────────────────────────────

const TRUST_KEYWORDS = [
  'customer stories', 'customers', 'guarantee', 'money back', 'rated',
  'rating', 'reviews', 'secure', 'testimonial', 'testimonials',
  'trusted by', 'verified',
]

// ── local AI analysis (decoupled from backend node_modules) ──────────────────

const PAGE_TEXT_LIMIT = 1500

const CATEGORY_CONTEXT: Record<string, string> = {
  ecommerce:  'Typical issues: cart abandonment, trust signals, CTA hierarchy, product clarity',
  saas:       'Typical issues: value proposition clarity, trial friction, feature overwhelm, social proof',
  travel:     'Typical issues: booking friction, trust signals, urgency patterns, price transparency',
  finance:    'Typical issues: trust and compliance signals, complexity reduction, CTA clarity',
  healthcare: 'Typical issues: appointment friction, trust signals, compliance clarity, CTA specificity',
}

function buildSeedPrompt(signals: ExtractedPageSignals, evidence: AnalysisEvidence): string {
  const meta: string[] = [`URL: ${signals.resolvedUrl}`]
  if (signals.pageTitle)   meta.push(`Title: ${signals.pageTitle}`)
  if (signals.firstH1Text) meta.push(`H1: ${signals.firstH1Text}`)
  if (signals.heroText)    meta.push(`Above-fold hero text: ${signals.heroText}`)

  const ctaLine = signals.candidateCtaTexts.length > 0
    ? `\nCandidate CTAs: ${signals.candidateCtaTexts.join(', ')}`
    : ''

  return `ANALYSIS CONTEXT
Page category: ${evidence.pageType}
Industry benchmark: ${CATEGORY_CONTEXT[evidence.pageType] ?? 'Typical issues: messaging clarity, CTA hierarchy, trust signals, conversion friction'}

PAGE METADATA
${meta.join('\n')}

PAGE SIGNALS
Has form: ${evidence.hasForm}
Primary CTA above fold: ${evidence.primaryCTAAboveFold}
Trust signals visible: ${evidence.trustSignalsVisible}
CTA count: ${evidence.ctaCount}${ctaLine}

PAGE CONTENT SAMPLE
${signals.pageText.slice(0, PAGE_TEXT_LIMIT)}

Return a JSON object with EXACTLY this structure — no markdown fences, no explanation, only the JSON:
{
  "summary": "2-3 sentences: primary conversion goal, the single biggest friction point, and one specific quick win",
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
Generate exactly 4 issues ordered by severity. Do not generate experiments.`
}

async function analyzeForSeed(
  signals: ExtractedPageSignals,
  evidence: AnalysisEvidence,
): Promise<{ summary: string; issues: AnalysisIssue[] }> {
  const client = new AzureOpenAI({
    endpoint: AZURE_OPENAI_ENDPOINT,
    apiKey: AZURE_OPENAI_KEY,
    deployment: AZURE_OPENAI_DEPLOYMENT,
    apiVersion: '2025-01-01-preview',
    timeout: 30_000,
  })

  const completion = await client.chat.completions.create({
    model: AZURE_OPENAI_DEPLOYMENT,
    response_format: { type: 'json_object' },
    max_completion_tokens: 2048,
    messages: [
      {
        role: 'system',
        content: 'You are an expert CRO analyst. Your analysis is grounded strictly in observed page signals. Return only valid JSON. No markdown. No preamble.',
      },
      {
        role: 'user',
        content: buildSeedPrompt(signals, evidence),
      },
    ],
  })

  const rawJson = completion.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(rawJson) as { summary?: unknown; issues?: unknown }

  const summary = typeof parsed.summary === 'string' ? parsed.summary : ''
  const issues: AnalysisIssue[] = Array.isArray(parsed.issues)
    ? (parsed.issues as Array<Record<string, unknown>>).map((item, idx) => ({
        id:         typeof item['id'] === 'string' && item['id'] ? item['id'] : `issue-${idx + 1}`,
        title:      typeof item['title'] === 'string' ? item['title'] : 'Untitled issue',
        severity:   (['high', 'medium', 'low'].includes(item['severity'] as string)
                      ? item['severity'] : 'medium') as 'high' | 'medium' | 'low',
        detail:     typeof item['detail'] === 'string' ? item['detail'] : '',
        impact:     typeof item['impact'] === 'string' ? item['impact'] : '',
        confidence: (['High', 'Medium', 'Low'].includes(item['confidence'] as string)
                      ? item['confidence'] : 'Medium') as 'High' | 'Medium' | 'Low',
      }))
    : []

  return { summary, issues }
}

// ── per-URL processing ────────────────────────────────────────────────────────

async function processUrl(
  url: string,
  category: string,
  index: number,
  total: number,
): Promise<boolean> {
  const hostname = new URL(url).hostname.replace(/^www\./, '')

  try {
    const extraction = await extractHtmlSignals(url)

    const combinedText = [
      extraction.signals.title,
      extraction.signals.h1,
      extraction.signals.heroText,
      extraction.signals.textSample,
      ...extraction.signals.ctaTexts,
    ].join(' ').toLowerCase()

    const adaptedSignals: ExtractedPageSignals = {
      resolvedUrl:         extraction.signals.finalUrl || url,
      pageTitle:           extraction.signals.title,
      metaDescription:     '',
      firstH1Text:         extraction.signals.h1,
      heroText:            extraction.signals.heroText,
      hasForm:             extraction.signals.hasForm,
      formCount:           extraction.signals.hasForm ? 1 : 0,
      buttonCount:         extraction.signals.buttonCount,
      anchorCount:         0,
      candidateCtaTexts:   extraction.signals.ctaTexts,
      pageText:            extraction.signals.textSample,
      primaryCtaHeuristic:
        extraction.signals.ctaTexts.length > 0 &&
        Boolean(extraction.signals.heroText || extraction.signals.h1),
      trustSignalKeywords: TRUST_KEYWORDS.filter((kw) => combinedText.includes(kw)),
    }

    const techStack = detectTechStack(extraction.rawHtml)
    const evidence = buildEvidence(adaptedSignals)
    const { summary, issues } = await analyzeForSeed(adaptedSignals, evidence)

    const embeddingText = [summary, ...issues.map((i) => i.title)].join(' ')
    const embeddingResponse = await embeddingClient.embeddings.create({
      model: AZURE_EMBEDDING_DEPLOYMENT,
      input: embeddingText,
    })
    const embedding = embeddingResponse.data[0]?.embedding ?? []

    const docId = url.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

    await searchClient.uploadDocuments([{
      id:          docId,
      url,
      category,
      summary,
      issues:      JSON.stringify(issues),
      experiments: '',
      techStack:   JSON.stringify(techStack),
      pageType:    category,
      heroText:    evidence.heroText,
      ctaTexts:    JSON.stringify(adaptedSignals.candidateCtaTexts),
      embedding,
      scrapedAt:   new Date().toISOString(),
    }])

    console.log(`✓ [${index}/${total}] ${hostname} [${category}] — ${issues.length} issues`)
    return true
  } catch (err) {
    console.error(`✗ [${index}/${total}] ${hostname} [${category}] — ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const total = SEED_URLS.length
  console.log(`Starting seed pipeline: ${total} URLs, 3 concurrent, 500ms delay between GPT calls.\n`)

  const limit = pLimit(3)
  let succeeded = 0
  const categoryCount: Record<string, number> = {}

  let lastAiCallAt = 0

  const throttledProcess = async (url: string, category: string, index: number) => {
    const now = Date.now()
    const wait = Math.max(0, 500 - (now - lastAiCallAt))
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastAiCallAt = Date.now()

    const ok = await processUrl(url, category, index, total)
    if (ok) {
      succeeded++
      categoryCount[category] = (categoryCount[category] ?? 0) + 1
    }
    return ok
  }

  await Promise.all(
    SEED_URLS.map(({ url, category }, i) =>
      limit(() => throttledProcess(url, category, i + 1)),
    ),
  )

  const failed = total - succeeded
  console.log(`\nDone: ${succeeded}/${total} succeeded | ${failed} failed`)
  console.log(`Categories: ${Object.entries(categoryCount).map(([c, n]) => `${c} ${n}`).join(', ')}`)
}

main().catch((err: unknown) => {
  console.error('Pipeline crashed:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
