export const workbenchTabs = [
  'Overview',
  'Experiments',
  'Builder',
  'Audiences',
  'Results',
] as const

export type WorkbenchTab = (typeof workbenchTabs)[number]
