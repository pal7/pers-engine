interface WeightLike {
  weight: number
}

export interface VariantWeightDistribution {
  isValid: boolean
  note: string
  normalizedWeights: number[]
}

export const getVariantWeightDistribution = <T extends WeightLike>(
  variants: T[],
): VariantWeightDistribution => {
  if (variants.length === 0) {
    return {
      isValid: false,
      note: 'No variants are available for weighted assignment.',
      normalizedWeights: [],
    }
  }

  const hasInvalidWeight = variants.some(
    ({ weight }) => !Number.isFinite(weight) || weight <= 0,
  )

  if (hasInvalidWeight) {
    return {
      isValid: false,
      note: 'Variant weights are invalid. Falling back to an even distribution.',
      normalizedWeights: Array.from({ length: variants.length }, () => 1 / variants.length),
    }
  }

  const totalWeight = variants.reduce((total, variant) => total + variant.weight, 0)

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return {
      isValid: false,
      note: 'Variant weights could not be normalized. Falling back to an even distribution.',
      normalizedWeights: Array.from({ length: variants.length }, () => 1 / variants.length),
    }
  }

  return {
    isValid: true,
    note: 'Variant weights are valid.',
    normalizedWeights: variants.map((variant) => variant.weight / totalWeight),
  }
}

export const buildWeightedAllocations = (
  totalTraffic: number,
  normalizedWeights: number[],
) => {
  if (normalizedWeights.length === 0) {
    return []
  }

  const safeTotalTraffic = Math.max(0, Math.floor(totalTraffic))
  const rawAllocations = normalizedWeights.map((weight) => weight * safeTotalTraffic)
  const allocations = rawAllocations.map((allocation) => Math.floor(allocation))
  let remainder = safeTotalTraffic - allocations.reduce((sum, value) => sum + value, 0)

  const rankedFractions = rawAllocations
    .map((allocation, index) => ({
      index,
      fraction: allocation - Math.floor(allocation),
    }))
    .sort((left, right) => right.fraction - left.fraction)

  for (const { index } of rankedFractions) {
    if (remainder <= 0) {
      break
    }

    allocations[index] += 1
    remainder -= 1
  }

  return allocations
}
