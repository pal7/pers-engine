import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { BlobServiceClient } from '@azure/storage-blob'
import { analyzeWithVision } from './openAiService.js'
import type {
  AgentObservation,
  AgentSession,
  AnalysisPageType,
  DetectedTech,
  TechStackCategory,
} from '../../../shared/analysis.ts'

const TOTAL_TIMEOUT_MS = 60_000
const STEP_TIMEOUT_MS = 10_000

// Domains to match during network interception for tech detection
const NETWORK_TECH_PATTERNS: Array<{ pattern: RegExp; name: string; category: TechStackCategory }> = [
  { pattern: /google-analytics\.com|analytics\.google\.com/, name: 'Google Analytics 4', category: 'analytics' },
  { pattern: /googletagmanager\.com/, name: 'Google Tag Manager', category: 'tag-manager' },
  { pattern: /cdn\.segment\.com|api\.segment\.io/, name: 'Segment', category: 'cdp' },
  { pattern: /script\.hotjar\.com|insights\.hotjar\.com/, name: 'Hotjar', category: 'heatmap' },
  { pattern: /static\.klaviyo\.com/, name: 'Klaviyo', category: 'crm' },
  { pattern: /js\.intercomcdn\.com|widget\.intercom\.io/, name: 'Intercom', category: 'crm' },
  { pattern: /snap\.licdn\.com|linkedin\.com\/px/, name: 'LinkedIn Insight', category: 'analytics' },
  { pattern: /connect\.facebook\.net/, name: 'Meta Pixel', category: 'analytics' },
  { pattern: /bat\.bing\.com/, name: 'Microsoft UET', category: 'analytics' },
  { pattern: /cdn\.amplitude\.com|api\.amplitude\.com/, name: 'Amplitude', category: 'analytics' },
  { pattern: /js\.hs-scripts\.com|js\.hubspot\.com/, name: 'HubSpot', category: 'crm' },
  { pattern: /munchkin\.marketo\.net/, name: 'Marketo', category: 'crm' },
  { pattern: /optimizely\.com\/js/, name: 'Optimizely', category: 'ab-testing' },
  { pattern: /cdn\.vwo\.com|visualwebsiteoptimizer/, name: 'VWO', category: 'ab-testing' },
  { pattern: /tt\.omtrdc\.net|\/at\.js/, name: 'Adobe Target', category: 'ab-testing' },
]

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withStepTimeout<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([
      fn(),
      sleep(STEP_TIMEOUT_MS).then(() => {
        throw new Error(`Step timed out after ${STEP_TIMEOUT_MS}ms`)
      }),
    ])
  } catch (error) {
    console.warn(`[agent] ${label} failed:`, error instanceof Error ? error.message : String(error))
    return fallback
  }
}

async function storeScreenshot(buf: Buffer, sessionId: string, step: number): Promise<string> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set')
  }

  const client = BlobServiceClient.fromConnectionString(connectionString)
  const containerClient = client.getContainerClient('agent-screenshots')
  await containerClient.createIfNotExists({ access: 'blob' })

  const blobName = `${sessionId}/${step}.png`
  const blockBlob = containerClient.getBlockBlobClient(blobName)
  await blockBlob.uploadData(buf, { blobHTTPHeaders: { blobContentType: 'image/png' } })

  return blockBlob.url
}

function detectTechFromRequests(interceptedUrls: string[]): DetectedTech[] {
  const seen = new Set<string>()
  const results: DetectedTech[] = []

  for (const url of interceptedUrls) {
    for (const { pattern, name, category } of NETWORK_TECH_PATTERNS) {
      if (!seen.has(name) && pattern.test(url)) {
        seen.add(name)
        results.push({
          name,
          category,
          confidence: 'definitive',
          evidence: `Network request intercepted: ${url.slice(0, 80)}`,
        })
      }
    }
  }

  return results
}

