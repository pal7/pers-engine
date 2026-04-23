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
PORT=3001
AZURE_OPENAI_ENDPOINT=
AZURE_OPENAI_KEY=
AZURE_OPENAI_DEPLOYMENT=gpt-4o
COSMOS_DB_CONNECTION_STRING=
APPINSIGHTS_CONNECTION_STRING=
```

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
- ✅ Tech stack detection (44 tools, 10 categories, HTML signal matching)
- ✅ Shared TypeScript types (shared/analysis.ts)

### Azure infrastructure
- ✅ Azure Static Web Apps (frontend + CDN)
- ✅ Azure Container Apps (backend)
- ✅ Container Registry — persengineacr.azurecr.io
- ✅ Azure AI Foundry — pers-engine-foundry (Canada Central)
- ✅ Cosmos DB — pers-engine-db (serverless, analyses container)
- ✅ Storage Account — persenginestore
- ✅ Key Vault — pers-engine-kv
- ✅ Application Insights — pers-engine-insights

#### Still to do
- ⬜ Replace template heuristics with real GPT-5.2 call (read secrets from Key Vault via managed identity)
- ⬜ Wire detected tech stack into GPT-5.2 prompt (implementationHint per experiment)
- ⬜ Cosmos DB caching (cache analysis results by URL)

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
