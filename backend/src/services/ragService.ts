import { AzureOpenAI } from 'openai/azure'
import { SearchClient, AzureKeyCredential } from '@azure/search-documents'
import type { ComparableSite } from '../../../shared/analysis.ts'

function normalizeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export async function retrieveComparableSites(
  descriptor: string,
  topK = 3,
  excludeUrl?: string,
): Promise<ComparableSite[]> {
  const embeddingEndpoint   = process.env.AZURE_EMBEDDING_ENDPOINT
  const embeddingKey        = process.env.AZURE_EMBEDDING_KEY
  const searchEndpoint      = process.env.AZURE_SEARCH_ENDPOINT
  const searchKey           = process.env.AZURE_SEARCH_KEY
  const embeddingDeployment = process.env.AZURE_EMBEDDING_DEPLOYMENT ?? 'text-embedding-ada-002'

  if (!embeddingEndpoint || !embeddingKey || !searchEndpoint || !searchKey) return []

  try {
    const embeddingClient = new AzureOpenAI({
      endpoint: embeddingEndpoint,
      apiKey: embeddingKey,
      deployment: embeddingDeployment,
      apiVersion: '2025-01-01-preview',
      timeout: 10_000,
    })

    const { data } = await embeddingClient.embeddings.create({
      model: embeddingDeployment,
      input: descriptor,
    })
    const embedding = data[0]?.embedding ?? []
    if (!embedding.length) return []

    const searchClient = new SearchClient(
      searchEndpoint,
      'analyses',
      new AzureKeyCredential(searchKey),
    )

    // Fetch one extra when excluding the analyzed URL so we can still return topK after filtering.
    const fetchK = excludeUrl ? topK + 1 : topK
    const excludeHost = excludeUrl ? normalizeHost(excludeUrl) : null

    // Pure vector similarity on the business descriptor — no category pre-filter.
    // The descriptor embedding encodes business DNA (B2B/B2C, product, audience,
    // purchase complexity) so semantically similar businesses cluster naturally.
    const results = await searchClient.search('*', {
      vectorSearchOptions: {
        queries: [{
          kind: 'vector',
          vector: embedding,
          kNearestNeighborsCount: fetchK,
          fields: ['embedding'],
        }],
        filterMode: 'preFilter',
      },
      select: ['url', 'summary', 'businessType', 'productCategory', 'audience', 'industryVertical'],
      top: fetchK,
    })

    const sites: ComparableSite[] = []
    for await (const result of results.results) {
      if (sites.length >= topK) break
      const doc = result.document as {
        url?: string
        summary?: string
        businessType?: string
        productCategory?: string
        audience?: string
        industryVertical?: string
      }
      if (!doc.url || !doc.summary) continue
      if (excludeHost && normalizeHost(doc.url) === excludeHost) continue
      sites.push({
        url:              doc.url,
        summary:          doc.summary,
        businessType:     doc.businessType     ?? '',
        productCategory:  doc.productCategory  ?? '',
        audience:         doc.audience         ?? '',
        industryVertical: doc.industryVertical ?? '',
      })
    }
    return sites
  } catch (err) {
    console.warn('[rag] retrieveComparableSites failed:', err instanceof Error ? err.message : String(err))
    return []
  }
}
