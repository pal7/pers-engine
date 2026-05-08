# pers-engine

> Enter a URL. Get AI-powered UX analysis and A/B experiment suggestions in seconds.

pers-engine analyses any website and returns actionable UX findings and experiment hypotheses — powered by Azure OpenAI GPT-5.2, grounded with RAG retrieval from a corpus of 200 real site analyses.

**Live:** [gray-moss-0a4c7ec0f.7.azurestaticapps.net](https://gray-moss-0a4c7ec0f.7.azurestaticapps.net)

---

## What it does

1. User submits a URL via the React frontend
2. Express backend fetches the page (HTML fast path, Playwright fallback for JS-heavy sites)
3. Tech stack is detected from script sources and page signals (44 tools, 10 categories)
4. RAG retrieval: the page's hero text is embedded and used to vector-search a corpus of 200 similar site analyses in Azure AI Search — the top matches are injected into the GPT prompt
5. Azure OpenAI GPT-5.2 analyses the page and returns structured UX issues
6. A second GPT call generates platform-specific A/B experiment designs using tool calls (Adobe Target, Optimizely, VWO, or generic)

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite (port 5173) |
| Backend | Node.js, Express, TypeScript (port 3001) |
| Scraping | Playwright (JS-rendered sites fallback) |
| AI — analysis | Azure OpenAI GPT-5.2 (`pers-engine-foundry`, Canada Central) |
| AI — embeddings | `text-embedding-ada-002` (East US 2) |
| RAG retrieval | Azure AI Search (`pers-engine-search2`) — vector index of 200 site analyses |
| Shared types | `shared/analysis.ts` (frontend + backend) |
| Hosting | Azure Static Web Apps (frontend + CDN) |
| Compute | Azure Container Apps (backend) |
| Database | Azure Cosmos DB — `pers-engine-db` (result caching, coming soon) |
| Secrets | Azure Key Vault — `pers-engine-kv2` |
| Identity | Managed identity — no secrets in code |
| Observability | Azure Application Insights — `pers-engine-insights` |
| CI/CD | GitHub Actions → Azure Container Registry → Container App continuous deployment |

---

## Azure architecture

```
User
 │
 ▼
Azure Static Web Apps (React frontend + global CDN)
 │  gray-moss-0a4c7ec0f.7.azurestaticapps.net
 │
 ▼
Azure Container Apps (Node/Express backend)
 │  pers-engine-backend.victoriouscliff-9e3e036f.canadacentral.azurecontainerapps.io
 │
 ├─── Azure AI Foundry (GPT-5.2 — Canada Central)
 │    pers-engine-foundry.cognitiveservices.azure.com
 │
 ├─── Azure OpenAI (text-embedding-ada-002 — East US 2)
 │    ashwi-mowg48v7-eastus2.cognitiveservices.azure.com
 │
 ├─── Azure AI Search (RAG vector index)
 │    pers-engine-search2 — index: analyses (200 seeded docs)
 │
 ├─── Azure Cosmos DB (result caching — coming soon)
 │    pers-engine-db
 │
 └─── Azure Key Vault (secrets via managed identity)
      pers-engine-kv2

GitHub Actions → ACR (persengineacr.azurecr.io) → Container App auto-deploy
```

---

## RAG pipeline

On each analysis request:
1. `heroText` (or `pageTitle`) is embedded via `text-embedding-ada-002`
2. Vector search against the `analyses` AI Search index (1536-dim HNSW, cosine similarity)
3. Top 3 results filtered by `pageType` (ecommerce / saas / travel / finance / healthcare)
4. Matching site summaries and top issues injected into the GPT prompt as `SIMILAR SITE ANALYSES`
5. GPT produces analysis grounded in both the live page signals and comparable real-world data

The index contains 200 seeded analyses across 5 verticals (40 each). Seed pipeline: `scripts/seedPipeline.ts`.

---

## Local development

### Prerequisites
- Node.js 22+
- npm 10+

### Install and run

```bash
# Clone
git clone https://github.com/pal7/pers-engine.git
cd pers-engine

# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install

# Terminal 1 — backend (port 3001)
npm run dev

# Terminal 2 — frontend (port 5173)
cd .. && npm run dev
```

### Backend environment variables

Create `backend/.env`:

```env
PORT=3001

# Azure OpenAI (GPT-5.2 — analysis and experiments)
AZURE_OPENAI_ENDPOINT=https://pers-engine-foundry.cognitiveservices.azure.com/
AZURE_OPENAI_KEY=<key from AI Foundry → Keys and Endpoint>
AZURE_OPENAI_DEPLOYMENT=gpt-5.2

# Azure OpenAI (embeddings — East US 2 resource)
AZURE_EMBEDDING_ENDPOINT=https://ashwi-mowg48v7-eastus2.cognitiveservices.azure.com/
AZURE_EMBEDDING_KEY=<key from East US 2 resource>
AZURE_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# Azure AI Search (RAG retrieval)
AZURE_SEARCH_ENDPOINT=https://pers-engine-search2.search.windows.net
AZURE_SEARCH_KEY=<admin key from AI Search → Keys>

# Optional
COSMOS_DB_CONNECTION_STRING=
APPINSIGHTS_CONNECTION_STRING=
```

If `AZURE_OPENAI_KEY` is not set, the backend falls back to template-generated issues (no AI, useful for pure frontend dev).

> In production all secrets are in `pers-engine-kv2` Key Vault, read at startup via managed identity — no `.env` file needed.

---

## API reference

### `GET /api/health`
```json
{ "status": "ok" }
```

### `POST /api/analyze`
**Request:** `{ "url": "https://example.com" }`

**Response:**
```json
{
  "analyzedUrl": "https://example.com",
  "summary": "...",
  "extractionMode": "html",
  "extractionQuality": "good",
  "extractionWarnings": [],
  "evidence": {
    "heroText": "...",
    "ctaCount": 3,
    "hasForm": true,
    "primaryCTAAboveFold": true,
    "trustSignalsVisible": false,
    "pageType": "saas"
  },
  "extractedSignals": { "title": "...", "h1": "...", "ctaTexts": [...] },
  "techStack": [
    { "name": "Adobe Target", "category": "ab-testing", "confidence": "definitive", "evidence": "..." }
  ],
  "issues": [
    {
      "id": "weak-hero-cta",
      "title": "Weak CTA hierarchy above fold",
      "severity": "high",
      "detail": "...",
      "impact": "...",
      "confidence": "High"
    }
  ]
}
```

### `POST /api/experiments`
**Request:** `ExperimentRequest` (issues, techStack, evidence, pageContext)

**Response:** `{ "experiments": [...] }` — one experiment per issue, platform-specific (Adobe Target / Optimizely / VWO / generic).

---

## Project structure

```
pers-engine/
├── src/                              # React frontend
│   ├── pages/UrlAnalyzerPage.tsx
│   ├── components/
│   │   ├── analyzer/
│   │   │   ├── UrlAnalyzerForm.tsx
│   │   │   ├── UrlAnalyzerResult.tsx
│   │   │   └── UrlAnalyzerStatus.tsx
│   │   └── layout/AppShell.tsx
│   ├── lib/
│   │   ├── analysisApi.ts
│   │   └── urlValidation.ts
│   └── index.css
├── public/
│   └── staticwebapp.config.json      # SPA navigation fallback
├── shared/
│   └── analysis.ts                   # Shared TS types (frontend + backend)
├── backend/
│   └── src/
│       ├── server.ts
│       ├── analysisService.ts        # Core pipeline (fetch → RAG → GPT)
│       └── services/
│           ├── openAiService.ts      # GPT-5.2 analysis + prompt builder
│           ├── experimentService.ts  # Tool-call experiment generation
│           ├── ragService.ts         # Vector search retrieval (AI Search)
│           ├── extractHtmlSignals.ts
│           ├── extractRenderedSignals.ts  # Playwright browser fallback
│           ├── techStackDetector.ts  # 44-tool detection
│           ├── buildEvidence.ts
│           └── __tests__/
│               └── ragService.test.ts  # 20 vitest tests
├── scripts/
│   ├── createSearchIndex.ts          # Creates AI Search index schema
│   └── seedPipeline.ts               # Seeds 200 analyses into AI Search
├── redirect-app/                     # Old SWA → new SWA redirect
├── Dockerfile.backend
└── .github/workflows/
    ├── backend-deploy.yml
    └── azure-static-web-apps-gray-moss-0a4c7ec0f.yml
```

---

## Running tests

```bash
cd backend
npm test            # run once
npm run test:watch  # watch mode
```

20 unit tests covering the RAG retrieval service: env var guards, embedding failures, search failures, pageType filtering, and result parsing edge cases.

---

## CI/CD

Push to `main`:
- **Frontend:** GitHub Actions builds Vite with `VITE_API_URL` injected → deploys to Azure Static Web Apps
- **Backend:** Builds Docker image → pushes `:latest` to ACR → Container App continuous deployment picks it up automatically

No service principal or `AZURE_CREDENTIALS` secret needed.

---

## Roadmap

- [ ] Live analysis feed — SSE streaming of pipeline steps visible during analysis
- [ ] Cosmos DB result caching (by URL, TTL 24h)
- [ ] Key Vault managed identity for all secrets
- [ ] Multi-URL batch analysis

---

## Background

Built at the intersection of CRO/personalisation platform work (Adobe Target, Optimizely) and Azure cloud architecture. The goal is to apply enterprise-grade infrastructure — RAG retrieval, managed identity, distributed caching, observability — to a real analytical tool.

---

## License

MIT
