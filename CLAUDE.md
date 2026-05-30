# pers-engine

AI-powered UX analysis tool. User submits URL → backend scrapes → Azure OpenAI returns UX issues + A/B test hypotheses → cached in Cosmos DB.

## Stack

| Layer        | Tech                                             |
| ------------ | ------------------------------------------------ |
| Frontend     | React 18, TypeScript, Vite (port 5173)           |
| Backend      | Node/Express, TypeScript (port 3001)             |
| Scraping     | Playwright (JS-heavy sites fallback)             |
| Shared types | `shared/analysis.ts`                             |
| AI           | Azure OpenAI GPT-4o                              |
| DB           | Azure Cosmos DB (result caching)                 |
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

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://canadacentral.api.cognitive.microsoft.com/
AZURE_OPENAI_KEY=
AZURE_OPENAI_DEPLOYMENT=gpt-5.2

# Azure AI Search (RAG)
AZURE_SEARCH_ENDPOINT=https://pers-engine-search.search.windows.net
AZURE_SEARCH_KEY=

# Azure Embeddings
AZURE_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
AZURE_EMBEDDING_ENDPOINT=https://ashwi-moev3iec-canadaeast.cognitiveservices.azure.com/
AZURE_EMBEDDING_KEY=

# Azure Blob Storage (agent screenshots)
AZURE_STORAGE_CONNECTION_STRING=
```

`HEADLESS` and `CHROME_EXECUTABLE_PATH` are local-only — not needed in prod (Docker runs headless with playwright-managed browser). All other vars must also be set as Container App secrets in prod.

## API

- `GET  /api/health` → `{ status: "ok" }`
- `POST /api/analyze` → `{ url, issues[], experiments[] }`

`issues[]`: `{ severity: high|med|low, description, recommendation }`
`experiments[]`: `{ hypothesis, expectedImpact, priority }`

## Key files

```
src/                          # React frontend
backend/src/
  server.ts                   # Express + routes
  services/
    analysisService.ts        # Core logic
    analysisExperimentTemplates.ts
    analysisIssueTemplates.ts
    analysisMockData.ts       # Dev mock (no Azure needed locally)
shared/analysis.ts            # Shared TS types (FE + BE)
Dockerfile.backend
Dockerfile.scraper
.github/workflows/azure-deploy.yml
infra/AZURE_SETUP.md
```

## Current state

### Live
- ✅ Frontend — https://polite-moss-0b0a7a60f.2.azurestaticapps.net/
- ✅ Backend — https://pers-engine-backend.agreeableflower-05a7ca4e.canadacentral.azurecontainerapps.io
- ✅ GitHub Actions CI/CD (push to main → build → deploy SWA + Container Apps)

### Features
- ✅ URL analysis with UX issues + experiment suggestions
- ✅ Tech stack detection (58+ tools, 14 categories incl. consent, monitoring, font, chat)
- ✅ Shared TypeScript types (shared/analysis.ts)
- ✅ Agentic Playwright analysis — live browser session with 7 steps (navigate, runtime signals, above-fold screenshot, tech from network, scroll + mid-page screenshot, CTA click + post-click screenshot, synthesise)
- ✅ Screenshot blob storage — agent screenshots uploaded to Azure Blob Storage (`agent-screenshots` container), returned as public URLs in `AgentSession.screenshots[]`
- ✅ Screenshot gallery rendered in UI — 3 screenshots (above-fold, mid-page, after CTA click) with vision-analysis captions, each links to full-res blob
- ✅ Experiment cards — 2 expandable accordion cards (not 4 flat cards); expand reveals hypothesis, variant change, metric, implementation hint
- ✅ "Generate more experiments" premium teaser — locked UI element below the 2 cards, not yet functional

### Azure infrastructure
- ✅ Azure Static Web Apps (frontend + CDN)
- ✅ Azure Container Apps (backend)
- ✅ Container Registry — persengineacr.azurecr.io
- ✅ Azure AI Foundry — pers-engine-foundry (Canada Central)
- ✅ Cosmos DB — pers-engine-db (serverless, analyses container)
- ✅ Storage Account — persenginestore2 (agent-screenshots container)
- ✅ Key Vault — pers-engine-kv
- ✅ Application Insights — pers-engine-insights

#### Still to do — core
- ⬜ Replace template heuristics with real GPT-5.2 call (read secrets from Key Vault via managed identity)
- ⬜ Wire detected tech stack into GPT-5.2 prompt (implementationHint per experiment)
- ⬜ Cosmos DB caching (cache analysis results by URL)
- ⬜ Feed vision captions into main analysis prompt — currently GPT-5.2 vision runs on each screenshot but captions are only shown in the UI, not passed to `buildUserPrompt`; wiring them in would let the issues/experiments reference actual visual observations (e.g. "CTA is visually buried below the hero image")

#### Still to do — UI / visual analysis
- ⬜ Annotated screenshot overlay — draw bounding boxes / arrows on the above-fold screenshot to show suggested CTA repositioning (needs canvas or SVG layer over the `<img>`; coordinates come from vision analysis or a new structured GPT response)
- ⬜ PDF / printable report export — generate a one-page summary (issues + 2 experiments + screenshots) as a downloadable PDF; consider `@react-pdf/renderer` or browser `window.print()` with a print stylesheet
- ⬜ "Generate more experiments" — wire the premium teaser to an auth gate and the existing `/api/experiments` endpoint; returns all experiments (not sliced to 2)
- ⬜ Experiment card screenshot context — show the relevant screenshot thumbnail (e.g. above-fold for CTA experiments) inside the expanded experiment card body so the before-state is visible alongside the variant description

## AI model

| | |
|---|---|
| Model | gpt-5.2 |
| Deployment name | `gpt-5.2` |
| Endpoint | `https://pers-engine-foundry.cognitiveservices.azure.com/` |
| Resource | Azure AI Foundry — pers-engine-foundry (Canada Central) |

## Key Vault secrets

Secrets are already created in `pers-engine-kv`. Backend reads them at startup via managed identity — no `.env` needed in prod.

| Secret name | Value |
|---|---|
| `azure-openai-endpoint` | `https://pers-engine-foundry.cognitiveservices.azure.com/` |
| `azure-openai-key` | Azure OpenAI API key |
| `azure-openai-deployment` | `gpt-5.2` |

## Managed identity

- Container App `pers-engine-backend` has **system-assigned managed identity** enabled
- **Key Vault Secrets User** role is assigned to that identity on `pers-engine-kv`
- This means the backend can call `SecretClient` with `DefaultAzureCredential` and read secrets without any API key in the environment

## Azure target architecture

```
User → Azure Static Web Apps (FE + CDN)
     → Azure API Management (rate limit + auth)
     → Container Apps: Express backend
     → Container Apps: Playwright scraper
     → Azure OpenAI / Cosmos DB / Key Vault
GitHub Actions → ACR → auto-deploy
```

Secrets: Key Vault via managed identity — no .env in prod.

## Conventions

- TypeScript strict mode
- Shared types live in `shared/analysis.ts` — import from there, never redeclare
- Mock data in `analysisMockData.ts` for local dev without Azure creds
- Backend runs independently — test with `curl localhost:3001/api/health`

## Repo

github.com/pal7/pers-engine

## Active branch

- `main` — stable, deployed to Azure
- `feature/v4/agents` — **current work** (agentic Playwright analysis, screenshot blob storage)
