import { AnalysisServiceError } from './analysisError'
import type { FetchedPage } from './fetchPage'

export interface ExtractedPageSignals {
  resolvedUrl: string
  pageTitle: string
  metaDescription: string
  firstH1Text: string
  heroText?: string
  hasForm: boolean
  formCount: number
  buttonCount: number
  anchorCount: number
  candidateCtaTexts: string[]
  pageText: string
  primaryCtaHeuristic: boolean
  trustSignalKeywords: string[]
}

const actionKeywords = [
  'add to cart',
  'book',
  'buy',
  'contact',
  'continue',
  'demo',
  'download',
  'get started',
  'join',
  'learn more',
  'request',
  'reserve',
  'shop',
  'sign up',
  'start',
  'subscribe',
  'try',
]
const trustKeywords = [
  'customer stories',
  'customers',
  'guarantee',
  'money back',
  'rated',
  'rating',
  'reviews',
  'secure',
  'testimonial',
  'testimonials',
  'trusted by',
  'verified',
]
const bodyPattern = /<body[^>]*>([\s\S]*?)<\/body>/i
const titlePattern = /<title[^>]*>([\s\S]*?)<\/title>/i
const h1Pattern = /<h1[^>]*>([\s\S]*?)<\/h1>/i
const buttonPattern = /<button\b[^>]*>([\s\S]*?)<\/button>/gi
const anchorPattern = /<a\b[^>]*>([\s\S]*?)<\/a>/gi

const htmlEntityMap: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
}

const decodeHtmlEntities = (value: string) =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const normalizedEntity = entity.toLowerCase()

    if (normalizedEntity.startsWith('#x')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(2), 16)
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint)
    }

    if (normalizedEntity.startsWith('#')) {
      const codePoint = Number.parseInt(normalizedEntity.slice(1), 10)
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint)
    }

    return htmlEntityMap[normalizedEntity] ?? match
  })

const stripHtml = (value: string) =>
  value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')

const normalizeText = (value: string) =>
  decodeHtmlEntities(stripHtml(value)).replace(/\s+/g, ' ').trim()

const extractAttributeValue = (tagSource: string, attributeName: string) => {
  const attributePattern = new RegExp(
    `${attributeName}\\s*=\\s*(["'])([\\s\\S]*?)\\1`,
    'i',
  )

  return tagSource.match(attributePattern)?.[2]?.trim() ?? ''
}

const extractMetaDescription = (html: string) => {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? []

  for (const tag of metaTags) {
    const name = extractAttributeValue(tag, 'name').toLowerCase()
    const property = extractAttributeValue(tag, 'property').toLowerCase()

    if (name === 'description' || property === 'og:description') {
      return normalizeText(extractAttributeValue(tag, 'content'))
    }
  }

  return ''
}

const extractTagTexts = (html: string, pattern: RegExp) => {
  const texts: string[] = []
  const safePattern = new RegExp(pattern.source, pattern.flags)

  for (const match of html.matchAll(safePattern)) {
    const normalizedText = normalizeText(match[1] ?? '')

    if (normalizedText) {
      texts.push(normalizedText)
    }
  }

  return texts
}

const uniqueTexts = (values: string[]) => {
  const seen = new Set<string>()

  return values.filter((value) => {
    const normalizedValue = value.toLowerCase()

    if (seen.has(normalizedValue)) {
      return false
    }

    seen.add(normalizedValue)
    return true
  })
}

const looksLikeCta = (text: string) => {
  const normalizedText = text.toLowerCase()

  if (normalizedText.length < 2 || normalizedText.length > 80) {
    return false
  }

  return actionKeywords.some((keyword) => normalizedText.includes(keyword))
}

const findTrustSignalKeywords = (pageText: string) => {
  const normalizedPageText = pageText.toLowerCase()

  return trustKeywords.filter((keyword) => normalizedPageText.includes(keyword))
}

export function extractPageSignals(page: FetchedPage): ExtractedPageSignals {
  const bodyHtml = page.html.match(bodyPattern)?.[1] ?? page.html
  const pageTitle = normalizeText(page.html.match(titlePattern)?.[1] ?? '')
  const metaDescription = extractMetaDescription(page.html)
  const firstH1Text = normalizeText(page.html.match(h1Pattern)?.[1] ?? '')
  const pageText = normalizeText(bodyHtml)
  const buttonTexts = extractTagTexts(page.html, buttonPattern)
  const anchorTexts = extractTagTexts(page.html, anchorPattern)
  const candidateCtaTexts = uniqueTexts([...buttonTexts, ...anchorTexts])
    .filter(looksLikeCta)
    .slice(0, 5)
  const aboveFoldHtml = bodyHtml.slice(0, 6000).toLowerCase()
  const primaryCtaHeuristic = candidateCtaTexts.some((text) =>
    aboveFoldHtml.includes(text.toLowerCase()),
  )
  const formCount = (page.html.match(/<form\b/gi) ?? []).length
  const buttonCount = (page.html.match(/<button\b/gi) ?? []).length
  const anchorCount = (page.html.match(/<a\b/gi) ?? []).length

  if (!pageTitle && !metaDescription && !firstH1Text && pageText.length < 40) {
    throw new AnalysisServiceError(
      422,
      'We fetched the page but could not extract enough readable HTML content to analyze it.',
    )
  }

  return {
    resolvedUrl: page.resolvedUrl,
    pageTitle,
    metaDescription,
    firstH1Text,
    hasForm: formCount > 0,
    formCount,
    buttonCount,
    anchorCount,
    candidateCtaTexts,
    pageText,
    primaryCtaHeuristic,
    trustSignalKeywords: findTrustSignalKeywords(pageText),
  }
}
