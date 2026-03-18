export type StickyAssignmentMap = Record<string, string>

export const stickyAssignmentsStorageKey =
  'personalization-admin-sticky-assignments'

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

export const buildStickyAssignmentKey = (
  experimentId: string,
  userKey: string,
) => `${experimentId}:${userKey.trim() || 'anonymous'}`

export const loadStickyAssignments = (): StickyAssignmentMap => {
  const storage = getStorage()

  if (!storage) {
    return {}
  }

  const storedAssignments = storage.getItem(stickyAssignmentsStorageKey)

  if (!storedAssignments) {
    return {}
  }

  try {
    const parsed: unknown = JSON.parse(storedAssignments)

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.entries(parsed as Record<string, unknown>).reduce<StickyAssignmentMap>(
        (assignments, [key, value]) => {
          if (typeof value === 'string') {
            assignments[key] = value
          }

          return assignments
        },
        {},
      )
    }
  } catch {
    return {}
  }

  return {}
}

export const saveStickyAssignments = (assignments: StickyAssignmentMap) => {
  const storage = getStorage()

  if (!storage) {
    return
  }

  storage.setItem(stickyAssignmentsStorageKey, JSON.stringify(assignments))
}

export const getStickyAssignment = (
  experimentId: string,
  userKey: string,
): string | null => {
  const assignments = loadStickyAssignments()
  const assignmentKey = buildStickyAssignmentKey(experimentId, userKey)

  return assignments[assignmentKey] ?? null
}

export const setStickyAssignment = (
  experimentId: string,
  userKey: string,
  variantId: string,
) => {
  const assignments = loadStickyAssignments()
  const assignmentKey = buildStickyAssignmentKey(experimentId, userKey)

  saveStickyAssignments({
    ...assignments,
    [assignmentKey]: variantId,
  })
}
