import { launchStealth } from './stealthBrowser.js'
import {
  buildEmptySignals,
  buildHeroText,
  dedupeTexts,
  getMeaningfulTextLines,
  isActionLikeText,
  isMeaningfulText,
  normalizeWhitespace,
} from './extractionUtils'
import { evaluateExtractionQuality } from './evaluateExtractionQuality'
import type { ExtractionResult, PageSignals } from './extractionTypes'

const NAVIGATION_TIMEOUT_MS = 12000
const POST_LOAD_DELAY_MS = 1800
const MIN_MEANINGFUL_BODY_TEXT_LENGTH = 120

function getEvaluationWarning(error: unknown, label: string): string {
  if (!(error instanceof Error)) {
    return `${label} failed for an unknown reason.`
  }

  if (error.message.includes('__name is not defined')) {
    return `${label} failed because the page threw an evaluation error (__name is not defined).`
  }

  return `${label} failed: ${error.message}`
}

function finalizeSignals(signals: PageSignals): PageSignals {
  return {
    ...signals,
    title: normalizeWhitespace(signals.title),
    h1: normalizeWhitespace(signals.h1),
    heroText: normalizeWhitespace(signals.heroText),
    ctaTexts: dedupeTexts(signals.ctaTexts.filter(isActionLikeText)),
    textSample: normalizeWhitespace(signals.textSample).slice(0, 1200),
  }
}

export async function extractRenderedSignals(url: string): Promise<ExtractionResult> {
  const baseWarnings: string[] = []
  let browser: Awaited<ReturnType<typeof launchStealth>> | undefined

  try {
    browser = await launchStealth({
      headless: process.env.HEADLESS !== 'false',
      executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
    })
    const context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    const page = await context.newPage()

    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS)
    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS)

    let response: Awaited<ReturnType<typeof page.goto>> | null = null

    try {
      response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: NAVIGATION_TIMEOUT_MS,
      })
    } catch (error) {
      baseWarnings.push(
        error instanceof Error && error.message.toLowerCase().includes('timeout')
          ? `Browser navigation timed out after ${NAVIGATION_TIMEOUT_MS}ms; attempting partial extraction from the loaded DOM.`
          : getEvaluationWarning(error, 'Browser navigation'),
      )
    }

    if (response && !response.ok()) {
      baseWarnings.push(`Browser navigation returned status ${response.status()}.`)
    }

    await page.waitForTimeout(POST_LOAD_DELAY_MS)

    await page
      .waitForFunction(
        (minimumLength) => {
          const bodyText = document.body?.innerText ?? ''
          return bodyText.replace(/\s+/g, ' ').trim().length >= minimumLength
        },
        MIN_MEANINGFUL_BODY_TEXT_LENGTH,
        { timeout: 4000 },
      )
      .catch(() => {
        baseWarnings.push(
          'Rendered DOM never reached a strongly meaningful amount of visible body text before extraction.',
        )
      })

    const signals = buildEmptySignals(url)
    signals.finalUrl = page.url() || url

    try {
      signals.title = normalizeWhitespace(await page.title())
    } catch (error) {
      baseWarnings.push(getEvaluationWarning(error, 'Page title extraction'))
    }

    let bodyText = ''
    try {
      bodyText = await page.locator('body').innerText()
    } catch (error) {
      baseWarnings.push(getEvaluationWarning(error, 'Visible body text extraction'))
    }

    const normalizedBodyText = normalizeWhitespace(bodyText)
    signals.textSample = normalizedBodyText.slice(0, 1200)
    signals.contentLength = normalizedBodyText.length

    try {
      const h1Texts = await page.locator('main h1, [role="main"] h1, h1').allInnerTexts()
      signals.h1 = h1Texts.map((text) => normalizeWhitespace(text)).find(isMeaningfulText) ?? ''
    } catch (error) {
      baseWarnings.push(getEvaluationWarning(error, 'H1 extraction'))
    }

    const visibleTextBlocks = getMeaningfulTextLines(bodyText, 10)
    signals.heroText = buildHeroText({
      h1: signals.h1,
      title: signals.title,
      prioritizedBlocks: visibleTextBlocks,
      bodyText: normalizedBodyText,
    })

    try {
      // Passed as a string so esbuild does not transform it — avoids the
      // "__name is not defined" error that occurs when esbuild injects its
      // module-level helper into a function that Playwright serialises and
      // re-evaluates in the browser context.
      const partialSignals = await page.evaluate<{
        hasForm: boolean
        buttonCount: number
        ctaTexts: string[]
        primaryCtaAboveFold: boolean
      }>(`(function () {
        var CTA_SELECTOR = [
          'button',
          'a[href]',
          '[role="button"]',
          'input[type="submit"]',
          'input[type="button"]',
          '[class*="btn"]',
          '[class*="cta"]',
          '[class*="button"]',
          '[ng-click]',
          '[onclick]'
        ].join(', ');

        function normalize(v) { return v.replace(/\\s+/g, ' ').trim(); }

        function isVisible(el) {
          if (!el) return false;
          var s = window.getComputedStyle(el);
          var r = el.getBoundingClientRect();
          return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && r.width > 0 && r.height > 0;
        }

        function getText(el) {
          return normalize(el instanceof HTMLInputElement ? (el.value || '') : (el.textContent || ''));
        }

        function isAboveFold(el) {
          var r = el.getBoundingClientRect();
          return r.top < window.innerHeight && r.width > 0 && r.height > 0;
        }

        var ctaElements = Array.from(document.querySelectorAll(CTA_SELECTOR)).filter(isVisible);

        return {
          hasForm: Array.from(document.forms).some(isVisible),
          buttonCount: ctaElements.length,
          ctaTexts: ctaElements.map(getText),
          primaryCtaAboveFold: ctaElements.some(isAboveFold)
        };
      })()`)

      signals.hasForm = partialSignals.hasForm
      signals.buttonCount = partialSignals.buttonCount
      signals.ctaTexts = dedupeTexts(
        partialSignals.ctaTexts.filter((text) => isActionLikeText(text)),
      )
      signals.primaryCtaAboveFold = partialSignals.primaryCtaAboveFold
    } catch (error) {
      baseWarnings.push(getEvaluationWarning(error, 'CTA and form extraction'))
    }

    let rawHtml = ''
    try {
      rawHtml = await page.content()
    } catch {
      // rawHtml stays empty; tech stack detection will return []
    }

    return evaluateExtractionQuality({
      extractionMode: 'browser',
      signals: finalizeSignals(signals),
      baseWarnings,
      rawHtml,
    })
  } catch (error) {
    const signals = buildEmptySignals(url)

    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      if (message.includes('timeout')) {
        baseWarnings.push(
          `Browser extraction timed out after ${NAVIGATION_TIMEOUT_MS}ms.`,
        )
      } else if (
        message.includes('net::err') ||
        message.includes('navigation') ||
        message.includes('protocol error')
      ) {
        baseWarnings.push(`Browser navigation failed: ${error.message}`)
      } else {
        baseWarnings.push(`Browser extraction failed: ${error.message}`)
      }
    } else {
      baseWarnings.push('Browser extraction failed for an unknown reason.')
    }

    return evaluateExtractionQuality({
      extractionMode: 'browser',
      signals,
      baseWarnings,
    })
  } finally {
    await browser?.close().catch(() => undefined)
  }
}
