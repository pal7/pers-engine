import type { Experiment } from '../types/experiment'

const defaultBaseUrl = 'https://simulator.local'

export const parseUrlPath = (value: string) => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return '/'
  }

  try {
    return new URL(trimmedValue, defaultBaseUrl).pathname || '/'
  } catch {
    return trimmedValue.startsWith('/') ? trimmedValue : `/${trimmedValue}`
  }
}

export const matchesExperimentTarget = (
  experiment: Pick<Experiment, 'targetMatchType' | 'targetUrlPattern'>,
  pageUrl: string,
) => {
  const requestPath = parseUrlPath(pageUrl)
  const targetPath = parseUrlPath(experiment.targetUrlPattern)

  return experiment.targetMatchType === 'exact'
    ? requestPath === targetPath
    : requestPath.startsWith(targetPath)
}