export async function runAgentAnalysis(
  url: string,
  onObservation?: (obs: AgentObservation) => void,
): Promise<AgentSession> {
  const sessionId = crypto.randomUUID()
  const startMs = Date.now()
  const observations: AgentObservation[] = []
  const screenshots: string[] = []
  let techStack: DetectedTech[] = []
  let summary = ''
  const pageType: AnalysisPageType = 'general'

  const emit = (obs: AgentObservation) => {
    observations.push(obs)
    onObservation?.(obs)
  }

  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined

  const agentLoop = async () => {
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
    })
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    })
    const page = await context.newPage()

    // Register network interception before navigation
    const interceptedUrls: string[] = []
    page.on('request', (req) => interceptedUrls.push(req.url()))

    // Step 1: navigate
    await withStepTimeout('navigate', async () => {
      await page.goto(url, { waitUntil: 'networkidle', timeout: STEP_TIMEOUT_MS })
      emit({ step: 1, action: 'navigate', target: url, result: `Navigated to ${page.url()}` })
    }, undefined)

    // Step 2: above-fold screenshot + vision
    await withStepTimeout('above-fold screenshot', async () => {
      const buf = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1440, height: 900 } })
      let screenshotUrl: string | undefined
      try {
        screenshotUrl = await storeScreenshot(buf, sessionId, 2)
        screenshots.push(screenshotUrl)
      } catch (err) {
        console.warn('[agent] screenshot upload failed:', err instanceof Error ? err.message : err)
      }

      let visionResult = 'Screenshot captured.'
      if (screenshotUrl && process.env.AZURE_OPENAI_KEY) {
        try {
          visionResult = await analyzeWithVision(
            screenshotUrl,
            'You are a CRO analyst. Describe what you see above the fold: the headline, primary CTA, value proposition, and any trust signals. Be concise (3-4 sentences).',
          )
        } catch (err) {
          visionResult = `Screenshot captured (vision analysis unavailable: ${err instanceof Error ? err.message : String(err)})`
        }
      }

      emit({ step: 2, action: 'screenshot', result: visionResult, screenshotUrl })
    }, undefined)

    // Step 3: tech stack from network requests
    await withStepTimeout('tech detection', async () => {
      techStack = detectTechFromRequests(interceptedUrls)
      const names = techStack.map((t) => t.name).join(', ') || 'None detected'
      emit({ step: 3, action: 'extract', result: `Detected from network requests: ${names}` })
    }, undefined)

    // Step 4: scroll 50% + screenshot
    await withStepTimeout('scroll + screenshot', async () => {
      await page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight * 0.5, behavior: 'instant' })
      })
      await sleep(600)

      const buf = await page.screenshot({ type: 'png' })
      let screenshotUrl: string | undefined
      try {
        screenshotUrl = await storeScreenshot(buf, sessionId, 4)
        screenshots.push(screenshotUrl)
      } catch (err) {
        console.warn('[agent] mid-page screenshot upload failed:', err instanceof Error ? err.message : err)
      }

      let visionResult = 'Mid-page screenshot captured.'
      if (screenshotUrl && process.env.AZURE_OPENAI_KEY) {
        try {
          visionResult = await analyzeWithVision(
            screenshotUrl,
            'You are a CRO analyst. Describe what you see in this mid-page screenshot: key content sections, CTAs, social proof, and any conversion friction. Be concise (2-3 sentences).',
          )
        } catch (err) {
          visionResult = `Mid-page screenshot captured (vision unavailable: ${err instanceof Error ? err.message : String(err)})`
        }
      }

      emit({ step: 4, action: 'scroll', result: visionResult, screenshotUrl })
    }, undefined)

    // Step 5: find and click primary CTA
    await withStepTimeout('click primary CTA', async () => {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await sleep(300)

      const ctaSelector = 'button, a[href], input[type="submit"], [role="button"]'
      const ctaHandle = await page.evaluateHandle((sel) => {
        const els = Array.from(document.querySelectorAll(sel))
        const isVisible = (el: Element) => {
          const rect = el.getBoundingClientRect()
          const style = window.getComputedStyle(el)
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
        }
        const scored = els
          .filter(isVisible)
          .map((el) => {
            const rect = el.getBoundingClientRect()
            const text = (el instanceof HTMLInputElement ? el.value : el.textContent ?? '').trim().toLowerCase()
            const isCta = /get|start|try|sign|buy|shop|book|free|demo|contact|learn|see|view/.test(text)
            return { el, area: rect.width * rect.height, isCta }
          })
          .sort((a, b) => (b.isCta ? 1 : 0) - (a.isCta ? 1 : 0) || b.area - a.area)
        return scored[0]?.el ?? null
      }, ctaSelector)

      const ctaEl = ctaHandle.asElement()
      if (!ctaEl) {
        emit({ step: 5, action: 'click', result: 'No primary CTA found above fold.' })
        return
      }

      const ctaText = await ctaEl.evaluate((el) =>
        (el instanceof HTMLInputElement ? el.value : el.textContent ?? '').trim(),
      )

      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 3000 }).catch(() => null),
        ctaEl.click({ timeout: 3000 }).catch(() => {}),
      ])
      await sleep(1200)

      const targetPage = newPage ?? page
      const buf = await targetPage.screenshot({ type: 'png' })
      let screenshotUrl: string | undefined
      try {
        screenshotUrl = await storeScreenshot(buf, sessionId, 5)
        screenshots.push(screenshotUrl)
      } catch {}

      let visionResult = `Clicked "${ctaText}".`
      if (screenshotUrl && process.env.AZURE_OPENAI_KEY) {
        try {
          visionResult = await analyzeWithVision(
            screenshotUrl,
            `You are a CRO analyst. The user just clicked the CTA "${ctaText}". Describe what happened: did a modal open, a new page load, a form appear? Note any friction or positive signals. Be concise (2-3 sentences).`,
          )
        } catch {}
      }

      emit({ step: 5, action: 'click', target: ctaText, result: visionResult, screenshotUrl })

      if (newPage) await newPage.close().catch(() => {})
    }, undefined)

    // Step 6: form friction analysis
    await withStepTimeout('form analysis', async () => {
      const formData = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form'))
        if (forms.length === 0) return null
        const form = forms[0]
        const fields = Array.from(form.querySelectorAll('input, select, textarea')).filter((el) => {
          const input = el as HTMLInputElement
          return !['hidden', 'submit', 'button'].includes(input.type ?? '')
        })
        return {
          fieldCount: fields.length,
          requiredCount: fields.filter((el) => (el as HTMLInputElement).required).length,
          labels: fields.map((el) => {
            const id = el.id
            const label = id ? document.querySelector(`label[for="${id}"]`)?.textContent?.trim() : null
            return label ?? (el as HTMLInputElement).placeholder ?? (el as HTMLInputElement).name ?? 'unlabelled'
          }),
        }
      })

      if (!formData) {
        emit({ step: 6, action: 'extract', result: 'No form found on page.' })
        return
      }

      const frictionNote = formData.fieldCount > 5 ? ' (high friction — consider reducing fields)' : ''
      emit({
        step: 6,
        action: 'extract',
        result: `Form found: ${formData.fieldCount} fields (${formData.requiredCount} required)${frictionNote}. Fields: ${formData.labels.slice(0, 8).join(', ')}`,
      })
    }, undefined)

    // Step 7: synthesise
    await withStepTimeout('synthesise', async () => {
      if (!process.env.AZURE_OPENAI_KEY || screenshots.length === 0) {
        summary = observations.map((o) => `[${o.action}] ${o.result}`).join(' ')
        emit({ step: 7, action: 'extract', result: summary })
        return
      }

      const observationText = observations.map((o) => `Step ${o.step} (${o.action}): ${o.result}`).join('\n')
      const techText = techStack.length > 0 ? `\nDetected tech: ${techStack.map((t) => t.name).join(', ')}` : ''

      try {
        summary = await analyzeWithVision(
          screenshots[0],
          `You are a senior CRO analyst. Based on this above-fold screenshot and these agent observations, provide a 3-4 sentence synthesis of the site's conversion strengths and weaknesses:\n\n${observationText}${techText}`,
        )
      } catch {
        summary = observations.map((o) => o.result).join(' ')
      }

      emit({ step: 7, action: 'extract', result: summary })
    }, undefined)
  }

  try {
    await Promise.race([
      agentLoop(),
      sleep(TOTAL_TIMEOUT_MS).then(() => {
        throw new Error(`Agent session exceeded ${TOTAL_TIMEOUT_MS}ms total timeout`)
      }),
    ])
  } catch (error) {
    console.warn('[agent] session ended:', error instanceof Error ? error.message : String(error))
    if (observations.length === 0 || observations[observations.length - 1].action !== 'extract') {
      observations.push({
        step: observations.length + 1,
        action: 'extract',
        result: `Session ended: ${error instanceof Error ? error.message : 'unknown error'}`,
      })
    }
  } finally {
    await browser?.close().catch(() => undefined)
  }

  return {
    sessionId,
    url,
    observations,
    screenshots,
    techStack,
    pageType,
    summary: summary || observations.map((o) => o.result).join(' '),
    durationMs: Date.now() - startMs,
  }
}
