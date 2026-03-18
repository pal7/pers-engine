export const workbenchTabs = [
  'Overview',
  'Experiments',
  'Builder',
  'Audiences',
  'Results',
  'Simulator',
] as const

export type WorkbenchTab = (typeof workbenchTabs)[number]
