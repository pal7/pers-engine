import type {
  DetectedTech,
  TechStackCategory,
  TechStackConfidence,
} from '../../../shared/analysis.ts'

type CheckTarget = 'scriptSrc' | 'inline' | 'html'

interface DetectionCheck {
  target: CheckTarget
  pattern: RegExp
  confidence: TechStackConfidence
  evidence: string
}

interface DetectionRule {
  name: string
  category: TechStackCategory
  checks: DetectionCheck[]
}

const DETECTION_RULES: DetectionRule[] = [
  // ── A/B TESTING & EXPERIMENTATION ──────────────────────────────────────────

  {
    name: 'Adobe Target',
    category: 'ab-testing',
    checks: [
      { target: 'scriptSrc', pattern: /\/at\.js(\?|$)/i, confidence: 'definitive', evidence: 'Found script src containing at.js (Adobe Target)' },
      { target: 'html', pattern: /tt\.omtrdc\.net/i, confidence: 'definitive', evidence: 'Found reference to tt.omtrdc.net (Adobe Target edge network)' },
      { target: 'inline', pattern: /adobe\.target|mboxCreate|mboxDefine|window\.mbox/i, confidence: 'likely', evidence: 'Found Adobe Target global (mbox / adobe.target) in inline script' },
    ],
  },
  {
    name: 'Optimizely',
    category: 'ab-testing',
    checks: [
      { target: 'scriptSrc', pattern: /optimizely\.com/i, confidence: 'definitive', evidence: 'Found script src containing cdn.optimizely.com' },
      { target: 'inline', pattern: /window\.optimizely|window\.optly/i, confidence: 'likely', evidence: 'Found window.optimizely or window.optly in inline script' },
    ],
  },
  {
    name: 'VWO',
    category: 'ab-testing',
    checks: [
      { target: 'scriptSrc', pattern: /vwo\.com|visualwebsiteoptimizer/i, confidence: 'definitive', evidence: 'Found script src from vwo.com' },
      { target: 'inline', pattern: /window\._vwo|vwoCode/i, confidence: 'likely', evidence: 'Found window._vwo or vwoCode in inline script' },
    ],
  },
  {
    name: 'Google Optimize',
    category: 'ab-testing',
    checks: [
      { target: 'scriptSrc', pattern: /googleoptimize\.com/i, confidence: 'definitive', evidence: 'Found script src from googleoptimize.com' },
      { target: 'html', pattern: /googleoptimize\.com/i, confidence: 'definitive', evidence: 'Found reference to googleoptimize.com' },
    ],
  },
  {
    name: 'AB Tasty',
    category: 'ab-testing',
    checks: [
      { target: 'scriptSrc', pattern: /abtasty\.com/i, confidence: 'definitive', evidence: 'Found script src from abtasty.com' },
      { target: 'inline', pattern: /window\.ABTasty/i, confidence: 'likely', evidence: 'Found window.ABTasty in inline script' },
    ],
  },
  {
    name: 'Kameleoon',
    category: 'ab-testing',
    checks: [
      { target: 'scriptSrc', pattern: /kameleoon\.com/i, confidence: 'definitive', evidence: 'Found script src from kameleoon.com' },
      { target: 'inline', pattern: /window\.Kameleoon/i, confidence: 'likely', evidence: 'Found window.Kameleoon in inline script' },
    ],
  },
  {
    name: 'Statsig',
    category: 'ab-testing',
    checks: [
      { target: 'scriptSrc', pattern: /statsig\.com/i, confidence: 'definitive', evidence: 'Found script src from statsig.com' },
      { target: 'inline', pattern: /window\.statsig/i, confidence: 'likely', evidence: 'Found window.statsig in inline script' },
    ],
  },
  {
    name: 'LaunchDarkly',
    category: 'ab-testing',
    checks: [
      { target: 'scriptSrc', pattern: /launchdarkly\.com/i, confidence: 'definitive', evidence: 'Found script src from launchdarkly.com' },
      { target: 'inline', pattern: /window\.LDClient/i, confidence: 'likely', evidence: 'Found window.LDClient in inline script' },
    ],
  },
  {
    name: 'Split.io',
    category: 'ab-testing',
    checks: [
      { target: 'scriptSrc', pattern: /split\.io/i, confidence: 'definitive', evidence: 'Found script src from split.io' },
      { target: 'inline', pattern: /window\.splitio/i, confidence: 'likely', evidence: 'Found window.splitio in inline script' },
    ],
  },
  {
    name: 'Unleash',
    category: 'ab-testing',
    checks: [
      { target: 'scriptSrc', pattern: /unleash/i, confidence: 'likely', evidence: 'Found script src referencing Unleash' },
      { target: 'inline', pattern: /window\.unleash/i, confidence: 'likely', evidence: 'Found window.unleash in inline script' },
    ],
  },
  {
    name: 'Eppo',
    category: 'ab-testing',
    checks: [
      { target: 'scriptSrc', pattern: /geteppo\.com/i, confidence: 'definitive', evidence: 'Found script src from geteppo.com' },
      { target: 'html', pattern: /geteppo\.com/i, confidence: 'definitive', evidence: 'Found reference to geteppo.com' },
    ],
  },

  // ── PERSONALISATION ─────────────────────────────────────────────────────────

  {
    name: 'Adobe Experience Platform',
    category: 'personalisation',
    checks: [
      { target: 'scriptSrc', pattern: /alloy\.js/i, confidence: 'definitive', evidence: 'Found script src for alloy.js (Adobe Experience Platform Web SDK)' },
      { target: 'html', pattern: /experience\.adobe\.com/i, confidence: 'definitive', evidence: 'Found reference to experience.adobe.com (Adobe Experience Platform)' },
    ],
  },
  {
    name: 'Salesforce Marketing Cloud',
    category: 'personalisation',
    checks: [
      { target: 'scriptSrc', pattern: /evergage\.com/i, confidence: 'definitive', evidence: 'Found script src from evergage.com (Salesforce Interaction Studio)' },
      { target: 'html', pattern: /exacttarget\.com/i, confidence: 'definitive', evidence: 'Found reference to exacttarget.com (Salesforce Marketing Cloud)' },
      { target: 'inline', pattern: /window\.Evergage/i, confidence: 'likely', evidence: 'Found window.Evergage (Salesforce Interaction Studio) in inline script' },
    ],
  },
  {
    name: 'Bloomreach',
    category: 'personalisation',
    checks: [
      { target: 'scriptSrc', pattern: /bloomreach\.com/i, confidence: 'definitive', evidence: 'Found script src from bloomreach.com' },
      { target: 'inline', pattern: /window\.BrTrk/i, confidence: 'likely', evidence: 'Found window.BrTrk (Bloomreach) in inline script' },
    ],
  },
  {
    name: 'Braze',
    category: 'personalisation',
    checks: [
      { target: 'scriptSrc', pattern: /braze\.com/i, confidence: 'definitive', evidence: 'Found script src from braze.com' },
      { target: 'inline', pattern: /window\.appboy/i, confidence: 'likely', evidence: 'Found window.appboy (Braze legacy SDK) in inline script' },
    ],
  },
  {
    name: 'Klaviyo',
    category: 'personalisation',
    checks: [
      { target: 'scriptSrc', pattern: /klaviyo\.com/i, confidence: 'definitive', evidence: 'Found script src from klaviyo.com' },
      { target: 'inline', pattern: /window\._learnq/i, confidence: 'likely', evidence: 'Found window._learnq (Klaviyo) in inline script' },
    ],
  },
  {
    name: 'Dynamic Yield',
    category: 'personalisation',
    checks: [
      { target: 'scriptSrc', pattern: /dynamicyield\.com/i, confidence: 'definitive', evidence: 'Found script src from dynamicyield.com' },
      { target: 'inline', pattern: /window\.DY\b/i, confidence: 'likely', evidence: 'Found window.DY (Dynamic Yield) in inline script' },
    ],
  },
  {
    name: 'Monetate',
    category: 'personalisation',
    checks: [
      { target: 'scriptSrc', pattern: /monetate\.com/i, confidence: 'definitive', evidence: 'Found script src from monetate.com' },
      { target: 'inline', pattern: /window\.monetateQ/i, confidence: 'likely', evidence: 'Found window.monetateQ (Monetate) in inline script' },
    ],
  },

  // ── CDP ──────────────────────────────────────────────────────────────────────

  {
    name: 'Segment',
    category: 'cdp',
    checks: [
      { target: 'scriptSrc', pattern: /cdn\.segment\.com/i, confidence: 'definitive', evidence: 'Found script src from cdn.segment.com' },
      { target: 'inline', pattern: /analytics\.js|window\.analytics\s*=/i, confidence: 'likely', evidence: 'Found Segment analytics.js or window.analytics in inline script' },
    ],
  },
  {
    name: 'mParticle',
    category: 'cdp',
    checks: [
      { target: 'scriptSrc', pattern: /mparticle\.com/i, confidence: 'definitive', evidence: 'Found script src from mparticle.com' },
      { target: 'inline', pattern: /window\.mParticle/i, confidence: 'likely', evidence: 'Found window.mParticle in inline script' },
    ],
  },
  {
    name: 'Tealium AudienceStream',
    category: 'cdp',
    checks: [
      { target: 'scriptSrc', pattern: /tealiumiq\.com/i, confidence: 'definitive', evidence: 'Found script src from tealiumiq.com (Tealium AudienceStream)' },
      { target: 'inline', pattern: /window\.utag\b/i, confidence: 'likely', evidence: 'Found window.utag (Tealium) in inline script' },
    ],
  },
  {
    name: 'Salesforce CDP',
    category: 'cdp',
    checks: [
      { target: 'html', pattern: /salesforce\.com\/cdp/i, confidence: 'definitive', evidence: 'Found reference to salesforce.com/cdp' },
    ],
  },

  // ── ANALYTICS ────────────────────────────────────────────────────────────────

  {
    name: 'Adobe Analytics',
    category: 'analytics',
    checks: [
      { target: 'scriptSrc', pattern: /omtrdc\.net|s_code\.js|AppMeasurement\.js/i, confidence: 'definitive', evidence: 'Found script src for Adobe Analytics (omtrdc.net / s_code.js / AppMeasurement.js)' },
      { target: 'inline', pattern: /AppMeasurement|window\.s\s*=\s*s_gi/i, confidence: 'likely', evidence: 'Found Adobe Analytics AppMeasurement initialisation in inline script' },
    ],
  },
  {
    name: 'Google Analytics 4',
    category: 'analytics',
    checks: [
      { target: 'html', pattern: /gtag\/js\?id=G-/i, confidence: 'definitive', evidence: 'Found gtag.js loaded with GA4 measurement ID (G-)' },
      { target: 'inline', pattern: /gtag\(['"]config['"]\s*,\s*['"]G-/i, confidence: 'definitive', evidence: 'Found gtag config call with GA4 measurement ID in inline script' },
    ],
  },
  {
    name: 'Google Analytics (Universal)',
    category: 'analytics',
    checks: [
      { target: 'html', pattern: /gtag\/js\?id=UA-/i, confidence: 'definitive', evidence: 'Found gtag.js loaded with Universal Analytics measurement ID (UA-)' },
      { target: 'scriptSrc', pattern: /google-analytics\.com\/analytics\.js/i, confidence: 'definitive', evidence: 'Found script src for Universal Analytics analytics.js' },
      { target: 'inline', pattern: /ga\(['"]create['"]\s*,\s*['"]UA-/i, confidence: 'likely', evidence: 'Found ga(create) with UA- measurement ID in inline script' },
    ],
  },
  {
    name: 'Mixpanel',
    category: 'analytics',
    checks: [
      { target: 'scriptSrc', pattern: /mixpanel\.com/i, confidence: 'definitive', evidence: 'Found script src from mixpanel.com' },
      { target: 'inline', pattern: /window\.mixpanel/i, confidence: 'likely', evidence: 'Found window.mixpanel in inline script' },
    ],
  },
  {
    name: 'Amplitude',
    category: 'analytics',
    checks: [
      { target: 'scriptSrc', pattern: /amplitude\.com/i, confidence: 'definitive', evidence: 'Found script src from amplitude.com' },
      { target: 'inline', pattern: /window\.amplitude/i, confidence: 'likely', evidence: 'Found window.amplitude in inline script' },
    ],
  },
  {
    name: 'Heap',
    category: 'analytics',
    checks: [
      { target: 'scriptSrc', pattern: /heap\.io|heapanalytics\.com/i, confidence: 'definitive', evidence: 'Found script src from heap.io' },
      { target: 'inline', pattern: /window\.heap/i, confidence: 'likely', evidence: 'Found window.heap in inline script' },
    ],
  },
  {
    name: 'FullStory',
    category: 'analytics',
    checks: [
      { target: 'scriptSrc', pattern: /fullstory\.com/i, confidence: 'definitive', evidence: 'Found script src from fullstory.com' },
      { target: 'inline', pattern: /window\.FS\b/i, confidence: 'likely', evidence: 'Found window.FS (FullStory) in inline script' },
    ],
  },
  {
    name: 'Pendo',
    category: 'analytics',
    checks: [
      { target: 'scriptSrc', pattern: /pendo\.io/i, confidence: 'definitive', evidence: 'Found script src from pendo.io' },
      { target: 'inline', pattern: /window\.pendo/i, confidence: 'likely', evidence: 'Found window.pendo in inline script' },
    ],
  },
  {
    name: 'PostHog',
    category: 'analytics',
    checks: [
      { target: 'scriptSrc', pattern: /posthog\.com/i, confidence: 'definitive', evidence: 'Found script src from posthog.com' },
      { target: 'inline', pattern: /window\.posthog/i, confidence: 'likely', evidence: 'Found window.posthog in inline script' },
    ],
  },
  {
    name: 'Contentsquare',
    category: 'analytics',
    checks: [
      { target: 'scriptSrc', pattern: /contentsquare\.com/i, confidence: 'definitive', evidence: 'Found script src from contentsquare.com' },
      { target: 'inline', pattern: /window\.CS\b/i, confidence: 'likely', evidence: 'Found window.CS (Contentsquare) in inline script' },
    ],
  },

  // ── TAG MANAGERS ─────────────────────────────────────────────────────────────

  {
    name: 'Adobe Launch',
    category: 'tag-manager',
    checks: [
      { target: 'scriptSrc', pattern: /assets\.adobedtm\.com/i, confidence: 'definitive', evidence: 'Found script src from assets.adobedtm.com (Adobe Launch / DTM)' },
      { target: 'inline', pattern: /window\._satellite/i, confidence: 'likely', evidence: 'Found window._satellite (Adobe Launch) in inline script' },
    ],
  },
  {
    name: 'Google Tag Manager',
    category: 'tag-manager',
    checks: [
      { target: 'scriptSrc', pattern: /googletagmanager\.com\/gtm\.js/i, confidence: 'definitive', evidence: 'Found script src from googletagmanager.com (Google Tag Manager)' },
      { target: 'html', pattern: /googletagmanager\.com\/ns\.html/i, confidence: 'definitive', evidence: 'Found GTM noscript iframe in HTML' },
      { target: 'inline', pattern: /window\.dataLayer\s*=/i, confidence: 'likely', evidence: 'Found window.dataLayer initialisation (GTM) in inline script' },
    ],
  },
  {
    name: 'Tealium iQ',
    category: 'tag-manager',
    checks: [
      { target: 'scriptSrc', pattern: /tags\.tiqcdn\.com/i, confidence: 'definitive', evidence: 'Found script src from tags.tiqcdn.com (Tealium iQ)' },
    ],
  },

  // ── CMS & PLATFORMS ──────────────────────────────────────────────────────────

  {
    name: 'Adobe Experience Manager',
    category: 'cms',
    checks: [
      { target: 'html', pattern: /jcr:content|\/content\/dam\/|cq\.wcm/i, confidence: 'definitive', evidence: 'Found AEM-specific path patterns (jcr:content / /content/dam/ / cq.wcm)' },
      { target: 'html', pattern: /adobeaemcloud\.com/i, confidence: 'definitive', evidence: 'Found reference to adobeaemcloud.com (AEM as a Cloud Service)' },
    ],
  },
  {
    name: 'WordPress',
    category: 'cms',
    checks: [
      { target: 'html', pattern: /\/wp-content\/|\/wp-includes\//i, confidence: 'definitive', evidence: 'Found WordPress-specific paths (/wp-content/ or /wp-includes/)' },
      { target: 'inline', pattern: /window\.wpApiSettings/i, confidence: 'definitive', evidence: 'Found window.wpApiSettings (WordPress REST API) in inline script' },
    ],
  },
  {
    name: 'Drupal',
    category: 'cms',
    checks: [
      { target: 'html', pattern: /\/sites\/default\/files\//i, confidence: 'definitive', evidence: 'Found Drupal-specific path (/sites/default/files/)' },
      { target: 'inline', pattern: /window\.Drupal\b/i, confidence: 'likely', evidence: 'Found window.Drupal in inline script' },
    ],
  },
  {
    name: 'Sitecore',
    category: 'cms',
    checks: [
      { target: 'html', pattern: /sitecore\/shell|sitecore\/content/i, confidence: 'definitive', evidence: 'Found Sitecore-specific paths in HTML' },
      { target: 'inline', pattern: /window\.Sitecore/i, confidence: 'likely', evidence: 'Found window.Sitecore in inline script' },
    ],
  },
  {
    name: 'Contentful',
    category: 'cms',
    checks: [
      { target: 'html', pattern: /contentful\.com/i, confidence: 'definitive', evidence: 'Found reference to contentful.com' },
    ],
  },

  // ── ECOMMERCE ────────────────────────────────────────────────────────────────

  {
    name: 'Shopify',
    category: 'ecommerce',
    checks: [
      { target: 'html', pattern: /cdn\.shopify\.com/i, confidence: 'definitive', evidence: 'Found reference to cdn.shopify.com' },
      { target: 'inline', pattern: /window\.Shopify\b/i, confidence: 'definitive', evidence: 'Found window.Shopify in inline script' },
    ],
  },
  {
    name: 'Salesforce Commerce Cloud',
    category: 'ecommerce',
    checks: [
      { target: 'html', pattern: /demandware\.net|demandware\.edgekey\.net/i, confidence: 'definitive', evidence: 'Found reference to demandware.net (Salesforce Commerce Cloud)' },
      { target: 'inline', pattern: /window\.dw\b/i, confidence: 'likely', evidence: 'Found window.dw (SFCC) in inline script' },
    ],
  },
  {
    name: 'Magento',
    category: 'ecommerce',
    checks: [
      { target: 'html', pattern: /\/mage\/|Mage\.Cookies|Magento_/i, confidence: 'definitive', evidence: 'Found Magento-specific markers (/mage/ paths or Magento_ module references)' },
      { target: 'inline', pattern: /window\.Mage\b/i, confidence: 'likely', evidence: 'Found window.Mage (Magento) in inline script' },
    ],
  },
  {
    name: 'BigCommerce',
    category: 'ecommerce',
    checks: [
      { target: 'html', pattern: /bigcommerce\.com/i, confidence: 'definitive', evidence: 'Found reference to bigcommerce.com' },
    ],
  },
  {
    name: 'WooCommerce',
    category: 'ecommerce',
    checks: [
      { target: 'html', pattern: /\/wp-content\/plugins\/woocommerce\//i, confidence: 'definitive', evidence: 'Found WooCommerce plugin path (/wp-content/plugins/woocommerce/)' },
      { target: 'inline', pattern: /window\.wc_add_to_cart_params/i, confidence: 'definitive', evidence: 'Found window.wc_add_to_cart_params (WooCommerce) in inline script' },
    ],
  },

  // ── FRONTEND FRAMEWORKS ──────────────────────────────────────────────────────

  {
    name: 'Next.js',
    category: 'framework',
    checks: [
      { target: 'html', pattern: /\/_next\/static\//i, confidence: 'definitive', evidence: 'Found _next/static path (Next.js)' },
      { target: 'inline', pattern: /window\.__NEXT_DATA__/i, confidence: 'definitive', evidence: 'Found window.__NEXT_DATA__ in inline script (Next.js)' },
    ],
  },
  {
    name: 'React',
    category: 'framework',
    checks: [
      { target: 'html', pattern: /data-reactroot/i, confidence: 'definitive', evidence: 'Found data-reactroot attribute (React server-side render)' },
      { target: 'inline', pattern: /__REACT_DEVTOOLS_GLOBAL_HOOK__/i, confidence: 'likely', evidence: 'Found React DevTools hook reference in inline script' },
    ],
  },
  {
    name: 'Vue.js',
    category: 'framework',
    checks: [
      { target: 'html', pattern: /data-v-[0-9a-f]{6,}/i, confidence: 'definitive', evidence: 'Found Vue.js scoped CSS attribute markers (data-v-)' },
      { target: 'inline', pattern: /window\.__vue__/i, confidence: 'likely', evidence: 'Found window.__vue__ in inline script' },
    ],
  },
  {
    name: 'Angular',
    category: 'framework',
    checks: [
      { target: 'html', pattern: /ng-version=/i, confidence: 'definitive', evidence: 'Found ng-version attribute (Angular)' },
      { target: 'html', pattern: /ng-app|ng-controller/i, confidence: 'likely', evidence: 'Found ng-app or ng-controller attribute (AngularJS)' },
    ],
  },
  {
    name: 'Nuxt.js',
    category: 'framework',
    checks: [
      { target: 'html', pattern: /__nuxt__|\/_nuxt\//i, confidence: 'definitive', evidence: 'Found Nuxt.js markers (__nuxt__ / _nuxt/ path)' },
      { target: 'inline', pattern: /window\.__NUXT__/i, confidence: 'definitive', evidence: 'Found window.__NUXT__ in inline script (Nuxt.js)' },
    ],
  },

  // ── HEATMAP & SESSION REPLAY ─────────────────────────────────────────────────

  {
    name: 'Hotjar',
    category: 'heatmap',
    checks: [
      { target: 'scriptSrc', pattern: /hotjar\.com/i, confidence: 'definitive', evidence: 'Found script src from hotjar.com' },
      { target: 'inline', pattern: /window\.hj\b/i, confidence: 'likely', evidence: 'Found window.hj (Hotjar) in inline script' },
    ],
  },
  {
    name: 'Microsoft Clarity',
    category: 'heatmap',
    checks: [
      { target: 'scriptSrc', pattern: /clarity\.ms/i, confidence: 'definitive', evidence: 'Found script src from clarity.ms' },
      { target: 'inline', pattern: /window\.clarity\b/i, confidence: 'likely', evidence: 'Found window.clarity in inline script' },
    ],
  },
  {
    name: 'LogRocket',
    category: 'heatmap',
    checks: [
      { target: 'scriptSrc', pattern: /logrocket\.com/i, confidence: 'definitive', evidence: 'Found script src from logrocket.com' },
      { target: 'inline', pattern: /window\.LogRocket/i, confidence: 'likely', evidence: 'Found window.LogRocket in inline script' },
    ],
  },
  {
    name: 'Mouseflow',
    category: 'heatmap',
    checks: [
      { target: 'scriptSrc', pattern: /mouseflow\.com/i, confidence: 'definitive', evidence: 'Found script src from mouseflow.com' },
      { target: 'inline', pattern: /window\.mouseflow/i, confidence: 'likely', evidence: 'Found window.mouseflow in inline script' },
    ],
  },
]

export function detectTechStack(html: string): DetectedTech[] {
  // Extract all script src attribute values (lowercased for matching)
  const scriptSrcText = Array.from(
    html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
    (m) => m[1] ?? '',
  )
    .join(' ')
    .toLowerCase()

  // Extract all inline script text (lowercased for matching)
  const inlineText = Array.from(
    html.matchAll(/<script\b(?:[^>]*(?!src=))*>([\s\S]*?)<\/script>/gi),
    (m) => m[1] ?? '',
  )
    .join('\n')
    .toLowerCase()

  const lowerHtml = html.toLowerCase()

  const contexts: Record<CheckTarget, string> = {
    scriptSrc: scriptSrcText,
    inline: inlineText,
    html: lowerHtml,
  }

  const detected: DetectedTech[] = []

  for (const rule of DETECTION_RULES) {
    for (const check of rule.checks) {
      // Patterns are already case-insensitive via flag, but we run against
      // lowercased strings so the i flag is harmless redundancy.
      if (check.pattern.test(contexts[check.target])) {
        detected.push({
          name: rule.name,
          category: rule.category,
          confidence: check.confidence,
          evidence: check.evidence,
        })
        break // take the highest-priority match for this rule and move on
      }
    }
  }

  return detected
}
