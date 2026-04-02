# pers-engine

> Enter a URL. Get AI-powered A/B test suggestions and UX issues in seconds.

pers-engine analyses any website and returns actionable UX improvements and A/B test hypotheses — powered by Azure OpenAI and deployed on enterprise-grade Azure infrastructure.

**Live demo:** _coming soon_

---

## What it does

1. User submits a URL via the React frontend
2. Express backend validates and fetches the page (with Playwright fallback for JS-heavy sites)
3. Azure OpenAI analyses the content and returns:
   - UX issues with severity ratings
   - A/B test hypotheses with expected impact
   - Experiment templates ready to implement
4. Results are cached in Azure Cosmos DB for repeat requests

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Scraping | Playwright (JS-rendered sites) |
| AI | Azure OpenAI (GPT-4o) |
| Hosting | Azure Static Web Apps (frontend) |
| Compute | Azure Container Apps (backend + scraper) |
| API layer | Azure API Management |
| Database | Azure Cosmos DB |
| Secrets | Azure Key Vault |
| Identity | Azure Entra ID (Azure AD) |
| Observability | Azure Application Insights |
| CI/CD | GitHub Actions → Azure Container Registry |

---

## Azure architecture

```
User
 │
 ▼
Azure Static Web Apps (React frontend + global CDN)
 │
 ▼
Azure API Management (rate limiting · auth · routing)
 │
 ├──────────────────────────┐
 ▼                          ▼
Azure Container Apps     Azure Container Apps
(Node/Express backend)   (Playwright scraper)
 │                          │
 ▼                          ▼
Azure OpenAI (GPT-4o)   Azure Blob Storage
Azure Cosmos DB          (page snapshots)
Azure Key Vault
Azure Application Insights
 │
 ▼
GitHub Actions → Azure Container Registry → Auto deploy
```

### Why each Azure service was chosen

**Azure Static Web Apps** — built-in GitHub Actions CI/CD, global CDN, and preview environments per PR. No server to manage for the frontend.

**Azure Container Apps** — serverless containers that scale to zero. Chosen over Azure Functions because Playwright requires a persistent browser process that Functions' consumption model doesn't support cleanly.

**Azure API Management** — centralised rate limiting, authentication, and request routing across both backend containers. Essential for any production multi-service architecture.

**Azure OpenAI** — same GPT-4o model as OpenAI but with Canadian data residency, no training on your data, and SOC 2 / ISO 27001 compliance. Critical for enterprise and regulated-industry deployments.

**Azure Cosmos DB** — globally distributed NoSQL for caching analysis results. Repeat URL submissions return instantly without re-calling the AI.

**Azure Key Vault** — zero secrets in code or environment variables. All API keys and connection strings are fetched at runtime via managed identity.

**Azure Entra ID** — RBAC for future multi-tenant support. Managed identity means containers authenticate to Key Vault and Cosmos DB without storing credentials anywhere.

**Application Insights** — end-to-end distributed tracing across both containers, performance monitoring, and error alerting. Dashboards show real usage patterns.

---

## Local development

### Prerequisites
- Node.js 22+
- npm 10+

### Install and run

```bash
# Clone the repo
git clone https://github.com/pal7/pers-engine.git
cd pers-engine

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Run backend (port 3001)
npm run dev

# In a new terminal — run frontend (port 5173)
cd ..
npm run dev
```

### Environment variables

Create `backend/.env`:

```env
PORT=3001
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_KEY=your_azure_openai_key
AZURE_OPENAI_DEPLOYMENT=gpt-4o
COSMOS_DB_CONNECTION_STRING=your_cosmos_connection_string
APPINSIGHTS_CONNECTION_STRING=your_appinsights_connection_string
```

> In production all secrets are stored in Azure Key Vault and fetched via managed identity — no `.env` file needed.

---

## API reference

### `GET /api/health`
Returns service status.

```json
{ "status": "ok" }
```

### `POST /api/analyze`
Analyses a URL and returns UX issues and A/B test suggestions.

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "issues": [
    {
      "severity": "high",
      "description": "CTA button has low contrast ratio (2.8:1)",
      "recommendation": "Increase contrast to minimum 4.5:1 for WCAG AA compliance"
    }
  ],
  "experiments": [
    {
      "hypothesis": "Changing CTA copy from 'Submit' to 'Get my free report' will increase clicks",
      "expectedImpact": "15-25% CTR improvement",
      "priority": "high"
    }
  ]
}
```

---

## Project structure

```
pers-engine/
├── src/                        # React frontend
│   └── ...
├── public/                     # Static assets
├── backend/
│   └── src/
│       ├── server.ts           # Express server, API routes
│       ├── services/
│       │   ├── analysisService.ts          # Core analysis logic
│       │   ├── analysisExperimentTemplates.ts  # A/B test templates
│       │   ├── analysisIssueTemplates.ts   # UX issue templates
│       │   └── analysisMockData.ts         # Dev mock responses
├── shared/
│   └── analysis.ts             # Shared TypeScript types
├── Dockerfile.backend          # Backend container
├── Dockerfile.scraper          # Playwright scraper container
└── .github/
    └── workflows/
        └── azure-deploy.yml    # CI/CD pipeline
```

---

## Deployment

See [`infra/AZURE_SETUP.md`](infra/AZURE_SETUP.md) for step-by-step Azure provisioning commands.

CI/CD is fully automated — push to `main` triggers a GitHub Actions workflow that builds both containers, pushes to Azure Container Registry, and deploys to Container Apps.

---

## Background

Built as a personal project at the intersection of my A/B testing and personalisation work (Adobe Target, BMO digital platforms) and Azure cloud architecture. The goal was to apply enterprise-grade cloud infrastructure patterns — API gateway, managed identity, distributed caching, observability — to a real tool in a domain I know well.

---

## Roadmap

- [ ] Azure OpenAI integration (replacing mock data)
- [ ] Playwright scraper container deployment
- [ ] Cosmos DB caching layer
- [ ] Application Insights dashboard
- [ ] Multi-URL batch analysis
- [ ] Shareable report links

---

## License

MIT
