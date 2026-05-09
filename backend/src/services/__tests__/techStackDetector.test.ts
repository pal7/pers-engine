import { describe, expect, it } from 'vitest'
import { detectTechStack } from '../techStackDetector'

// ── helpers ──────────────────────────────────────────────────────────────────

function scriptSrc(url: string) {
  return `<html><head><script src="${url}"></script></head><body></body></html>`
}

function inlineScript(code: string) {
  return `<html><head><script>${code}</script></head><body></body></html>`
}

function names(html: string) {
  return detectTechStack(html).map((t) => t.name)
}

function byName(html: string, name: string) {
  return detectTechStack(html).find((t) => t.name === name)
}

// ── empty / blank ─────────────────────────────────────────────────────────────

describe('empty input', () => {
  it('returns empty array for empty string', () => {
    expect(detectTechStack('')).toEqual([])
  })

  it('returns empty array for plain text with no scripts', () => {
    expect(detectTechStack('<html><body><p>hello</p></body></html>')).toEqual([])
  })
})

// ── A/B testing ───────────────────────────────────────────────────────────────

describe('A/B testing tools', () => {
  it('detects Optimizely via script src', () => {
    expect(names(scriptSrc('https://cdn.optimizely.com/js/12345.js'))).toContain('Optimizely')
  })

  it('detects Optimizely via window.optimizely inline', () => {
    expect(names(inlineScript('window.optimizely = window.optimizely || []'))).toContain('Optimizely')
  })

  it('detects VWO via script src', () => {
    expect(names(scriptSrc('https://dev.visualwebsiteoptimizer.com/lib/vendor.js'))).toContain('VWO')
  })

  it('detects VWO via window._vwo inline', () => {
    expect(names(inlineScript('window._vwo_code = { fn: function(){} }'))).toContain('VWO')
  })

  it('detects AB Tasty via script src', () => {
    expect(names(scriptSrc('https://try.abtasty.com/abc123.js'))).toContain('AB Tasty')
  })

  it('detects LaunchDarkly via script src', () => {
    expect(names(scriptSrc('https://app.launchdarkly.com/sdk/client.js'))).toContain('LaunchDarkly')
  })

  it('detects Adobe Target via at.js script src', () => {
    expect(names(scriptSrc('https://assets.example.com/at.js?v=2'))).toContain('Adobe Target')
  })

  it('detects Adobe Target via tt.omtrdc.net in html', () => {
    const html = '<html><body><img src="https://company.tt.omtrdc.net/m2/pixel"></body></html>'
    expect(names(html)).toContain('Adobe Target')
  })

  it('detects Statsig via script src', () => {
    expect(names(scriptSrc('https://cdn.statsig.com/sdk.js'))).toContain('Statsig')
  })

  it('detects Split.io via script src', () => {
    expect(names(scriptSrc('https://cdn.split.io/sdk/split.js'))).toContain('Split.io')
  })
})

// ── Analytics ─────────────────────────────────────────────────────────────────

describe('analytics tools', () => {
  it('detects Google Analytics 4 via gtag with G- ID in html', () => {
    const html = '<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>'
    expect(names(html)).toContain('Google Analytics 4')
  })

  it('detects GA4 via gtag config call in inline script', () => {
    const html = inlineScript("gtag('config', 'G-ABC123')")
    expect(names(html)).toContain('Google Analytics 4')
  })

  it('detects Universal Analytics via UA- ID in html', () => {
    const html = '<script async src="https://www.googletagmanager.com/gtag/js?id=UA-12345-1"></script>'
    expect(names(html)).toContain('Google Analytics (Universal)')
  })

  it('detects Mixpanel via script src', () => {
    expect(names(scriptSrc('https://cdn.mixpanel.com/libs/mixpanel-2-latest.min.js'))).toContain('Mixpanel')
  })

  it('detects Mixpanel via window.mixpanel inline', () => {
    expect(names(inlineScript('window.mixpanel = { track: function(){} }'))).toContain('Mixpanel')
  })

  it('detects Amplitude via script src', () => {
    expect(names(scriptSrc('https://cdn.amplitude.com/libs/analytics-browser-2.0.0-min.js.gz'))).toContain('Amplitude')
  })

  it('detects Heap via heap.io script src', () => {
    expect(names(scriptSrc('https://cdn.heapanalytics.com/js/heap-1234.js'))).toContain('Heap')
  })

  it('detects FullStory via script src', () => {
    expect(names(scriptSrc('https://edge.fullstory.com/s/fs.js'))).toContain('FullStory')
  })

  it('detects Pendo via window.pendo inline', () => {
    expect(names(inlineScript('window.pendo = { initialize: function(){} }'))).toContain('Pendo')
  })

  it('detects PostHog via script src', () => {
    expect(names(scriptSrc('https://app.posthog.com/static/array.js'))).toContain('PostHog')
  })
})

// ── Tag managers ──────────────────────────────────────────────────────────────

