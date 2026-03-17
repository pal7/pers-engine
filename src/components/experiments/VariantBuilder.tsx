import type { ExperimentDraftVariant } from '../../types/experiment'

interface VariantBuilderProps {
  variants: ExperimentDraftVariant[]
  onVariantChange: (
    variantId: string,
    field: keyof Omit<ExperimentDraftVariant, 'id' | 'name'>,
    value: string,
  ) => void
}

export function VariantBuilder({
  variants,
  onVariantChange,
}: VariantBuilderProps) {
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
                    onVariantChange(variant.id, 'headline', event.target.value)
                  }
                  type="text"
                  value={variant.headline}
                />
              </label>

              <label className="field field--full">
                <span>CTA text</span>
                <input
                  onChange={(event) =>
                    onVariantChange(variant.id, 'ctaText', event.target.value)
                  }
                  type="text"
                  value={variant.ctaText}
                />
              </label>

              <label className="field field--full">
                <span>Theme / treatment</span>
                <input
                  onChange={(event) =>
                    onVariantChange(variant.id, 'theme', event.target.value)
                  }
                  type="text"
                  value={variant.theme}
                />
              </label>

              <label className="field field--full">
                <span>Notes</span>
                <textarea
                  onChange={(event) =>
                    onVariantChange(variant.id, 'notes', event.target.value)
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
