import type { Audience } from '../types/experiment'

export const mockAudiences: Audience[] = [
  {
    id: 'aud-ecommerce-prospects',
    name: 'Ecommerce growth prospects',
    description:
      'New prospect traffic in North America browsing from larger screens.',
    size: 19640,
    lastUpdated: '2026-03-16',
    rules: [
      {
        id: 'rule-ecommerce-country',
        field: 'country',
        operator: 'in',
        value: 'United States, Canada',
      },
      {
        id: 'rule-ecommerce-returning',
        field: 'isReturningUser',
        operator: 'equals',
        value: 'false',
      },
      {
        id: 'rule-ecommerce-device',
        field: 'device',
        operator: 'in',
        value: 'desktop, tablet',
      },
    ],
  },
  {
    id: 'aud-high-intent',
    name: 'High-intent pricing visitors',
    description:
      'Returning visitors on pricing journeys with desktop or tablet traffic.',
    size: 7420,
    lastUpdated: '2026-03-15',
    rules: [
      {
        id: 'rule-high-intent-returning',
        field: 'isReturningUser',
        operator: 'equals',
        value: 'true',
      },
      {
        id: 'rule-high-intent-page',
        field: 'pageUrl',
        operator: 'contains',
        value: '/pricing',
      },
      {
        id: 'rule-high-intent-device',
        field: 'device',
        operator: 'in',
        value: 'desktop, tablet',
      },
    ],
  },
  {
    id: 'aud-enterprise-evaluators',
    name: 'Enterprise evaluators',
    description:
      'Enterprise buyers evaluating signup flows from core North America markets.',
    size: 2180,
    lastUpdated: '2026-03-14',
    rules: [
      {
        id: 'rule-enterprise-country',
        field: 'country',
        operator: 'in',
        value: 'United States, Canada',
      },
      {
        id: 'rule-enterprise-page',
        field: 'pageUrl',
        operator: 'contains',
        value: '/signup',
      },
      {
        id: 'rule-enterprise-device',
        field: 'device',
        operator: 'notEquals',
        value: 'mobile',
      },
    ],
  },
]
