import { formatTargetMatchType } from './experiments'
import type { Audience, AudienceRule, Experiment, Variant } from '../types/experiment'

export type SimulatorDevice = 'desktop' | 'mobile' | 'tablet'

export interface SimulationRequestContext {
  pageUrl: string
  userKey: string
  sessionId: string
  device: SimulatorDevice
  country: string
  returningUser: boolean
}

export interface SimulationResult {
  matchedExperiment: Experiment | null
  experimentStatus: Experiment['status'] | 'No match'
  audienceMatched: boolean
  assignedVariant: Variant | null
  notes: string[]
}

interface AudienceRuleEvaluation {
  matched: boolean
  skipped: boolean
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
  returningUser: true,
})

const normalizeValue = (value: string) => value.trim().toLowerCase()

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

const derivePageGroup = (pageUrl: string) => {
  const path = parseUrlPath(pageUrl).toLowerCase()

  if (path === '/') {
    return 'Homepage'
  }

  if (path.startsWith('/pricing')) {
    return 'Pricing'
  }

  if (path.startsWith('/product')) {
    return 'Product'
  }

  if (path.startsWith('/solutions')) {
    return 'Solutions'
  }

  if (path.startsWith('/security')) {
    return 'Security'
  }

  if (path.startsWith('/integrations')) {
    return 'Integrations'
  }

  if (path.startsWith('/signup') || path.includes('demo')) {
    return 'Demo request'
  }

  return 'Other'
}

const parseListValue = (value: string) =>
  value
    .split(',')
    .map((entry) => normalizeValue(entry))
    .filter(Boolean)

const evaluateVisitorTypeRule = (
  rule: AudienceRule,
  request: SimulationRequestContext,
): AudienceRuleEvaluation => {
  const visitorType = request.returningUser ? 'returning' : 'new'
  const expectedValue = normalizeValue(rule.value)

  if (rule.operator === 'is') {
    const matched = visitorType === expectedValue

    return {
      matched,
      skipped: false,
      note: `Visitor type ${matched ? 'matched' : 'did not match'} ${rule.value}.`,
    }
  }

  if (rule.operator === 'is not') {
    const matched = visitorType !== expectedValue

    return {
      matched,
      skipped: false,
      note: `Visitor type ${matched ? 'passed' : 'failed'} ${rule.operator} ${rule.value}.`,
    }
  }

  return {
    matched: true,
    skipped: true,
    note: `Skipped visitor type rule with unsupported operator ${rule.operator}.`,
  }
}

const evaluateRegionRule = (
  rule: AudienceRule,
  request: SimulationRequestContext,
): AudienceRuleEvaluation => {
  const country = normalizeValue(request.country)
  const expectedCountries = parseListValue(rule.value)

  if (rule.operator === 'is one of') {
    const matched = expectedCountries.includes(country)

    return {
      matched,
      skipped: false,
      note: `Country ${matched ? 'matched' : 'did not match'} the allowed region list.`,
    }
  }

  if (rule.operator === 'is') {
    const matched = country === normalizeValue(rule.value)

    return {
      matched,
      skipped: false,
      note: `Country ${matched ? 'matched' : 'did not match'} ${rule.value}.`,
    }
  }

  if (rule.operator === 'is not') {
    const matched = country !== normalizeValue(rule.value)

    return {
      matched,
      skipped: false,
      note: `Country ${matched ? 'passed' : 'failed'} ${rule.operator} ${rule.value}.`,
    }
  }

  return {
    matched: true,
    skipped: true,
    note: `Skipped region rule with unsupported operator ${rule.operator}.`,
  }
}

const evaluatePageGroupRule = (
  rule: AudienceRule,
  request: SimulationRequestContext,
): AudienceRuleEvaluation => {
  const pageGroup = normalizeValue(derivePageGroup(request.pageUrl))

  if (rule.operator === 'is one of') {
    const matched = parseListValue(rule.value).includes(pageGroup)

    return {
      matched,
      skipped: false,
      note: `Page group resolved to ${derivePageGroup(request.pageUrl)} and ${matched ? 'matched' : 'did not match'} the audience rule.`,
    }
  }

  if (rule.operator === 'is') {
    const matched = pageGroup === normalizeValue(rule.value)

    return {
      matched,
      skipped: false,
      note: `Page group ${matched ? 'matched' : 'did not match'} ${rule.value}.`,
    }
  }

  return {
    matched: true,
    skipped: true,
    note: `Skipped page group rule with unsupported operator ${rule.operator}.`,
  }
}

