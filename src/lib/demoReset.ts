import { experimentsStorageKey } from './experiments'
import { experimentEventsStorageKey } from './simulatorEvents'
import { stickyAssignmentsStorageKey } from './stickyAssignments'

const demoStorageKeys = [
  experimentsStorageKey,
  stickyAssignmentsStorageKey,
  experimentEventsStorageKey,
] as const

export const clearDemoData = () => {
  if (typeof window === 'undefined') {
    return
  }

  demoStorageKeys.forEach((storageKey) => {
    window.localStorage.removeItem(storageKey)
  })
}
