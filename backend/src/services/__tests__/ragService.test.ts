import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockEmbeddingsCreate, mockSearch } = vi.hoisted(() => ({
  mockEmbeddingsCreate: vi.fn(),
  mockSearch: vi.fn(),
}))

vi.mock('openai/azure', () => ({
  AzureOpenAI: vi.fn(function () {
    return { embeddings: { create: mockEmbeddingsCreate } }
  }),
}))

vi.mock('@azure/search-documents', () => ({
  SearchClient: vi.fn(function () {
    return { search: mockSearch }
  }),
  AzureKeyCredential: vi.fn(function (key: string) {
    return { key }
  }),
}))

import { retrieveComparableSites } from '../ragService'

const ENV_VARS = {
  AZURE_EMBEDDING_ENDPOINT: 'https://embeddings.example.com',
  AZURE_EMBEDDING_KEY: 'embed-key-123',
  AZURE_SEARCH_ENDPOINT: 'https://search.example.com',
  AZURE_SEARCH_KEY: 'search-key-456',
  AZURE_EMBEDDING_DEPLOYMENT: 'text-embedding-ada-002',
}

function setEnv(overrides: Partial<typeof ENV_VARS> = {}) {
  for (const [k, v] of Object.entries({ ...ENV_VARS, ...overrides })) {
    process.env[k] = v
  }
}

function clearEnv() {
  for (const key of Object.keys(ENV_VARS)) {
    delete process.env[key]
  }
}

function makeSearchResults(docs: object[]) {
  const results = docs.map((document) => ({ document, score: 0.9 }))
  return {
    results: (async function* () {
      for (const r of results) yield r
    })(),
  }
}

const DESCRIPTOR = 'B2B | Scientific instruments | Enterprise labs | Product catalogue + RFQ | high purchase complexity | Life sciences'