const evaluateAudienceRule = (
  rule: AudienceRule,
  request: SimulationRequestContext,
): AudienceRuleEvaluation => {
  switch (normalizeValue(rule.field)) {
    case 'visitor type':
      return evaluateVisitorTypeRule(rule, request)
    case 'region':
      return evaluateRegionRule(rule, request)
    case 'page group':
      return evaluatePageGroupRule(rule, request)
    default:
      return {
        matched: true,
        skipped: true,
        note: `Skipped ${rule.field} rule because the simulator has no ${rule.field.toLowerCase()} input.`,
      }
  }
}

const evaluateAudience = (audience: Audience, request: SimulationRequestContext) => {
  const ruleEvaluations = audience.rules.map((rule) => evaluateAudienceRule(rule, request))
  const matched = ruleEvaluations.every((evaluation) => evaluation.matched)
  const skippedRules = ruleEvaluations.filter((evaluation) => evaluation.skipped).length

  return {
    matched,
    notes: [
      `Evaluated audience ${audience.name}.`,
      ...ruleEvaluations.map((evaluation) => evaluation.note),
      skippedRules > 0
        ? `${skippedRules} rule${skippedRules === 1 ? '' : 's'} used simulator assumptions.`
        : 'All audience rules were evaluated from the provided request context.',
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

const assignVariant = (experiment: Experiment, request: SimulationRequestContext) => {
  if (experiment.variants.length === 0) {
    return {
      variant: null,
      note: 'No variants are configured for this experiment.',
    }
  }

  const identitySeed = `${request.userKey.trim()}|${request.sessionId.trim()}|${experiment.id}`
  const bucket = hashValue(identitySeed || `anonymous|${experiment.id}`) % 100
  let cumulativeAllocation = 0

  for (const variant of experiment.variants) {
    cumulativeAllocation += variant.allocation

    if (bucket < cumulativeAllocation) {
      return {
        variant,
        note: `Assigned ${variant.name} from traffic bucket ${bucket + 1} using stable request identity hashing.`,
      }
    }
  }

  const fallbackVariant = experiment.variants[experiment.variants.length - 1]

  return {
    variant: fallbackVariant,
    note: `Assigned ${fallbackVariant.name} after falling back to the final allocation bucket.`,
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
      notes: [
        `No running experiment matched ${parseUrlPath(request.pageUrl)}.`,
        'The simulator only evaluates experiments with status Running.',
      ],
    }
  }

  const failedAudienceEvaluations: Array<{ experiment: Experiment; notes: string[] }> = []

  for (const experiment of targetMatches) {
    const audience = audiences.find(({ id }) => id === experiment.audienceId)

    if (!audience) {
      failedAudienceEvaluations.push({
        experiment,
        notes: ['Audience definition was not found for this experiment.'],
      })
      continue
    }

    const audienceEvaluation = evaluateAudience(audience, request)

    if (!audienceEvaluation.matched) {
      failedAudienceEvaluations.push({
        experiment,
        notes: audienceEvaluation.notes,
      })
      continue
    }

    const assignment = assignVariant(experiment, request)

    return {
      matchedExperiment: experiment,
      experimentStatus: experiment.status,
      audienceMatched: true,
      assignedVariant: assignment.variant,
      notes: [
        `Matched ${experiment.name} on ${formatTargetMatchType(
          experiment.targetMatchType,
        )} targeting for ${experiment.targetUrlPattern}.`,
        ...audienceEvaluation.notes,
        `Request device recorded as ${request.device}.`,
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
    notes: [
      `Target URL matched ${targetMatches.length} running experiment${targetMatches.length === 1 ? '' : 's'}, but no audience fully qualified.`,
      ...(fallbackEvaluation?.notes ?? []),
    ],
  }
}
