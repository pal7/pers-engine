import type { WorkbenchTab } from '../../lib/workbench'

interface WorkbenchTabsProps {
  activeTab: WorkbenchTab
  onTabChange: (tab: WorkbenchTab) => void
  tabs: readonly WorkbenchTab[]
}

export function WorkbenchTabs({
  activeTab,
  onTabChange,
  tabs,
}: WorkbenchTabsProps) {
  return (
    <nav aria-label="Workbench sections" className="workbench-tabs">
      {tabs.map((tab) => (
        <button
          className={`workbench-tab${tab === activeTab ? ' is-active' : ''}`}
          key={tab}
          onClick={() => onTabChange(tab)}
          type="button"
        >
          {tab}
        </button>
      ))}
    </nav>
  )
}