describe('tag managers', () => {
  it('detects Google Tag Manager via script src', () => {
    expect(names(scriptSrc('https://www.googletagmanager.com/gtm.js?id=GTM-XXXX'))).toContain('Google Tag Manager')
  })

  it('detects GTM via noscript iframe in html', () => {
    const html = '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXX"></iframe></noscript>'
    expect(names(html)).toContain('Google Tag Manager')
  })

  it('detects GTM via window.dataLayer inline', () => {
    expect(names(inlineScript('window.dataLayer = window.dataLayer || []'))).toContain('Google Tag Manager')
  })

  it('detects Adobe Launch via assets.adobedtm.com src', () => {
    expect(names(scriptSrc('https://assets.adobedtm.com/launch-ENxxxxxxxx.min.js'))).toContain('Adobe Launch')
  })

  it('detects Tealium iQ via tiqcdn.com src', () => {
    expect(names(scriptSrc('https://tags.tiqcdn.com/utag/mycompany/main/prod/utag.js'))).toContain('Tealium iQ')
  })
})

// ── CDP ───────────────────────────────────────────────────────────────────────

describe('CDP tools', () => {
  it('detects Segment via cdn.segment.com script src', () => {
    expect(names(scriptSrc('https://cdn.segment.com/analytics.js/v1/abc123/analytics.min.js'))).toContain('Segment')
  })

  it('detects Segment via window.analytics inline', () => {
    expect(names(inlineScript('window.analytics = { load: function(){} }'))).toContain('Segment')
  })

  it('detects mParticle via script src', () => {
    expect(names(scriptSrc('https://jssdkcdns.mparticle.com/js/v2/mparticle.js'))).toContain('mParticle')
  })

  it('detects Tealium AudienceStream via tealiumiq.com src', () => {
    expect(names(scriptSrc('https://collect.tealiumiq.com/event'))).toContain('Tealium AudienceStream')
  })
})

// ── Ecommerce ─────────────────────────────────────────────────────────────────

describe('ecommerce platforms', () => {
  it('detects Shopify via cdn.shopify.com in html', () => {
    const html = '<link rel="stylesheet" href="https://cdn.shopify.com/s/files/1/shop.css">'
    expect(names(html)).toContain('Shopify')
  })

  it('detects Shopify via window.Shopify inline', () => {
    expect(names(inlineScript('window.Shopify = { shop: "mystore.myshopify.com" }'))).toContain('Shopify')
  })

  it('detects WooCommerce via plugin path in html', () => {
    const html = '<link href="/wp-content/plugins/woocommerce/assets/css/woocommerce.css" rel="stylesheet">'
    expect(names(html)).toContain('WooCommerce')
  })

  it('detects Salesforce Commerce Cloud via demandware.net in html', () => {
    const html = '<img src="https://www.demandware.net/s/Sites/images/logo.png">'
    expect(names(html)).toContain('Salesforce Commerce Cloud')
  })

  it('detects BigCommerce via bigcommerce.com in html', () => {
    const html = '<script src="https://www.bigcommerce.com/checkout/loader.js"></script>'
    expect(names(html)).toContain('BigCommerce')
  })
})

// ── CMS & platforms ───────────────────────────────────────────────────────────

describe('CMS and platforms', () => {
  it('detects WordPress via /wp-content/ path', () => {
    const html = '<link rel="stylesheet" href="/wp-content/themes/mytheme/style.css">'
    expect(names(html)).toContain('WordPress')
  })

  it('detects WordPress via /wp-includes/ path', () => {
    const html = '<script src="/wp-includes/js/jquery/jquery.min.js"></script>'
    expect(names(html)).toContain('WordPress')
  })

  it('detects Drupal via /sites/default/files/ path', () => {
    const html = '<img src="/sites/default/files/logo.png">'
    expect(names(html)).toContain('Drupal')
  })

  it('detects Drupal via window.Drupal inline', () => {
    expect(names(inlineScript('window.Drupal = { behaviors: {} }'))).toContain('Drupal')
  })

  it('detects Contentful via contentful.com reference', () => {
    const html = '<meta name="generator" content="contentful.com">'
    expect(names(html)).toContain('Contentful')
  })
})

// ── Frontend frameworks ───────────────────────────────────────────────────────

describe('frontend frameworks', () => {
  it('detects Next.js via _next/static path', () => {
    const html = '<script src="/_next/static/chunks/main.js"></script>'
    expect(names(html)).toContain('Next.js')
  })

  it('detects Next.js via window.__NEXT_DATA__ inline', () => {
    expect(names(inlineScript('window.__NEXT_DATA__ = {"props":{},"page":"/"}')))
      .toContain('Next.js')
  })

  it('detects Vue.js via data-v- scoped attribute', () => {
    const html = '<div data-v-7ba5bd90 class="container"></div>'
    expect(names(html)).toContain('Vue.js')
  })

  it('detects Angular via ng-version attribute', () => {
    const html = '<app-root ng-version="15.2.0"></app-root>'
    expect(names(html)).toContain('Angular')
  })

  it('detects Nuxt.js via __nuxt__ in html', () => {
    const html = '<div id="__nuxt__"></div>'
    expect(names(html)).toContain('Nuxt.js')
  })
})

