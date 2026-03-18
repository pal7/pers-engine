import { formatTargetMatchType } from './experiments'
import {
  getStickyAssignment,
  setStickyAssignment,
} from './stickyAssignments'
import type { Audience, AudienceRule, Experiment, Variant } from '../types/experiment'

export type SimulatorDevice = 'desktop' | 'mobile' | 'tablet'
export type AssignmentState = 'reused' | 'newlyCreated' | 'none'

export interface SimulationRequestContext {
  pageUrl: string
  userKey: string
  sessionId: string
  device: SimulatorDevice
  country: string
  isReturningUser: boolean
}

export interface AudienceRuleMatchResult {
  ruleId: string
  field: AudienceRule['field']
  operator: AudienceRule['operator']
  expectedValue: string
  actualValue: string
  matched: boolean
  note: string
}

export interface AudienceMatchResult {
  matched: boolean
  ruleResults: AudienceRuleMatchResult[]
  notes: string[]
}

export interface SimulationResult {
  matchedExperiment: Experiment | null
  experimentStatus: Experiment['status'] | 'No match'
  audienceMatched: boolean
  assignedVariant: Variant | null
  assignmentState: AssignmentState
  audienceRuleResults: AudienceRuleMatchResult[]
  notes: string[]
}

interface VariantAssignmentResult {
  variant: Variant | null
  assignmentState: AssignmentState
  note: string
}

const defaultBaseUrl = 'https://simulator.local'

export const simulatorDeviceOptions: SimulatorDevice[] = [
  'desktop',
  'mobile',
  'tablet',
]

export const createSimulationRequest = (): SimulationRequestContext => ({
  pageUrl: '/pricing',
  userKey: 'user-2841',
  sessionId: 'sess-54ab',
  device: 'desktop',
  country: 'United States',
  isReturningUser: true,
})

const normalizeValue = (value: string) => value.trim().toLowerCase()
const normalizeIdentity = (userKey: string) => userKey.trim() || 'anonymous'

