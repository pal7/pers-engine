import { useState } from 'react'

interface VariantDraft {
  id: string
  name: string
  headline: string
  ctaText: string
  theme: string
  notes: string
}

const initialVariants: VariantDraft[] = [
  {
    id: 'control',
    name: 'Control',
    headline: 'Personalization that scales',
    ctaText: 'Book a demo',
    theme: 'Core brand',
    notes: 'Baseline message used for current production traffic.',
  },
  {
    id: 'variant-a',
    name: 'Variant A',
    headline: 'Personalization for ecommerce teams',
    ctaText: 'See ecommerce results',
    theme: 'Ecommerce spotlight',
    notes: 'Use stronger retail proof points for acquisition traffic.',
  },
]

export function VariantBuilder() {
  const [variants, setVariants] = useState<VariantDraft[]>(initialVariants)

  const updateVariant = (
    variantId: string,
    field: keyof Omit<VariantDraft, 'id' | 'name'>,
    value: string,
  ) => {
    setVariants((current) =>
      current.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              [field]: value,
            }
          : variant,
      ),
    )
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>Variant builder</h2>
          <p>Draft treatment config for backend-stored experience definitions.</p>
        </div>
      </div>

      <div className="variant-builder__notice">
        These fields represent content and treatment config only. Rendering logic stays out of the frontend MVP.
      </div>

      <div className="variant-builder__grid">
        {variants.map((variant) => (
          <article className="variant-builder__card" key={variant.id}>
            <div className="variant-builder__card-header">
              <strong>{variant.name}</strong>
              <span className="badge badge--neutral">Config draft</span>
            </div>

            <div className="form-grid">
              <label className="field field--full">
                <span>Headline</span>
                <input
                  onChange={(event) =>
                    updateVariant(variant.id, 'headline', event.target.value)
                  }
                  type="text"
                  value={variant.headline}
                />
              </label>

              <label className="field field--full">
                <span>CTA text</span>
                <input
                  onChange={(event) =>
                    updateVariant(variant.id, 'ctaText', event.target.value)
                  }
                  type="text"
                  value={variant.ctaText}
                />
              </label>

              <label className="field field--full">
                <span>Theme / treatment</span>
                <input
                  onChange={(event) =>
                    updateVariant(variant.id, 'theme', event.target.value)
                  }
                  type="text"
                  value={variant.theme}
                />
              </label>

              <label className="field field--full">
                <span>Notes</span>
                <textarea
                  onChange={(event) =>
                    updateVariant(variant.id, 'notes', event.target.value)
                  }
                  rows={4}
                  value={variant.notes}
                />
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
