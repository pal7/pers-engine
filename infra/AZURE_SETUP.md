# Azure infrastructure setup

Step-by-step Azure CLI commands to provision the full pers-engine infrastructure.
Run these once to set up — CI/CD handles all future deploys automatically.

## Prerequisites

- Azure CLI installed: `winget install Microsoft.AzureCLI`
- Logged in: `az login`
- Free Azure account: azure.microsoft.com/free

---

## 1. Set variables

```bash
RESOURCE_GROUP="pers-engine-rg"
LOCATION="canadacentral"
ACR_NAME="persenginecr"
BACKEND_APP="pers-engine-backend"
ENVIRONMENT="pers-engine-env"
KEYVAULT_NAME="pers-engine-kv"
COSMOS_ACCOUNT="pers-engine-cosmos"
APPINSIGHTS_NAME="pers-engine-insights"
```

## 2. Create resource group

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

## 3. Create Azure Container Registry

```bash
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true
```

## 4. Create Application Insights

```bash
az monitor app-insights component create \
  --app $APPINSIGHTS_NAME \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# Get connection string for later
az monitor app-insights component show \
  --app $APPINSIGHTS_NAME \
  --resource-group $RESOURCE_GROUP \
  --query connectionString -o tsv
```

## 5. Create Key Vault

```bash
az keyvault create \
  --name $KEYVAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-rbac-authorization true
```

## 6. Create Cosmos DB

```bash
az cosmosdb create \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --locations regionName=$LOCATION \
  --default-consistency-level Session

az cosmosdb sql database create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --name persengine

az cosmosdb sql container create \
  --account-name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --database-name persengine \
  --name analysis-cache \
  --partition-key-path "/url"
```

## 7. Store secrets in Key Vault

```bash
# Store Cosmos DB connection string
COSMOS_CONN=$(az cosmosdb keys list \
  --name $COSMOS_ACCOUNT \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv)

az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "cosmos-connection-string" \
  --value "$COSMOS_CONN"

# Store Azure OpenAI key (add your key here)
az keyvault secret set \
  --vault-name $KEYVAULT_NAME \
  --name "azure-openai-key" \
  --value "YOUR_AZURE_OPENAI_KEY"
```

## 8. Create Container Apps environment

```bash
az containerapp env create \
  --name $ENVIRONMENT \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

## 9. Deploy backend Container App

```bash
ACR_PASSWORD=$(az acr credential show \
  --name $ACR_NAME \
  --query "passwords[0].value" -o tsv)

az containerapp create \
  --name $BACKEND_APP \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT \
  --image "$ACR_NAME.azurecr.io/pers-engine-backend:latest" \
  --registry-server "$ACR_NAME.azurecr.io" \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3001 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi
```

## 10. Deploy frontend to Azure Static Web Apps

```bash
az staticwebapp create \
  --name "pers-engine-web" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --source "https://github.com/pal7/pers-engine" \
  --branch main \
  --app-location "/" \
  --output-location "dist" \
  --login-with-github
```

---

## GitHub Actions secrets to add

Go to your repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret name | How to get it |
|---|---|
| `AZURE_CREDENTIALS` | `az ad sp create-for-rbac --sdk-auth` |
| `AZURE_REGISTRY_NAME` | Value of `$ACR_NAME` |
| `AZURE_REGISTRY_USERNAME` | Value of `$ACR_NAME` |
| `AZURE_REGISTRY_PASSWORD` | Run `az acr credential show --name $ACR_NAME` |
| `AZURE_STATIC_WEB_APPS_TOKEN` | Shown after step 10 above |

---

## Estimated monthly cost (free tier usage)

| Service | Free tier | Est. cost after |
|---|---|---|
| Static Web Apps | Free forever (100GB bandwidth) | $9/mo |
| Container Apps | 180,000 vCPU-s free/month | ~$0-5/mo |
| Container Registry | 10GB free | $5/mo |
| Key Vault | 10,000 operations free | ~$0 |
| Application Insights | 5GB free/month | ~$0 |
| Cosmos DB | 1000 RU/s free forever | ~$0-25/mo |

**Total: $0 within free tiers for a personal project at low volume.**
