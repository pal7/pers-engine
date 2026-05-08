import { AzureOpenAI } from 'openai/azure'
import { SearchClient, AzureKeyCredential } from '@azure/search-documents'

export interface SimilarAnalysis {
  url: string
  category: string
  summary: string
  issues: string[]
}

export async function retrieveSimilarAnalyses(
  queryText: string,
  pageType: string,
  topK = 3,
): Promise<SimilarAnalysis[]> {
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
      input: queryText,
    })
    const embedding = data[0]?.embedding ?? []
    if (!embedding.length) return []

    const searchClient = new SearchClient(
      searchEndpoint,
      'analyses',
      new AzureKeyCredential(searchKey),
    )

    const results = await searchClient.search('*', {
      vectorSearchOptions: {
        queries: [{
          kind: 'vector',
          vector: embedding,
          kNearestNeighborsCount: topK,
          fields: ['embedding'],
        }],
      },
      ...(pageType !== 'general' ? { filter: `pageType eq '${pageType}'` } : {}),
      select: ['url', 'category', 'summary', 'issues'],
      top: topK,
    })

    const analyses: SimilarAnalysis[] = []
    for await (const result of results.results) {
      const doc = result.document as {
        url?: string; category?: string; summary?: string; issues?: string
      }
      if (!doc.url || !doc.summary) continue
      let issueTitles: string[] = []
      try {
        if (doc.issues) {
          issueTitles = (JSON.parse(doc.issues) as Array<{ title?: string }>)
            .map((i) => i.title ?? '')
            .filter(Boolean)
        }
      } catch { /* skip malformed */ }
      analyses.push({
        url: doc.url,
        category: doc.category ?? pageType,
        summary: doc.summary,
        issues: issueTitles,
      })
    }
    return analyses
  } catch {
    return []
  }
}
