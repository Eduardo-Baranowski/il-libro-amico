type LoadingStateProps = {
  label?: string
  variant?: 'inline' | 'block' | 'skeleton-grid'
  count?: number
}

export function LoadingState({ label = 'Carregando…', variant = 'block', count = 6 }: LoadingStateProps) {
  if (variant === 'skeleton-grid') {
    return (
      <div className="ui-skeleton-grid" role="status" aria-live="polite" aria-busy="true" aria-label={label}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="ui-skeleton-card" aria-hidden="true" />
        ))}
      </div>
    )
  }

  return (
    <div className={`ui-loading ui-loading--${variant}`} role="status" aria-live="polite" aria-busy="true">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
