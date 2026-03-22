import type {
  AnalysisExperiment,
  AnalysisIssue,
  AnalysisResponse,
} from '../types/analysis'

export type SiteType = 'ecommerce' | 'travel' | 'saas'

export function getAnalysisContent(
  siteType: SiteType,
  hostname: string,
): Omit<AnalysisResponse, 'analyzedUrl'> {
  const contentBySiteType: Record<
    SiteType,
    {
      summary: string
      issues: AnalysisIssue[]
      experiments: AnalysisExperiment[]
    }
  > = {
    ecommerce: {
      summary: `${hostname} likely has strong shopper intent, but the experience may still lose momentum around product discovery, product-page conversion cues, and cart progression. The clearest phase 1 opportunity is to make buying actions feel more visible and lower-friction across the browse-to-cart journey.`,
      issues: [
        {
          id: 'product-discoverability',
          title: 'Product discovery may require too much scanning',
          severity: 'high',
          detail:
            'Category and product-listing experiences can make it harder for shoppers to quickly narrow into the right item, especially when assortment is broad.',
          impact:
            'This can reduce product-page visits and slow the path to high-intent actions.',
          confidence: 'High',
        },
        {
          id: 'cta-visibility',
          title: 'Primary purchase actions may not stay visible enough',
          severity: 'medium',
          detail:
            'Key add-to-cart actions can fall below the fold or compete with surrounding content once shoppers begin comparing options.',
          impact:
            'Lower CTA visibility can suppress add-to-cart rate on high-intent product views.',
          confidence: 'Medium',
        },
        {
          id: 'cart-friction',
          title: 'Cart progression may introduce avoidable friction',
          severity: 'medium',
          detail:
            'Shoppers may hit uncertainty around shipping, timing, or next-step clarity as they move from item selection toward checkout.',
          impact:
            'Extra friction in the cart journey can create drop-off before purchase intent converts.',
          confidence: 'Medium',
        },
      ],
      experiments: [
        {
          id: 'sticky-add-to-cart',
          name: 'Test a sticky add-to-cart module on product pages',
          hypothesis:
            'If the primary purchase action remains visible while shoppers scroll, more visitors will convert product interest into cart activity.',
          expectedImpact: 'Increase add-to-cart rate on mobile and long-form product pages.',
          audience: 'High-intent shoppers viewing product detail pages',
          confidence: 'High',
        },
        {
          id: 'product-page-cta',
          name: 'Refine product page CTA hierarchy and supporting copy',
          hypothesis:
            'If the main CTA is more prominent and paired with clearer supporting cues, shoppers will feel more confident taking the next step.',
          expectedImpact: 'Lift clicks on primary purchase actions from product pages.',
          audience: 'Visitors comparing products before committing to cart',
          confidence: 'Medium',
        },
        {
          id: 'urgency-badges',
          name: 'Introduce urgency or availability badges near buying actions',
          hypothesis:
            'If urgency is communicated in a credible and timely way, more shoppers will act before leaving the page.',
          expectedImpact: 'Improve conversion momentum for in-stock, high-demand products.',
          audience: 'Return visitors and shoppers with strong purchase intent',
          confidence: 'Medium',
        },
      ],
    },
    travel: {
      summary: `${hostname} likely serves visitors with high planning intent, but confidence can break down when search clarity, filtering, and trust cues are not strong enough at key decision points. The best early opportunity is to reduce uncertainty while helping visitors evaluate options faster.`,
      issues: [
        {
          id: 'trust-signals',
          title: 'Trust signals may not appear strongly enough during evaluation',
          severity: 'high',
          detail:
            'Visitors comparing stays or listings often need reassurance around credibility, flexibility, and quality before they continue.',
          impact:
            'Weak trust reinforcement can reduce booking confidence and increase abandonment.',
          confidence: 'High',
        },
        {
          id: 'search-clarity',
          title: 'Search flow may not clearly guide the next action',
          severity: 'medium',
          detail:
            'Search inputs, destination context, or availability details may not create enough clarity for visitors who are still refining intent.',
          impact:
            'Unclear search guidance can slow option discovery and reduce qualified engagement.',
          confidence: 'Medium',
        },
        {
          id: 'filter-usability',
          title: 'Filters may create comparison friction',
          severity: 'medium',
          detail:
            'When filtering tools are hard to interpret or too buried, visitors can struggle to narrow results to options that fit their needs.',
          impact:
            'This can increase time-to-decision and cause drop-off before booking or inquiry.',
          confidence: 'Medium',
        },
      ],
      experiments: [
        {
          id: 'trust-badges',
          name: 'Test trust badges near listing selection and booking actions',
          hypothesis:
            'If credibility and reassurance cues are surfaced earlier, more visitors will continue into deeper booking intent.',
          expectedImpact: 'Increase progression from listing view to booking action.',
          audience: 'First-time visitors evaluating unfamiliar listings or hosts',
          confidence: 'High',
        },
        {
          id: 'map-visibility',
          name: 'Increase map visibility during search and comparison',
          hypothesis:
            'If location context stays more accessible while browsing options, visitors will evaluate listings faster and with more confidence.',
          expectedImpact: 'Improve search engagement and listing quality clicks.',
          audience: 'Visitors comparing multiple properties within one destination',
          confidence: 'Medium',
        },
        {
          id: 'price-clarity',
          name: 'Clarify full-price context earlier in the journey',
          hypothesis:
            'If pricing is easier to understand upfront, fewer users will drop out when they reach booking consideration.',
          expectedImpact: 'Reduce abandonment caused by pricing surprise or uncertainty.',
          audience: 'Price-sensitive visitors evaluating several booking options',
          confidence: 'Medium',
        },
      ],
    },
    saas: {
      summary: `${hostname} has a usable acquisition path, but the page likely leaves conversion lift on the table through broad messaging, unclear next-step hierarchy, and unnecessary form friction. The best phase 1 opportunity is to sharpen the value proposition and make the primary conversion path feel easier to commit to.`,
      issues: [
        {
          id: 'weak-headline',
          title: 'Headline may not communicate value fast enough',
          severity: 'high',
          detail:
            'Primary messaging can feel broad or category-level instead of making the outcome immediately obvious for high-intent visitors.',
          impact:
            'Visitors may hesitate or bounce before understanding why the offer is relevant to them.',
          confidence: 'High',
        },
        {
          id: 'cta-clarity',
          title: 'Primary CTA path may not feel clear enough',
          severity: 'medium',
          detail:
            'Calls to action may compete with secondary options or lack the context needed to make the next step feel compelling.',
          impact:
            'This can reduce click-through from qualified visitors who need stronger directional guidance.',
          confidence: 'Medium',
        },
        {
          id: 'form-friction',
          title: 'Form experience may ask for too much too early',
          severity: 'medium',
          detail:
            'Longer forms or higher-friction lead capture patterns can create unnecessary resistance before intent is fully established.',
          impact:
            'This can lower completion rate and reduce the volume of qualified conversions.',
          confidence: 'Medium',
        },
      ],
      experiments: [
        {
          id: 'hero-copy',
          name: 'Test sharper hero copy tied to one core outcome',
          hypothesis:
            'If the headline communicates one concrete benefit more clearly, more visitors will continue into the primary conversion path.',
          expectedImpact: 'Lift engagement from net-new traffic landing above the fold.',
          audience: 'High-intent visitors arriving on commercial landing pages',
          confidence: 'High',
        },
        {
          id: 'cta-placement',
          name: 'Test stronger CTA placement and supporting proof',
          hypothesis:
            'If the primary CTA is easier to find and framed with trust cues, more visitors will choose the next step sooner.',
          expectedImpact: 'Increase click-through on the main conversion action.',
          audience: 'Visitors evaluating whether the product fits their use case',
          confidence: 'Medium',
        },
        {
          id: 'form-simplification',
          name: 'Reduce form fields in the first conversion step',
          hypothesis:
            'If early conversion forms ask for less information, more qualified visitors will complete the initial action.',
          expectedImpact: 'Improve form starts and completion rate for top-of-funnel conversion.',
          audience: 'Demo, trial, and contact-intent visitors',
          confidence: 'Medium',
        },
      ],
    },
  }

  return contentBySiteType[siteType]
}
