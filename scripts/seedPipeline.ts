import { SearchClient, AzureKeyCredential } from '@azure/search-documents'
import { AzureOpenAI } from 'openai/azure'
import pLimit from 'p-limit'
import { SEED_URLS } from './seedUrls.ts'
import { extractHtmlSignals } from '../backend/src/services/extractHtmlSignals.ts'
import { detectTechStack } from '../backend/src/services/techStackDetector.ts'
import { buildEvidence } from '../backend/src/services/buildEvidence.ts'
import { analyzeWithAI } from '../backend/src/services/openAiService.ts'
import type { ExtractedPageSignals } from '../backend/src/services/extractPageSignals.ts'

// ── env validation ────────────────────────────────────────────────────────────

const AZURE_OPENAI_ENDPOINT    = process.env.AZURE_OPENAI_ENDPOINT    ?? ''
const AZURE_OPENAI_KEY         = process.env.AZURE_OPENAI_KEY         ?? ''
const AZURE_EMBEDDING_DEPLOYMENT = process.env.AZURE_EMBEDDING_DEPLOYMENT ?? 'text-embedding-ada-002'
const AZURE_SEARCH_ENDPOINT    = process.env.AZURE_SEARCH_ENDPOINT    ?? ''
const AZURE_SEARCH_KEY         = process.env.AZURE_SEARCH_KEY         ?? ''

if (!AZURE_OPENAI_KEY || !AZURE_OPENAI_ENDPOINT) {
  console.error('AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY must be set.')
  process.exit(1)
}
if (!AZURE_SEARCH_ENDPOINT || !AZURE_SEARCH_KEY) {
  console.error('AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_KEY must be set.')
  process.exit(1)
}

// ── clients ───────────────────────────────────────────────────────────────────

const embeddingClient = new AzureOpenAI({
  endpoint: AZURE_OPENAI_ENDPOINT,
  apiKey: AZURE_OPENAI_KEY,
  deployment: AZURE_EMBEDDING_DEPLOYMENT,
  apiVersion: '2025-01-01-preview',
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

// ── per-URL processing ────────────────────────────────────────────────────────

async function processUrl(
  url: string,
  category: string,
  index: number,
  total: number,
): Promise<boolean> {
  const hostname = new URL(url).hostname.replace(/^www\./, '')

  try {
    // 1. fetch HTML signals
    const extraction = await extractHtmlSignals(url)

    // 2. adapt ExtractionResult → ExtractedPageSignals
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

    // 3. tech stack detection
    const techStack = detectTechStack(extraction.rawHtml)

    // 4. build evidence
    const evidence = buildEvidence(adaptedSignals)

    // 5. AI analysis
    const { summary, issues } = await analyzeWithAI(adaptedSignals, evidence, techStack)

    // 6. embedding
    const embeddingText = [
      summary,
      ...issues.map((i) => i.title),
    ].join(' ')

    const embeddingResponse = await embeddingClient.embeddings.create({
      model: AZURE_EMBEDDING_DEPLOYMENT,
      input: embeddingText,
    })
    const embedding = embeddingResponse.data[0]?.embedding ?? []

    // 7. upload to AI Search
    const docId = url.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')

    const document: AnalysisDocument = {
      id:          docId,
      url,
      category,
      summary,
      issues:      JSON.stringify(issues),
      experiments: '',
      techStack:   JSON.stringify(techStack),
      pageType:    evidence.pageType,
      heroText:    evidence.heroText,
      ctaTexts:    JSON.stringify(adaptedSignals.candidateCtaTexts),
      embedding,
      scrapedAt:   new Date().toISOString(),
    }

    await searchClient.uploadDocuments([document])

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
  let completed = 0
  let succeeded = 0
  const categoryCount: Record<string, number> = {}

  // Sequential GPT call gating: enforce 500ms between AI calls using a shared queue
  let lastAiCallAt = 0

  const throttledProcess = async (url: string, category: string, index: number) => {
    const now = Date.now()
    const wait = Math.max(0, 500 - (now - lastAiCallAt))
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastAiCallAt = Date.now()

    const ok = await processUrl(url, category, index, total)
    completed++
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

  const categoryLine = Object.entries(categoryCount)
    .map(([cat, count]) => `${cat} ${count}`)
    .join(', ')
  console.log(`Categories: ${categoryLine}`)
}

main().catch((err: unknown) => {
  console.error('Pipeline crashed:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
