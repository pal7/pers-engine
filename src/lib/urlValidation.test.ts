import { describe, expect, it } from 'vitest'
import { isValidWebsiteUrl, normalizeWebsiteUrl } from './urlValidation'

describe('urlValidation', () => {
  it('returns an empty string for an empty input', () => {
    expect(normalizeWebsiteUrl('')).toBe('')
    expect(isValidWebsiteUrl('')).toBe(false)
  })

  it('returns an empty string for whitespace-only input', () => {
    expect(normalizeWebsiteUrl('   ')).toBe('')
    expect(isValidWebsiteUrl('   ')).toBe(false)
  })

  it('"nike" is invalid', () => {
    expect(normalizeWebsiteUrl('nike')).toBe('')
    expect(isValidWebsiteUrl('nike')).toBe(false)
  })

  it('"nike.com" is valid', () => {
    expect(normalizeWebsiteUrl('nike.com')).toBe('https://nike.com/')
    expect(isValidWebsiteUrl('nike.com')).toBe(true)
  })

  it('"https://nike.com" is valid', () => {
    expect(normalizeWebsiteUrl('https://nike.com')).toBe('https://nike.com/')
    expect(isValidWebsiteUrl('https://nike.com')).toBe(true)
  })

  it('"ftp://nike.com" is invalid', () => {
    expect(normalizeWebsiteUrl('ftp://nike.com')).toBe('')
    expect(isValidWebsiteUrl('ftp://nike.com')).toBe(false)
  })

  it('"localhost" is invalid', () => {
    expect(normalizeWebsiteUrl('localhost')).toBe('')
    expect(isValidWebsiteUrl('localhost')).toBe(false)
  })

  it('trims whitespace before validating and normalizing', () => {
    expect(normalizeWebsiteUrl('  nike.com  ')).toBe('https://nike.com/')
    expect(isValidWebsiteUrl('  nike.com  ')).toBe(true)
  })
})
