import { AzureOpenAI } from 'openai/azure'
import type { AnalysisEvidence } from '../../../shared/analysis.ts'
import type { ExtractedPageSignals } from './extractPageSignals.ts'

export interface SiteClassification {
  businessType: 'B2B' | 'B2C' | 'B2B2C' | 'marketplace' | 'media' | 'nonprofit' | 'unknown'
  productCategory: string
  audience: string
  businessModel: string
  purchaseComplexity: 'low' | 'medium' | 'high'
  industryVertical: string
}

export function buildDescriptor(c: SiteClassification): string {
  return [
    c.businessType,
    c.productCategory,
    c.audience,
    c.businessModel,
    `${c.purchaseComplexity} purchase complexity`,
    c.industryVertical,
  ]
    .filter(Boolean)
    .join(' | ')
}

const VALID_BUSINESS_TYPES = ['B2B', 'B2C', 'B2B2C', 'marketplace', 'media', 'nonprofit']
const VALID_COMPLEXITY = ['low', 'medium', 'high']

export async function classifySite(
  signals: ExtractedPageSignals,
  evidence: AnalysisEvidence,
): Promise<SiteClassification | null> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey   = process.env.AZURE_OPENAI_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? 'gpt-5.2'

  if (!apiKey || !endpoint) return null

  const client = new AzureOpenAI({
    endpoint, apiKey, deployment,
    apiVersion: '2025-01-01-preview',
    timeout: 15_000,
  })

  const inputLines = [
    `URL: ${signals.resolvedUrl}`,
    signals.pageTitle    && `Title: ${signals.pageTitle}`,
    signals.firstH1Text  && `H1: ${signals.firstH1Text}`,
    signals.heroText     && `Hero: ${signals.heroText}`,
    signals.candidateCtaTexts.length > 0 && `CTAs: ${signals.candidateCtaTexts.slice(0, 5).join(', ')}`,
    `Has form: ${signals.hasForm}`,
    `Page type heuristic: ${evidence.pageType}`,
    signals.pageText && `Content sample: ${signals.pageText.slice(0, 400)}`,
  ].filter(Boolean).join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: deployment,
      response_format: { type: 'json_object' },
      max_completion_tokens: 256,
      messages: [
        {
          role: 'system',
          content: 'Classify websites by business context for UX benchmarking. Be concise. Return only valid JSON.',
        },
        {
          role: 'user',
          content: `Classify this website. Keep each field under 8 words.\n\n${inputLines}\n\nReturn ONLY this JSON:\n{\n  "businessType": "B2B"|"B2C"|"B2B2C"|"marketplace"|"media"|"nonprofit",\n  "productCategory": "string",\n  "audience": "string",\n  "businessModel": "string",\n  "purchaseComplexity": "low"|"medium"|"high",\n  "industryVertical": "string"\n}`,
        },
      ],
    })

    const raw    = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as Partial<SiteClassification>

    return {
      businessType:       VALID_BUSINESS_TYPES.includes(parsed.businessType ?? '') ? (parsed.businessType as SiteClassification['businessType']) : 'unknown',
      productCategory:    typeof parsed.productCategory === 'string' ? parsed.productCategory : '',
      audience:           typeof parsed.audience === 'string' ? parsed.audience : '',
      businessModel:      typeof parsed.businessModel === 'string' ? parsed.businessModel : '',
      purchaseComplexity: VALID_COMPLEXITY.includes(parsed.purchaseComplexity ?? '') ? (parsed.purchaseComplexity as SiteClassification['purchaseComplexity']) : 'medium',
      industryVertical:   typeof parsed.industryVertical === 'string' ? parsed.industryVertical : '',
    }
  } catch (err) {
    console.warn('[classify] failed:', err instanceof Error ? err.message : String(err))
    return null
  }
}
