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

- ✅ Frontend UI working
- ✅ Express backend with mock data
- ✅ Shared types
- ✅ Dockerfile.backend, azure-deploy.yml, AZURE_SETUP.md added
- ⬜ Azure OpenAI integration (mock → real)
- ⬜ Playwright scraper container deployed
- ⬜ Cosmos DB caching
- ⬜ Azure Static Web Apps deployment (next step)
- ⬜ Application Insights

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
