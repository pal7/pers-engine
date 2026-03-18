import type {
  ExperimentEvent,
  ExperimentEventType,
  Variant,
} from '../types/experiment'

export const experimentEventsStorageKey = 'personalization-admin-events'

interface CreateExperimentEventInput {
  experimentId: string
  variant: Variant
  userKey: string
  sessionId: string
  eventType: ExperimentEventType
  pageUrl: string
}

interface EventContext {
  experimentId: string
  variantId: string
  userKey: string
  sessionId: string
}

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

const normalizeIdentity = (value: string) => value.trim() || 'anonymous'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isString = (value: unknown): value is string => typeof value === 'string'

const isExperimentEventType = (value: unknown): value is ExperimentEventType =>
  value === 'impression' || value === 'conversion'

const isExperimentEvent = (value: unknown): value is ExperimentEvent =>
  isObject(value) &&
  isString(value.id) &&
  isString(value.experimentId) &&
  isString(value.variantId) &&
  isString(value.variantName) &&
  isString(value.userKey) &&
  isString(value.sessionId) &&
  isExperimentEventType(value.eventType) &&
  isString(value.pageUrl) &&
  isString(value.timestamp)

export const loadExperimentEvents = (): ExperimentEvent[] => {
  const storage = getStorage()

  if (!storage) {
    return []
  }

  const storedEvents = storage.getItem(experimentEventsStorageKey)

  if (!storedEvents) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(storedEvents)

    return Array.isArray(parsed) ? parsed.filter(isExperimentEvent) : []
  } catch {
    return []
  }
}

export const saveExperimentEvents = (events: ExperimentEvent[]) => {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.setItem(experimentEventsStorageKey, JSON.stringify(events))
}

export const createExperimentEvent = ({
  experimentId,
  variant,
  userKey,
  sessionId,
  eventType,
  pageUrl,
}: CreateExperimentEventInput): ExperimentEvent => {
  const normalizedUserKey = normalizeIdentity(userKey)
  const normalizedSessionId = normalizeIdentity(sessionId)
  const timestamp = new Date().toISOString()

  return {
    id: `${eventType}-${experimentId}-${variant.id}-${normalizedSessionId}-${timestamp}`,
    experimentId,
    variantId: variant.id,
    variantName: variant.name,
    userKey: normalizedUserKey,
    sessionId: normalizedSessionId,
    eventType,
    pageUrl,
    timestamp,
  }
}

export const getExperimentEventsForContext = (
  events: ExperimentEvent[],
  context: EventContext,
) => {
  const normalizedUserKey = normalizeIdentity(context.userKey)
  const normalizedSessionId = normalizeIdentity(context.sessionId)

  return events.filter(
    (event) =>
      event.experimentId === context.experimentId &&
      event.variantId === context.variantId &&
      event.userKey === normalizedUserKey &&
      event.sessionId === normalizedSessionId,
  )
}

export const hasTrackedImpression = (
  events: ExperimentEvent[],
  context: EventContext,
) =>
  getExperimentEventsForContext(events, context).some(
    (event) => event.eventType === 'impression',
  )
