export function normalizeWebsiteUrl(value: string): string {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return ''
  }

  const normalizedValue = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`

  try {
    const url = new URL(normalizedValue)

    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) {
      return ''
    }

    return url.toString()
  } catch {
    return ''
  }
}

export function isValidWebsiteUrl(value: string): boolean {
  return normalizeWebsiteUrl(value) !== ''
}
