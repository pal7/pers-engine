import { getVariantWeightDistribution } from '../../lib/variantWeights'
import type { ExperimentDraftVariant } from '../../types/experiment'

interface VariantBuilderProps {
  variants: ExperimentDraftVariant[]
  onVariantChange: (
    variantId: string,
    field: keyof Omit<ExperimentDraftVariant, 'id' | 'name'>,
    value: string | number,
  ) => void
}

export function VariantBuilder({
  variants,
  onVariantChange,
}: VariantBuilderProps) {
  const weightDistribution = getVariantWeightDistribution(variants)

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

      {!weightDistribution.isValid ? (
        <div className="variant-builder__warning">{weightDistribution.note}</div>
      ) : null}

      <div className="variant-builder__grid">
        {variants.map((variant) => (
          <article className="variant-builder__card" key={variant.id}>
            <div className="variant-builder__card-header">
              <strong>{variant.name}</strong>
              <span className="badge badge--neutral">Config draft</span>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Weight</span>
                <input
                  min="0"
                  onChange={(event) =>
                    onVariantChange(
                      variant.id,
                      'weight',
                      Number(event.target.value) || 0,
                    )
                  }
                  type="number"
                  value={variant.weight}
                />
              </label>

              <div className="field">
                <span>Normalized share</span>
                <input
                  disabled
                  type="text"
                  value={`${Math.round(
                    (weightDistribution.normalizedWeights[variants.indexOf(variant)] ?? 0) * 100,
                  )}%`}
                />
              </div>

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
