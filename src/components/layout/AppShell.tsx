import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
  productName?: string
  subtitle?: string
  primaryActions?: ReactNode
  overline?: string
}

export function AppShell({
  children,
  productName = 'Personalization Workbench',
  subtitle =
    'Review experiments, audiences, and outcomes from one frontend-only MVP view.',
  primaryActions,
  overline = 'Experimentation admin',
}: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-copy">
          <p className="app-shell__eyebrow">{overline}</p>
          <h1>{productName}</h1>
          <p className="app-shell__subtitle">{subtitle}</p>
        </div>
        <div className="app-shell__actions">
          {primaryActions ?? (
            <>
              <span className="badge badge--neutral">Frontend only</span>
              <button className="button button--primary" type="button">
                New experiment
              </button>
            </>
          )}
        </div>
      </header>
      <main className="app-shell__content">{children}</main>
    </div>
  )
}
