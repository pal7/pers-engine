import {
  buildEmptySignals,
  buildHeroText,
  cleanText,
  dedupeTexts,
  isActionLikeText,
  isMeaningfulText,
  normalizeWhitespace,
} from './extractionUtils.ts'
import { evaluateExtractionQuality } from './evaluateExtractionQuality.ts'
import type { ExtractionResult } from './extractionTypes.ts'

const FETCH_TIMEOUT_MS = 9000

function findTagContents(html: string, tagName: string): string[] {
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    'gi',
  )

  return Array.from(html.matchAll(pattern), (match) => cleanText(match[1] ?? ''))
}

function findTitle(html: string): string {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
  return match ? cleanText(match[1]) : ''
}

function findBodyText(html: string): string {
  const withoutNonContent = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')

  return cleanText(withoutNonContent)
}

function findHeroBlocks(html: string): string[] {
  const blocks = [
    ...findTagContents(html, 'h1'),
    ...findTagContents(html, 'h2'),
    ...findTagContents(html, 'p'),
  ]

  return blocks.filter((block) => isMeaningfulText(block)).slice(0, 6)
}

function findCtaTexts(html: string): string[] {
  const buttonTexts = findTagContents(html, 'button')
  const anchorTexts = findTagContents(html, 'a')
  const inputMatches = Array.from(
    html.matchAll(
      /<input\b[^>]*type=["'](?:submit|button)["'][^>]*value=["']([^"']+)["'][^>]*>/gi,
    ),
    (match) => normalizeWhitespace(match[1] ?? ''),
  )

  return dedupeTexts(
    [...buttonTexts, ...inputMatches, ...anchorTexts].filter(isActionLikeText),
  )
}

export async function extractHtmlSignals(url: string): Promise<ExtractionResult> {
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS)
  const baseWarnings: string[] = []

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; PersEngineAnalyzer/1.0; +https://example.com/bot)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: abortController.signal,
    })

    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok) {
      baseWarnings.push(`HTML request returned status ${response.status}.`)
    }

    if (!contentType.includes('text/html')) {
      baseWarnings.push(`Unsupported content type received: ${contentType || 'unknown'}.`)
    }

    const html = await response.text()
    const title = findTitle(html)
    const h1 = findTagContents(html, 'h1').find(isMeaningfulText) ?? ''
    const heroBlocks = findHeroBlocks(html)
    const bodyText = findBodyText(html)
    const ctaTexts = findCtaTexts(html)
    const signals = {
      finalUrl: response.url || url,
      title,
      h1,
      heroText: buildHeroText({
        h1,
        title,
        prioritizedBlocks: heroBlocks,
        bodyText,
      }),
      hasForm: /<form\b/i.test(html),
      buttonCount:
        (html.match(/<button\b/gi) ?? []).length +
        (html.match(/<input\b[^>]*type=["'](?:submit|button)["']/gi) ?? []).length,
      ctaTexts,
      textSample: bodyText.slice(0, 1200),
      contentLength: bodyText.length,
    }

    return evaluateExtractionQuality({
      extractionMode: 'html',
      signals,
      baseWarnings,
      rawHtml: html,
    })
  } catch (error) {
    const signals = buildEmptySignals(url)

    if (error instanceof Error && error.name === 'AbortError') {
      baseWarnings.push(`HTML extraction timed out after ${FETCH_TIMEOUT_MS}ms.`)
    } else if (error instanceof Error) {
      baseWarnings.push(`HTML extraction failed: ${error.message}`)
    } else {
      baseWarnings.push('HTML extraction failed for an unknown reason.')
    }

    return evaluateExtractionQuality({
      extractionMode: 'html',
      signals,
      baseWarnings,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
