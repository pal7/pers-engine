# pers-engine

AI-powered UX analysis tool. User submits URL → backend scrapes → Azure OpenAI returns UX issues + A/B test hypotheses.

## Stack

| Layer        | Tech                                             |
| ------------ | ------------------------------------------------ |
| Frontend     | React 18, TypeScript, Vite (port 5173)           |
| Backend      | Node/Express, TypeScript (port 3001)             |
| Scraping     | Playwright 1.59.1 (JS-heavy sites fallback)      |
| Shared types | `shared/analysis.ts`                             |
| AI           | Azure OpenAI GPT-5.2                             |
| BAG          | Azure AI Search (vector) + text-embedding-ada-002 |
| Hosting      | Azure Static Web Apps (FE) + Container Apps (BE) |

## Local dev

```bash
# Terminal 1 — backend
cd backend && npm run dev        # port 3001

# Terminal 2 — frontend
npm run dev                      # port 5173
```

Requires `backend/.env`:

```
# Playwright (local dev only)
HEADLESS=false
CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome

# Azure OpenAI (GPT-5.2)
AZURE_OPENAI_ENDPOINT=https://canadacentral.api.cognitive.microsoft.com/
AZURE_OPENAI_KEY=
AZURE_OPENAI_DEPLOYMENT=gpt-5.2

# Azure AI Search (BAG)
AZURE_SEARCH_ENDPOINT=https://pers-engine-search2.search.windows.net
AZURE_SEARCH_KEY=

# Azure Embeddings (text-embedding-ada-002, East US 2)
AZURE_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
AZURE_EMBEDDING_ENDPOINT=https://ashwi-mowg48v7-eastus2.cognitiveservices.azure.com/
AZURE_EMBEDDING_KEY=

# Azure Blob Storage (agent screenshots)
AZURE_STORAGE_CONNECTION_STRING=
```

`HEADLESS` and `CHROME_EXECUTABLE_PATH` are local-only — not needed in prod (Docker runs headless with playwright-managed browser). All other vars must also be set as Container App secrets in prod.

## Playwright — DO NOT reinstall unless required

**Version: 1.59.1** (`playwright` + `playwright-extra` + `puppeteer-extra-plugin-stealth`)

- Browsers are already installed at `~/Library/Caches/ms-playwright/` (chromium-1223, chromium_headless_shell-1223)
- `stealthBrowser.ts` wraps `playwright-extra` + `StealthPlugin` — this is intentional to avoid bot detection
- Local dev: uses system Chrome via `CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Docker/prod: headless mode, uses playwright-managed Chromium (no `executablePath`)
- **Do NOT run `npx playwright install` or `npx playwright install chromium`** — browsers are already present; running install downloads a new revision unnecessarily and can cause version conflicts
- Only reinstall if: (a) upgrading `playwright` package version in `package.json`, or (b) the cached browser revision is explicitly deleted

## API

- `GET  /api/health` → `{ status: "ok", version: "v4.1" }`
- `POST /api/analyze` → full `AnalysisResponse` (blocking)
- `POST /api/analyze/stream` → SSE stream of `AnalysisProgressEvent` then final `AnalysisResponse`
- `POST /api/experiments` → `{ experiments[] }` — AI tool-calling generates platform-specific experiments
- `POST /api/agent-analyze` → `AgentSession` (blocking)
- `GET  /api/agent-analyze/stream` → SSE stream of `AgentObservation` events then final `AgentSession`

## Key files

```
src/                                  # React frontend
  components/analyzer/
    UrlAnalyzerForm.tsx               # URL input + submit
    AnalysisActivityLog.tsx           # SSE progress stream UI
    UrlAnalyzerResult.tsx             # Issues, experiments, tech stack, comparable businesses
  pages/UrlAnalyzerPage.tsx           # Main page
backend/src/
  server.ts                           # Express routes
  analysisService.ts                  # Orchestrator — extraction → classify+browser(parallel) → RAG → GPT
  services/
    classifyService.ts                # GPT business DNA classifier → SiteClassification + descriptor
    ragService.ts                     # Azure AI Search vector retrieval (descriptor embeddings)
    openAiService.ts                  # GPT-5.2 analysis + vision + prompt builder
    experimentService.ts              # AI tool-calling for platform-specific experiments
    agentService.ts                   # Playwright agent (7-step session)
    stealthBrowser.ts                 # playwright-extra + StealthPlugin launcher
    extractHtmlSignals.ts             # Fast HTML extraction
    extractRenderedSignals.ts         # Browser (Playwright) extraction fallback
    techStackDetector.ts              # 58+ tools across 14 categories
    buildEvidence.ts                  # Normalises signals → AnalysisEvidence
    analysisIssueTemplates.ts         # Template fallback (no AI key)
    analysisExperimentTemplates.ts    # Template fallback (no AI key)
