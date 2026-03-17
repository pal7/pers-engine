import type { Audience, AudienceRule } from '../types/experiment'

const northAmericaRule: AudienceRule = {
  id: 'rule-region-north-america',
  field: 'Region',
  operator: 'is one of',
  value: 'United States, Canada',
}

const returningVisitorRule: AudienceRule = {
  id: 'rule-visitor-returning',
  field: 'Visitor type',
  operator: 'is',
  value: 'Returning',
}

const enterpriseCompanySizeRule: AudienceRule = {
  id: 'rule-company-size-enterprise',
  field: 'Company size',
  operator: '>=',
  value: '250',
}

export const mockAudiences: Audience[] = [
  {
    id: 'aud-ecommerce-prospects',
    name: 'Ecommerce growth prospects',
    description:
      'New visitors from ecommerce campaigns who land on product and solution pages.',
    size: 19640,
    lastUpdated: '2026-03-16',
    rules: [
      {
        id: 'rule-visitor-new',
        field: 'Visitor type',
        operator: 'is',
        value: 'New',
      },
      {
        id: 'rule-industry-ecommerce',
        field: 'Industry',
        operator: 'contains',
        value: 'Ecommerce',
      },
      {
        id: 'rule-page-group-core',
        field: 'Page group',
        operator: 'is one of',
        value: 'Homepage, Product, Solutions',
      },
      northAmericaRule,
    ],
  },
  {
    id: 'aud-high-intent',
    name: 'High-intent pricing visitors',
    description:
      'Returning visitors showing strong buying intent on pricing and comparison pages.',
    size: 7420,
    lastUpdated: '2026-03-15',
    rules: [
      returningVisitorRule,
      {
        id: 'rule-pricing-views',
        field: 'Pricing views',
        operator: '>=',
        value: '2',
      },
      {
        id: 'rule-comparison-page-views',
        field: 'Comparison page views',
        operator: '>=',
        value: '1',
      },
      {
        id: 'rule-last-activity',
        field: 'Last activity',
        operator: 'within',
        value: '14 days',
      },
    ],
  },
  {
    id: 'aud-enterprise-evaluators',
    name: 'Enterprise evaluators',
    description:
      'Large-account buyers evaluating rollout readiness across security, integration, and demo pages.',
    size: 2180,
    lastUpdated: '2026-03-14',
    rules: [
      enterpriseCompanySizeRule,
      {
        id: 'rule-buyer-role',
        field: 'Buyer role',
        operator: 'is one of',
        value: 'Marketing lead, Growth lead, Product owner',
      },
      {
        id: 'rule-page-group-evaluation',
        field: 'Page group',
        operator: 'is one of',
        value: 'Security, Integrations, Demo request',
      },
      northAmericaRule,
    ],
  },
]
