import { SearchIndexClient, AzureKeyCredential } from '@azure/search-documents'

const endpoint = process.env.AZURE_SEARCH_ENDPOINT
const key = process.env.AZURE_SEARCH_KEY

if (!endpoint || !key) {
  console.error('AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_KEY must be set.')
  process.exit(1)
}

const client = new SearchIndexClient(endpoint, new AzureKeyCredential(key))

const INDEX_NAME = 'analyses'

async function createIndex() {
  console.log(`Creating index "${INDEX_NAME}"…`)

  await client.createOrUpdateIndex({
    name: INDEX_NAME,
    fields: [
      {
        name: 'id',
        type: 'Edm.String',
        key: true,
        searchable: false,
        filterable: false,
        sortable: false,
        facetable: false,
      },
      {
        name: 'url',
        type: 'Edm.String',
        key: false,
        searchable: true,
        filterable: true,
        sortable: false,
        facetable: false,
      },
      {
        name: 'category',
        type: 'Edm.String',
        key: false,
        searchable: false,
        filterable: true,
        sortable: false,
        facetable: true,
      },
      {
        name: 'summary',
        type: 'Edm.String',
        key: false,
        searchable: true,
        filterable: false,
        sortable: false,
        facetable: false,
      },
      {
        name: 'issues',
        type: 'Edm.String',
        key: false,
        searchable: true,
        filterable: false,
        sortable: false,
        facetable: false,
        analyzerName: 'en.microsoft',
      },
      {
        name: 'experiments',
        type: 'Edm.String',
        key: false,
        searchable: false,
        filterable: false,
        sortable: false,
        facetable: false,
      },
      {
        name: 'techStack',
        type: 'Edm.String',
        key: false,
        searchable: false,
        filterable: true,
        sortable: false,
        facetable: false,
      },
      {
        name: 'pageType',
        type: 'Edm.String',
        key: false,
        searchable: false,
        filterable: true,
        sortable: false,
        facetable: true,
      },
      {
        name: 'heroText',
        type: 'Edm.String',
        key: false,
        searchable: true,
        filterable: false,
        sortable: false,
        facetable: false,
      },
      {
        name: 'ctaTexts',
        type: 'Edm.String',
        key: false,
        searchable: true,
        filterable: false,
        sortable: false,
        facetable: false,
      },
      {
        name: 'embedding',
        type: 'Collection(Edm.Single)',
        searchable: true,
        filterable: false,
        sortable: false,
        facetable: false,
        vectorSearchDimensions: 1536,
        vectorSearchProfileName: 'vector-profile',
      },
      {
        name: 'scrapedAt',
        type: 'Edm.DateTimeOffset',
        key: false,
        searchable: false,
        filterable: true,
        sortable: true,
        facetable: false,
      },
    ],
    vectorSearch: {
      algorithms: [
        {
          name: 'hnsw-config',
          kind: 'hnsw',
          parameters: {
            m: 4,
            efConstruction: 400,
            efSearch: 500,
            metric: 'cosine',
          },
        },
      ],
      profiles: [
        {
          name: 'vector-profile',
          algorithmConfigurationName: 'hnsw-config',
        },
      ],
    },
  })

  console.log(`✓ Index "${INDEX_NAME}" created (or updated).`)
}

createIndex().catch((err: unknown) => {
  console.error('Failed to create index:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
