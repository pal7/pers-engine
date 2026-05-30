import type { PageSignals } from './extractionTypes.ts'

const CTA_VERBS = [
  'start',
  'book',
  'buy',
  'shop',
  'try',
  'demo',
  'contact',
  'request',
  'schedule',
  'join',
  'sign up',
  'get started',
  'learn more',
  'see pricing',
  'add to cart',
  'subscribe',
  'download',
]

const SKIP_TEXT_PATTERNS = [
  /^skip to /i,
  /^menu$/i,
  /^open menu$/i,
  /^close$/i,
  /^close menu$/i,
  /^cookie/i,
  /^accept$/i,
  /^reject$/i,
  /^preferences$/i,
]

const htmlEntityMap: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g,
    (entity) => htmlEntityMap[entity] ?? entity,
  )
}

export function stripHtmlTags(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' '))
}

export function cleanText(value: string): string {
  return normalizeWhitespace(stripHtmlTags(value))
}

export function isMeaningfulText(value: string): boolean {
  if (value.length < 4) {
    return false
  }

  return !SKIP_TEXT_PATTERNS.some((pattern) => pattern.test(value))
}

export function dedupeTexts(values: string[], maxItems = 8): string[] {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const value of values) {
    const cleaned = normalizeWhitespace(value)

    if (!cleaned) {
      continue
    }

    const key = cleaned.toLowerCase()
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(cleaned)

    if (deduped.length >= maxItems) {
      break
    }
  }

  return deduped
}

export function isActionLikeText(value: string): boolean {
  const normalized = normalizeWhitespace(value).toLowerCase()

  if (!normalized || normalized.length > 80) {
    return false
  }

  return CTA_VERBS.some((verb) => normalized.includes(verb))
}

export function buildEmptySignals(url: string): PageSignals {
  return {
    finalUrl: url,
    title: '',
    h1: '',
    heroText: '',
    hasForm: false,
    buttonCount: 0,
    ctaTexts: [],
    textSample: '',
    contentLength: 0,
    primaryCtaAboveFold: false,
  }
}

export function buildHeroText(options: {
  h1?: string
  title?: string
  prioritizedBlocks?: string[]
  bodyText?: string
}): string {
  const candidates = [
    options.h1 ?? '',
    ...(options.prioritizedBlocks ?? []),
    options.title ?? '',
    options.bodyText ?? '',
  ]

  for (const candidate of candidates) {
    const cleaned = normalizeWhitespace(candidate)
    if (isMeaningfulText(cleaned) && cleaned.length >= 12) {
      return cleaned.slice(0, 280)
    }
  }

  return ''
}

export function getMeaningfulTextLines(value: string, maxItems = 8): string[] {
  return value
    .split('\n')
    .map((line) => normalizeWhitespace(line))
    .filter((line) => isMeaningfulText(line) && line.length >= 12 && line.length <= 280)
    .slice(0, maxItems)
}