const parseUrlPath = (value: string) => {
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

const parseListValue = (value: string) =>
  value
    .split(',')
    .map((entry) => normalizeValue(entry))
    .filter(Boolean)

const getAudienceFieldValue = (
  field: AudienceRule['field'],
  request: SimulationRequestContext,
) => {
  switch (field) {
    case 'device':
      return request.device
    case 'country':
      return request.country
    case 'isReturningUser':
      return String(request.isReturningUser)
    case 'pageUrl':
      return parseUrlPath(request.pageUrl)
  }
}

const buildRuleNote = (
  matched: boolean,
  rule: AudienceRule,
  actualValue: string,
) =>
  `${matched ? 'Passed' : 'Failed'} ${rule.field} ${rule.operator} ${rule.value} (actual: ${actualValue}).`

export const evaluateAudienceRule = (
  rule: AudienceRule,
  request: SimulationRequestContext,
): AudienceRuleMatchResult => {
  const actualValue = getAudienceFieldValue(rule.field, request)
  const normalizedActualValue = normalizeValue(actualValue)
  const normalizedExpectedValue = normalizeValue(rule.value)

  const matched = (() => {
    switch (rule.operator) {
      case 'equals':
        return normalizedActualValue === normalizedExpectedValue
      case 'notEquals':
        return normalizedActualValue !== normalizedExpectedValue
      case 'contains':
        return normalizedActualValue.includes(normalizedExpectedValue)
      case 'in':
        return parseListValue(rule.value).includes(normalizedActualValue)
    }
  })()

  return {
    ruleId: rule.id,
    field: rule.field,
    operator: rule.operator,
    expectedValue: rule.value,
    actualValue,
    matched,
    note: buildRuleNote(matched, rule, actualValue),
  }
}

export const evaluateAudienceMatch = (
  audience: Audience,
  request: SimulationRequestContext,
): AudienceMatchResult => {
  const ruleResults = audience.rules.map((rule) => evaluateAudienceRule(rule, request))
  const matched = ruleResults.every((result) => result.matched)

  return {
    matched,
    ruleResults,
    notes: [
      `Evaluated audience ${audience.name} with AND logic across ${ruleResults.length} rule${ruleResults.length === 1 ? '' : 's'}.`,
      ...ruleResults.map((result) => result.note),
    ],
  }
}

const matchesTargetUrl = (experiment: Experiment, request: SimulationRequestContext) => {
  const requestPath = parseUrlPath(request.pageUrl)
  const targetPath = parseUrlPath(experiment.targetUrlPattern)

  return experiment.targetMatchType === 'exact'
    ? requestPath === targetPath
    : requestPath.startsWith(targetPath)
}

const hashValue = (value: string) => {
  let hash = 0

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return hash
}

const pickWeightedVariant = (experiment: Experiment, userKey: string) => {
  const identitySeed = `${normalizeIdentity(userKey)}|${experiment.id}`
  const bucket = hashValue(identitySeed) % 100
  let cumulativeAllocation = 0

  for (const variant of experiment.variants) {
    cumulativeAllocation += variant.allocation

    if (bucket < cumulativeAllocation) {
      return variant
    }
  }

  return experiment.variants[experiment.variants.length - 1] ?? null
}

const assignStickyVariant = (
  experiment: Experiment,
  userKey: string,
): VariantAssignmentResult => {
  if (experiment.variants.length === 0) {
    return {
      variant: null,
      assignmentState: 'none',
      note: 'No variants are configured for this experiment.',
    }
  }

  const normalizedUserKey = normalizeIdentity(userKey)
  const storedVariantId = getStickyAssignment(experiment.id, normalizedUserKey)

  if (storedVariantId) {
    const storedVariant = experiment.variants.find(({ id }) => id === storedVariantId)

    if (storedVariant) {
      return {
        variant: storedVariant,
        assignmentState: 'reused',
        note: `Reused stored assignment for ${normalizedUserKey}.`,
      }
    }
  }

  const selectedVariant = pickWeightedVariant(experiment, normalizedUserKey)

  if (!selectedVariant) {
    return {
      variant: null,
      assignmentState: 'none',
      note: 'No variants are available for assignment.',
    }
  }

  setStickyAssignment(experiment.id, normalizedUserKey, selectedVariant.id)

  return {
    variant: selectedVariant,
    assignmentState: 'newlyCreated',
    note: `Created and stored a new assignment for ${normalizedUserKey}.`,
  }
}

export const formatAssignmentState = (assignmentState: AssignmentState) => {
  switch (assignmentState) {
    case 'reused':
      return 'Reused'
    case 'newlyCreated':
      return 'Newly created'
    case 'none':
      return 'Not assigned'
  }
}

export const simulateExperimentDecision = (
  experiments: Experiment[],
  audiences: Audience[],
  request: SimulationRequestContext,
): SimulationResult => {
  const runningExperiments = experiments.filter(
    (experiment) => experiment.status === 'Running',
  )

  if (runningExperiments.length === 0) {
    return {
      matchedExperiment: null,
      experimentStatus: 'No match',
      audienceMatched: false,
      assignedVariant: null,
      assignmentState: 'none',
      audienceRuleResults: [],
      notes: ['No running experiments are available to evaluate.'],
    }
  }

  const targetMatches = runningExperiments.filter((experiment) =>
    matchesTargetUrl(experiment, request),
  )

  if (targetMatches.length === 0) {
    return {
      matchedExperiment: null,
      experimentStatus: 'No match',
      audienceMatched: false,
      assignedVariant: null,
      assignmentState: 'none',
      audienceRuleResults: [],
      notes: [
        `No running experiment matched ${parseUrlPath(request.pageUrl)}.`,
        'The simulator only evaluates experiments with status Running.',
      ],
    }
  }

  const failedAudienceEvaluations: Array<{
    experiment: Experiment
    audienceRuleResults: AudienceRuleMatchResult[]
    notes: string[]
  }> = []

  for (const experiment of targetMatches) {
    const audience = audiences.find(({ id }) => id === experiment.audienceId)

    if (!audience) {
      failedAudienceEvaluations.push({
        experiment,
        audienceRuleResults: [],
        notes: ['Audience definition was not found for this experiment.'],
      })
      continue
    }

    const audienceEvaluation = evaluateAudienceMatch(audience, request)

    if (!audienceEvaluation.matched) {
      failedAudienceEvaluations.push({
        experiment,
        audienceRuleResults: audienceEvaluation.ruleResults,
        notes: audienceEvaluation.notes,
      })
      continue
    }

    const assignment = assignStickyVariant(experiment, request.userKey)

    return {
      matchedExperiment: experiment,
      experimentStatus: experiment.status,
      audienceMatched: true,
      assignedVariant: assignment.variant,
      assignmentState: assignment.assignmentState,
      audienceRuleResults: audienceEvaluation.ruleResults,
      notes: [
        `Matched ${experiment.name} on ${formatTargetMatchType(
          experiment.targetMatchType,
        )} targeting for ${experiment.targetUrlPattern}.`,
        ...audienceEvaluation.notes,
        assignment.note,
      ],
    }
  }

  const fallbackEvaluation = failedAudienceEvaluations[0]

  return {
    matchedExperiment: fallbackEvaluation?.experiment ?? targetMatches[0],
    experimentStatus: fallbackEvaluation?.experiment.status ?? targetMatches[0].status,
    audienceMatched: false,
    assignedVariant: null,
    assignmentState: 'none',
    audienceRuleResults: fallbackEvaluation?.audienceRuleResults ?? [],
    notes: [
      `Target URL matched ${targetMatches.length} running experiment${targetMatches.length === 1 ? '' : 's'}, but no audience fully qualified.`,
      ...(fallbackEvaluation?.notes ?? []),
    ],
  }
}
