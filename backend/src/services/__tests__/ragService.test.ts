import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Hoist mock functions so they are available inside vi.mock factories
const { mockEmbeddingsCreate, mockSearch } = vi.hoisted(() => ({
  mockEmbeddingsCreate: vi.fn(),
  mockSearch: vi.fn(),
}))

vi.mock('openai/azure', () => ({
  // Must use regular function (not arrow) — new + arrow function ignores the return value
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

import { retrieveSimilarAnalyses } from '../ragService'

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

// Builds an async iterable of search results (matches the SDK's PagedAsyncIterableIterator)
function makeSearchResults(docs: object[]) {
  const results = docs.map((document) => ({ document, score: 0.9 }))
  return {
    results: (async function* () {
      for (const r of results) yield r
    })(),
  }
}

describe('retrieveSimilarAnalyses', () => {
  beforeEach(() => {
    mockEmbeddingsCreate.mockReset()
    mockSearch.mockReset()
  })

  afterEach(() => {
    clearEnv()
  })

  describe('env var guards', () => {
    it('returns [] when all env vars are missing', async () => {
      const result = await retrieveSimilarAnalyses('hero text', 'saas')
      expect(result).toEqual([])
      expect(mockEmbeddingsCreate).not.toHaveBeenCalled()
    })

    it('returns [] when embedding endpoint is missing', async () => {
      setEnv({ AZURE_EMBEDDING_ENDPOINT: undefined as unknown as string })
      delete process.env.AZURE_EMBEDDING_ENDPOINT
      const result = await retrieveSimilarAnalyses('hero text', 'saas')
      expect(result).toEqual([])
    })

    it('returns [] when search key is missing', async () => {
      setEnv()
      delete process.env.AZURE_SEARCH_KEY
      const result = await retrieveSimilarAnalyses('hero text', 'saas')
      expect(result).toEqual([])
    })
  })

  describe('embedding failures', () => {
    it('returns [] when embedding API throws', async () => {
      setEnv()
      mockEmbeddingsCreate.mockRejectedValue(new Error('network timeout'))
      const result = await retrieveSimilarAnalyses('hero text', 'saas')
      expect(result).toEqual([])
    })

    it('returns [] when embedding response has no data', async () => {
      setEnv()
      mockEmbeddingsCreate.mockResolvedValue({ data: [] })
      const result = await retrieveSimilarAnalyses('hero text', 'saas')
      expect(result).toEqual([])
      expect(mockSearch).not.toHaveBeenCalled()
    })

    it('returns [] when embedding vector is empty', async () => {
      setEnv()
      mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: [] }] })
      const result = await retrieveSimilarAnalyses('hero text', 'saas')
      expect(result).toEqual([])
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
      const result = await retrieveSimilarAnalyses('hero text', 'saas')
      expect(result).toEqual([])
    })
  })

  describe('pageType filter', () => {
    beforeEach(() => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      })
      mockSearch.mockResolvedValue(makeSearchResults([]))
    })

    it('applies pageType filter for non-general types', async () => {
      setEnv()
      await retrieveSimilarAnalyses('hero text', 'ecommerce')
      expect(mockSearch).toHaveBeenCalledWith(
        '*',
        expect.objectContaining({ filter: "pageType eq 'ecommerce'" }),
      )
    })

    it('applies filter for saas pageType', async () => {
      setEnv()
      await retrieveSimilarAnalyses('hero text', 'saas')
      expect(mockSearch).toHaveBeenCalledWith(
        '*',
        expect.objectContaining({ filter: "pageType eq 'saas'" }),
      )
    })

    it('omits filter for general pageType', async () => {
      setEnv()
      await retrieveSimilarAnalyses('hero text', 'general')
      const callArgs = mockSearch.mock.calls[0][1] as Record<string, unknown>
      expect(callArgs).not.toHaveProperty('filter')
    })

    it('requests the correct topK', async () => {
      setEnv()
      await retrieveSimilarAnalyses('hero text', 'travel', 5)
      expect(mockSearch).toHaveBeenCalledWith(
        '*',
        expect.objectContaining({ top: 5 }),
      )
    })
  })

  describe('result parsing', () => {
    const validEmbedding = new Array(1536).fill(0.1)

    beforeEach(() => {
      mockEmbeddingsCreate.mockResolvedValue({ data: [{ embedding: validEmbedding }] })
    })

    it('returns parsed SimilarAnalysis objects from valid documents', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          {
            url: 'https://shopify.com',
            category: 'ecommerce',
            summary: 'E-commerce checkout with cart abandonment issues.',
            issues: JSON.stringify([
              { title: 'Weak CTA above fold' },
              { title: 'No trust badge at checkout' },
            ]),
          },
        ]),
      )

      const result = await retrieveSimilarAnalyses('shop now', 'ecommerce')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        url: 'https://shopify.com',
        category: 'ecommerce',
        summary: 'E-commerce checkout with cart abandonment issues.',
        issues: ['Weak CTA above fold', 'No trust badge at checkout'],
      })
    })

    it('returns multiple results', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          {
            url: 'https://site-a.com',
            category: 'saas',
            summary: 'SaaS with trial friction.',
            issues: JSON.stringify([{ title: 'No free trial CTA' }]),
          },
          {
            url: 'https://site-b.com',
            category: 'saas',
            summary: 'SaaS with pricing clarity issues.',
            issues: JSON.stringify([{ title: 'Pricing hidden below fold' }]),
          },
        ]),
      )

      const result = await retrieveSimilarAnalyses('start free trial', 'saas')
      expect(result).toHaveLength(2)
      expect(result[0].url).toBe('https://site-a.com')
      expect(result[1].url).toBe('https://site-b.com')
    })

    it('filters out documents missing url', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          { category: 'saas', summary: 'No URL here.', issues: '[]' },
          { url: 'https://valid.com', category: 'saas', summary: 'Has URL.', issues: '[]' },
        ]),
      )

      const result = await retrieveSimilarAnalyses('text', 'saas')
      expect(result).toHaveLength(1)
      expect(result[0].url).toBe('https://valid.com')
    })

    it('filters out documents missing summary', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          { url: 'https://no-summary.com', category: 'saas', issues: '[]' },
        ]),
      )

      const result = await retrieveSimilarAnalyses('text', 'saas')
      expect(result).toEqual([])
    })

    it('handles malformed issues JSON gracefully — issues becomes []', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          {
            url: 'https://site.com',
            category: 'ecommerce',
            summary: 'Good summary.',
            issues: 'NOT VALID JSON',
          },
        ]),
      )

      const result = await retrieveSimilarAnalyses('text', 'ecommerce')
      expect(result).toHaveLength(1)
      expect(result[0].issues).toEqual([])
    })

    it('filters out issue entries without a title', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          {
            url: 'https://site.com',
            category: 'ecommerce',
            summary: 'Summary.',
            issues: JSON.stringify([
              { title: 'Valid issue' },
              { noTitle: true },
              { title: '' },
            ]),
          },
        ]),
      )

      const result = await retrieveSimilarAnalyses('text', 'ecommerce')
      expect(result[0].issues).toEqual(['Valid issue'])
    })

    it('uses pageType as category fallback when category is missing', async () => {
      setEnv()
      mockSearch.mockResolvedValue(
        makeSearchResults([
          {
            url: 'https://site.com',
            summary: 'No category field.',
            issues: '[]',
          },
        ]),
      )

      const result = await retrieveSimilarAnalyses('text', 'finance')
      expect(result[0].category).toBe('finance')
    })

    it('passes query text through to the embedding API', async () => {
      setEnv()
      mockSearch.mockResolvedValue(makeSearchResults([]))

      await retrieveSimilarAnalyses('free shipping on all orders', 'ecommerce')

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ input: 'free shipping on all orders' }),
      )
    })

    it('uses default topK of 3 when not specified', async () => {
      setEnv()
      mockSearch.mockResolvedValue(makeSearchResults([]))

      await retrieveSimilarAnalyses('text', 'saas')

      expect(mockSearch).toHaveBeenCalledWith(
        '*',
        expect.objectContaining({ top: 3 }),
      )
    })
  })
})