describe('retrieveComparableSites', () => {
  beforeEach(() => {
    mockEmbeddingsCreate.mockReset()
    mockSearch.mockReset()
  })

  afterEach(() => {
    clearEnv()
  })

  describe('env var guards', () => {
    it('returns [] when all env vars are missing', async () => {
      const result = await retrieveComparableSites(DESCRIPTOR)
      expect(result).toEqual([])
      expect(mockEmbeddingsCreate).not.toHaveBeenCalled()
    })

    it('returns [] when embedding endpoint is missing', async () => {
      setEnv()
      delete process.env.AZURE_EMBEDDING_ENDPOINT
      const result = await retrieveComparableSites(DESCRIPTOR)
      expect(result).toEqual([])
    })

    it('returns [] when search key is missing', async () => {
      setEnv()
      delete process.env.AZURE_SEARCH_KEY
      const result = await retrieveComparableSites(DESCRIPTOR)
      expect(result).toEqual([])
    })
  })

  describe('embedding failures', () => {
    it('returns [] when embedding API throws', async () => {
      setEnv()
      mockEmbeddingsCreate.mockRejectedValue(new Error('network timeout'))
      const result = await retrieveComparableSites(DESCRIPTOR)
      expect(result).toEqual([])
    })

    it('returns [] when embedding vector is empty', async () => {
      setEnv()
      mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: [] }] })
      const result = await retrieveComparableSites(DESCRIPTOR)
      expect(result).toEqual([])
      expect(mockSearch).not.toHaveBeenCalled()
    })
  })

  describe('search failures', () => {
    beforeEach(() => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      })
    })

    it('returns [] when search API throws', async () => {
      setEnv()
      mockSearch.mockRejectedValue(new Error('search unavailable'))
      const result = await retrieveComparableSites(DESCRIPTOR)
      expect(result).toEqual([])
    })
  })

  describe('result parsing', () => {
    const validEmbedding = new Array(1536).fill(0.1)

    beforeEach(() => {
      mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: validEmbedding }] })
    })

    it('returns parsed ComparableSite objects from valid documents', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          {
            url: 'https://stripe.com',
            summary: 'Payments platform with frictionless onboarding.',
            businessType: 'B2B',
            productCategory: 'Payment infrastructure',
            audience: 'Developers and startups',
            industryVertical: 'Fintech',
          },
        ]),
      )

      const result = await retrieveComparableSites(DESCRIPTOR)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        url: 'https://stripe.com',
        summary: 'Payments platform with frictionless onboarding.',
        businessType: 'B2B',
        productCategory: 'Payment infrastructure',
        audience: 'Developers and startups',
        industryVertical: 'Fintech',
      })
    })

    it('returns multiple results', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          {
            url: 'https://site-a.com',
            summary: 'SaaS with trial friction.',
            businessType: 'B2B',
            productCategory: 'Project management',
            audience: 'SMB teams',
            industryVertical: 'Productivity',
          },
          {
            url: 'https://site-b.com',
            summary: 'SaaS with pricing clarity issues.',
            businessType: 'B2B',
            productCategory: 'CRM software',
            audience: 'Sales teams',
            industryVertical: 'Sales tech',
          },
        ]),
      )

      const result = await retrieveComparableSites(DESCRIPTOR)
      expect(result).toHaveLength(2)
      expect(result[0].url).toBe('https://site-a.com')
      expect(result[1].url).toBe('https://site-b.com')
    })

    it('filters out documents missing url', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          { summary: 'No URL here.', businessType: 'B2B', productCategory: 'x', audience: 'y', industryVertical: 'z' },
          { url: 'https://valid.com', summary: 'Has URL.', businessType: 'B2B', productCategory: 'x', audience: 'y', industryVertical: 'z' },
        ]),
      )

      const result = await retrieveComparableSites(DESCRIPTOR)
      expect(result).toHaveLength(1)
      expect(result[0].url).toBe('https://valid.com')
    })

    it('filters out documents missing summary', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          { url: 'https://no-summary.com', businessType: 'B2B', productCategory: 'x', audience: 'y', industryVertical: 'z' },
        ]),
      )

      const result = await retrieveComparableSites(DESCRIPTOR)
      expect(result).toEqual([])
    })

    it('falls back to empty string for missing taxonomy fields', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([{ url: 'https://site.com', summary: 'Good summary.' }]),
      )

      const result = await retrieveComparableSites(DESCRIPTOR)
      expect(result).toHaveLength(1)
      expect(result[0].businessType).toBe('')
      expect(result[0].productCategory).toBe('')
    })

    it('passes the descriptor through to the embedding API', async () => {
      setEnv()
      mockSearch.mockResolvedValue(makeSearchResults([]))

      await retrieveComparableSites('B2B | Payments | Developers')

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ input: 'B2B | Payments | Developers' }),
      )
    })

    it('uses default topK of 3', async () => {
      setEnv()
      mockSearch.mockResolvedValue(makeSearchResults([]))

      await retrieveComparableSites(DESCRIPTOR)

      expect(mockSearch).toHaveBeenCalledWith(
        '*',
        expect.objectContaining({ top: 3 }),
      )
    })

    it('respects explicit topK', async () => {
      setEnv()
      mockSearch.mockResolvedValue(makeSearchResults([]))

      await retrieveComparableSites(DESCRIPTOR, 5)

      expect(mockSearch).toHaveBeenCalledWith(
        '*',
        expect.objectContaining({ top: 5 }),
      )
    })

    it('uses preFilter filterMode', async () => {
      setEnv()
      mockSearch.mockResolvedValue(makeSearchResults([]))

      await retrieveComparableSites(DESCRIPTOR)

      expect(mockSearch).toHaveBeenCalledWith(
        '*',
        expect.objectContaining({
          vectorSearchOptions: expect.objectContaining({ filterMode: 'preFilter' }),
        }),
      )
    })

    it('fetches topK+1 when excludeUrl is provided', async () => {
      setEnv()
      mockSearch.mockResolvedValue(makeSearchResults([]))

      await retrieveComparableSites(DESCRIPTOR, 3, 'https://www.waters.com')

      expect(mockSearch).toHaveBeenCalledWith('*', expect.objectContaining({ top: 4 }))
    })

    it('filters out the excluded URL by hostname (exact match)', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          { url: 'https://www.waters.com', summary: 'Self.', businessType: 'B2B', productCategory: 'x', audience: 'y', industryVertical: 'z' },
          { url: 'https://www.bruker.com', summary: 'Other.', businessType: 'B2B', productCategory: 'x', audience: 'y', industryVertical: 'z' },
        ]),
      )

      const result = await retrieveComparableSites(DESCRIPTOR, 3, 'https://www.waters.com')

      expect(result).toHaveLength(1)
      expect(result[0].url).toBe('https://www.bruker.com')
    })

    it('filters by hostname regardless of www prefix', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          { url: 'https://waters.com', summary: 'Self no-www.', businessType: 'B2B', productCategory: 'x', audience: 'y', industryVertical: 'z' },
          { url: 'https://www.bruker.com', summary: 'Other.', businessType: 'B2B', productCategory: 'x', audience: 'y', industryVertical: 'z' },
        ]),
      )

      const result = await retrieveComparableSites(DESCRIPTOR, 3, 'https://www.waters.com')

      expect(result).toHaveLength(1)
      expect(result[0].url).toBe('https://www.bruker.com')
    })

    it('does not exclude when excludeUrl is undefined', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          { url: 'https://www.waters.com', summary: 'Self.', businessType: 'B2B', productCategory: 'x', audience: 'y', industryVertical: 'z' },
        ]),
      )

      const result = await retrieveComparableSites(DESCRIPTOR, 3)

      expect(result).toHaveLength(1)
      expect(result[0].url).toBe('https://www.waters.com')
    })
  })
})