shared/analysis.ts                    # Shared TS types (FE + BE)
scripts/
  createSearchIndex.ts                # One-time: create Azure AI Search index (with taxonomy fields)
  seedPipeline.ts                     # Seed pipeline with --categories filter for incremental re-seeding
  seedUrls.ts                         # 440 seed URLs (11 categories × 40: ecommerce, saas, travel, finance, healthcare, b2b, education, realestate, food, automotive, media)
  package.json                        # Scripts: create-index, seed, seed-new
Dockerfile.backend
.github/workflows/azure-deploy.yml
infra/AZURE_SETUP.md
```

## Current state

### Live
- ✅ Frontend — https://polite-moss-0b0a7a60f.2.azurestaticapps.net/
- ✅ Backend — https://pers-engine-backend.agreeableflower-05a7ca4e.canadacentral.azurecontainerapps.io
- ✅ GitHub Actions CI/CD (push to main → build → deploy SWA + Container Apps)

### Features
- ✅ URL analysis — GPT-5.2 generates 4 issues + summary grounded in page signals
- ✅ BAG pipeline — 439 seeded analyses in Azure AI Search (11 categories × 40: ecommerce, saas, travel, finance, healthcare, b2b, education, realestate, food, automotive, media); sites classified by business DNA, top-3 comparable businesses retrieved by descriptor embedding similarity (self-reference excluded), injected into GPT prompt; shown in "Comparable businesses" accordion in the UI
- ✅ Tech stack detection (58+ tools, 14 categories incl. consent, monitoring, font, chat); wired into GPT prompt
- ✅ Experiment generation — `/api/experiments` uses AI tool-calling with platform-specific tools (Adobe Target, Optimizely, VWO, generic); falls back to templates if no AI key
- ✅ Streaming analysis — `/api/analyze/stream` emits SSE progress events (fetch, browser-fallback, classify, rag, gpt, agent steps)
- ✅ Agentic Playwright analysis — live browser session with 7 steps (navigate, runtime signals, above-fold screenshot, tech from network, scroll + mid-page screenshot, CTA click + post-click screenshot, synthesise)
- ✅ Screenshot blob storage — agent screenshots uploaded to Azure Blob Storage (`agent-screenshots` container), returned as public URLs in `AgentSession.screenshots[]`
- ✅ Screenshot gallery rendered in UI — 3 screenshots with vision-analysis captions, each links to full-res blob
- ✅ Experiment cards — 2 expandable accordion cards; expand reveals hypothesis, variant change, metric, implementation hint, and relevant screenshot
- ✅ "Generate more experiments" premium teaser — locked UI element, not yet functional
- ✅ Page signals accordion — expandable table of raw signals used in analysis

### Azure infrastructure
- ✅ Azure Static Web Apps (frontend + CDN)
- ✅ Azure Container Apps (backend, v4.1)
- ✅ Container Registry — persengineacr.azurecr.io
- ✅ Azure AI Foundry — pers-engine-foundry (Canada Central)
- ✅ Azure AI Search — pers-engine-search2 (`analyses` index, 1536-dim HNSW, 439 documents across 11 categories)
- ✅ Embedding deployment — text-embedding-ada-002 (East US 2)
- ✅ Storage Account — persenginestore2 (agent-screenshots container)
- ✅ Key Vault — pers-engine-kv
- ✅ Application Insights — pers-engine-insights

**Note on managed identity**: VS employee subscription blocks RBAC role assignments needed for Key Vault managed identity. Secrets are read from environment variables directly (Container App secrets), not Key Vault. See `project_subscription_limitation.md` in memory.

#### Still to do — core
- ⬜ Cosmos DB caching — cache `AnalysisResponse` by URL; invalidate only when the page content has changed (check `Last-Modified` / `ETag` headers or compare a content hash before serving from cache)
- ⬜ Feed vision captions into main analysis prompt — agent vision runs on each screenshot but captions only show in UI, not in `buildUserPrompt`; wiring them in would let issues/experiments reference visual observations
- ✅ Expanded seed corpus — 439 documents across 11 categories (ecommerce, saas, travel, finance, healthcare, b2b, education, realestate, food, automotive, media); business DNA classification via `classifyService.ts`; self-reference excluded from RAG results; `--categories` filter in seed pipeline for incremental re-seeding (`npm run seed-new`)

#### Still to do — UI / visual analysis
- ⬜ Annotated screenshot overlay — draw bounding boxes / arrows on the above-fold screenshot (canvas or SVG layer; coordinates from vision or structured GPT response)
- ⬜ PDF / printable report export — one-page summary (issues + 2 experiments + screenshots) as downloadable PDF; consider `@react-pdf/renderer` or `window.print()` with print stylesheet
- ⬜ "Generate more experiments" — wire the premium teaser to an auth gate and the `/api/experiments` endpoint

## AI model

| | |
|---|---|
| Model | gpt-5.2 |
| Deployment name | `gpt-5.2` |
| Endpoint | `https://canadacentral.api.cognitive.microsoft.com/` |
| Resource | Azure AI Foundry — pers-engine-foundry (Canada Central) |

