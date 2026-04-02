import { isIP } from 'node:net'
import { AnalysisServiceError } from './analysisError'

export interface FetchedPage {
  requestedUrl: string
  resolvedUrl: string
  html: string
  contentType: string | null
}

const privateHostnameSuffixes = ['.local', '.internal', '.home', '.lan']
const browserLikeHeaders = {
  Accept: 'text/html,application/xhtml+xml',
  'User-Agent': 'Website-Personalization-Analyzer/1.0',
}

const isPrivateIpv4Address = (hostname: string) => {
  if (hostname.startsWith('10.') || hostname.startsWith('127.')) {
    return true
  }

  if (hostname.startsWith('192.168.')) {
    return true
  }

  const octets = hostname.split('.').map((segment) => Number(segment))

  return octets.length === 4 && octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31
}

const isPrivateIpv6Address = (hostname: string) => {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, '').toLowerCase()

  return (
    normalizedHostname === '::1' ||
    normalizedHostname.startsWith('fc') ||
    normalizedHostname.startsWith('fd') ||
    normalizedHostname.startsWith('fe80')
  )
}

const ensurePublicUrl = (inputUrl: string) => {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(inputUrl)
  } catch {
    throw new AnalysisServiceError(400, 'Please provide a valid public website URL.')
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new AnalysisServiceError(400, 'Only public http and https URLs are supported.')
  }

  const hostname = parsedUrl.hostname.toLowerCase()

  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    privateHostnameSuffixes.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new AnalysisServiceError(400, 'Only public website URLs are supported.')
  }

  const ipVersion = isIP(hostname)

  if (
    (ipVersion === 4 && isPrivateIpv4Address(hostname)) ||
    (ipVersion === 6 && isPrivateIpv6Address(hostname))
  ) {
    throw new AnalysisServiceError(400, 'Private network URLs are not supported.')
  }

  return parsedUrl
}

export async function fetchPage(inputUrl: string): Promise<FetchedPage> {
  const requestedUrl = ensurePublicUrl(inputUrl).toString()

  let response: Response

  try {
    response = await fetch(requestedUrl, {
      headers: browserLikeHeaders,
      redirect: 'follow',
    })
  } catch {
    throw new AnalysisServiceError(
      502,
      'We could not reach that website from the analyzer backend.',
    )
  }

  if (!response.ok) {
    throw new AnalysisServiceError(
      502,
      `The website responded with ${response.status} ${response.statusText || 'an error'}.`,
    )
  }

  const resolvedUrl = ensurePublicUrl(response.url || requestedUrl).toString()
  const contentType = response.headers.get('content-type')

  if (contentType && !contentType.toLowerCase().includes('text/html')) {
    throw new AnalysisServiceError(
      422,
      'That URL did not return an HTML page the analyzer can inspect.',
    )
  }

  const html = await response.text()

  if (!html.trim()) {
    throw new AnalysisServiceError(
      422,
      'The analyzer received an empty HTML response from that website.',
    )
  }

  return {
    requestedUrl,
    resolvedUrl,
    html,
    contentType,
  }
}