// ── Heatmap & session replay ──────────────────────────────────────────────────

describe('heatmap and session replay', () => {
  it('detects Hotjar via script src', () => {
    expect(names(scriptSrc('https://static.hotjar.com/c/hotjar-12345.js?sv=6'))).toContain('Hotjar')
  })

  it('detects Hotjar via window.hj inline', () => {
    expect(names(inlineScript('window.hj = window.hj || function(){}')))
      .toContain('Hotjar')
  })

  it('detects Microsoft Clarity via clarity.ms src', () => {
    expect(names(scriptSrc('https://www.clarity.ms/tag/abc123'))).toContain('Microsoft Clarity')
  })

  it('detects Microsoft Clarity via window.clarity inline', () => {
    expect(names(inlineScript('window.clarity = window.clarity || function(){}')))
      .toContain('Microsoft Clarity')
  })

  it('detects LogRocket via script src', () => {
    expect(names(scriptSrc('https://cdn.logrocket.io/LogRocket.min.js'))).toContain('LogRocket')
  })

  it('detects Mouseflow via script src', () => {
    expect(names(scriptSrc('https://cdn.mouseflow.com/projects/abc.js'))).toContain('Mouseflow')
  })
})

// ── Result shape ──────────────────────────────────────────────────────────────

describe('result shape', () => {
  it('returns correct category for Shopify', () => {
    const result = byName(inlineScript('window.Shopify = {}'), 'Shopify')
    expect(result?.category).toBe('ecommerce')
  })

  it('returns definitive confidence for Next.js _next/static match', () => {
    const result = byName('<script src="/_next/static/chunks/main.js"></script>', 'Next.js')
    expect(result?.confidence).toBe('definitive')
  })

  it('returns likely confidence for window.hj Hotjar match', () => {
    const result = byName(inlineScript('window.hj = function(){}'), 'Hotjar')
    expect(result?.confidence).toBe('likely')
  })

  it('includes a non-empty evidence string', () => {
    const result = byName(scriptSrc('https://cdn.segment.com/analytics.js/v1/key/analytics.min.js'), 'Segment')
    expect(result?.evidence).toBeTruthy()
  })
})

// ── Priority: first matching check wins per rule ──────────────────────────────

describe('single result per tool', () => {
  it('returns only one entry for Optimizely even when both src and inline match', () => {
    const html = `
      <script src="https://cdn.optimizely.com/js/123.js"></script>
      <script>window.optimizely = []</script>
    `
    const results = detectTechStack(html).filter((t) => t.name === 'Optimizely')
    expect(results).toHaveLength(1)
  })

  it('returns only one entry for GTM even when src, noscript, and inline all match', () => {
    const html = `
      <script src="https://www.googletagmanager.com/gtm.js?id=GTM-X"></script>
      <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-X"></iframe></noscript>
      <script>window.dataLayer = []</script>
    `
    const results = detectTechStack(html).filter((t) => t.name === 'Google Tag Manager')
    expect(results).toHaveLength(1)
  })
})

// ── Multiple tools on same page ───────────────────────────────────────────────

describe('multiple tools on one page', () => {
  it('detects GTM + GA4 + Hotjar together', () => {
    const html = `
      <script src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"></script>
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script>
      <script src="https://static.hotjar.com/c/hotjar-999.js"></script>
    `
    const detected = names(html)
    expect(detected).toContain('Google Tag Manager')
    expect(detected).toContain('Google Analytics 4')
    expect(detected).toContain('Hotjar')
  })

  it('detects Shopify + Klaviyo together', () => {
    const html = `
      <script>window.Shopify = { shop: 'test.myshopify.com' }</script>
      <script src="https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=ABC"></script>
    `
    const detected = names(html)
    expect(detected).toContain('Shopify')
    expect(detected).toContain('Klaviyo')
  })
})

// ── No false positives ────────────────────────────────────────────────────────

describe('no false positives', () => {
  it('does not detect Hotjar from text in a paragraph', () => {
    const html = '<p>We use hotjar.com for analytics</p>'
    expect(names(html)).not.toContain('Hotjar')
  })

  it('does not detect GTM from a URL mentioned in body text', () => {
    const html = '<p>Visit googletagmanager.com/gtm.js for docs</p>'
    expect(names(html)).not.toContain('Google Tag Manager')
  })

  it('does not detect Segment from window.analytics mentioned in a comment', () => {
    // Only inline script content is checked — body text is not
    const html = '<p>window.analytics is used by Segment</p>'
    expect(names(html)).not.toContain('Segment')
  })
})