## BAG pipeline (Benchmark-Augmented Generation)

The `analyses` index in Azure AI Search contains 439 pre-seeded websites across 11 categories. Each document is embedded on its **business DNA descriptor** (not hero text), making vector similarity meaningful at the business model level rather than text level.

**At analysis time (pipeline order):**
1. `extractHtmlSignals` — fast HTML extraction
2. `classifyService.ts` + `extractRenderedSignals` run **in parallel** — classify uses HTML signals immediately while browser fallback runs concurrently (~3-5s classify is free on JS-heavy sites)
3. `ragService.ts` — embed the descriptor, vector search for top-3 comparable businesses (pure vector similarity, no OData filter); analyzed URL excluded from results by hostname match
4. Comparable businesses injected into GPT prompt as `COMPARABLE BUSINESSES` — GPT identifies shared friction patterns and divergences
5. Results returned in `AnalysisResponse.comparableSites[]` and shown in "Comparable businesses" accordion in the UI

**`SiteClassification` fields:**
```
businessType: B2B | B2C | B2B2C | marketplace | media | nonprofit | unknown
productCategory: string
audience: string
businessModel: string
purchaseComplexity: low | medium | high
industryVertical: string
```
Descriptor format: `"B2B | Lab instruments | Laboratories, scientists | Direct sales, quotes | high | Life sciences and diagnostics"`

**At seed time (`scripts/seedPipeline.ts`):**
- Extract → classify (GPT) + analyze CRO issues (GPT) in parallel → embed descriptor → upload to AI Search with all 7 taxonomy fields

To re-seed all: `cd scripts && npm install && npm run create-index && npm run seed` (requires `scripts/.env` matching `backend/.env`).
To seed new categories only: `npm run seed-new` (runs `--categories=education,realestate,food,automotive,media`).
To seed a custom subset: `tsx --env-file .env seedPipeline.ts --categories=food,media`.

**Azure AI Search `filterMode` note**: vector-only queries require `filterMode: 'preFilter'` explicitly set in `vectorSearchOptions` — without it the v12 SDK silently ignores OData filters. This is set in `ragService.ts` but is not needed when no filter is applied (pure vector search).

## Experiment generation

`POST /api/experiments` uses AI tool-calling with 4 tools:
- `create_target_experiment` — when Adobe Target is in the tech stack
- `create_optimizely_experiment` — when Optimizely is detected
- `create_vwo_experiment` — when VWO is detected
- `create_generic_experiment` — always available as fallback

Results are mapped to `AnalysisExperiment[]` with platform-specific `implementationHint`.

## Conventions

- TypeScript strict mode
- Shared types live in `shared/analysis.ts` — import from there, never redeclare
- No mock data needed — template fallback in `analysisIssueTemplates.ts` / `analysisExperimentTemplates.ts` runs when `AZURE_OPENAI_KEY` is not set
- Backend runs independently — test with `curl localhost:3001/api/health`
- Page types: `ecommerce | travel | saas | finance | healthcare | general`

## Repo

github.com/pal7/pers-engine

## Active branch

- `main` — stable, deployed to Azure
- `feature/v4/agents` — current branch
