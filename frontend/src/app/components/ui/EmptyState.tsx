import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type EmptyStateProps = {
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
  onAction?: () => void
  icon?: ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  icon = '📭',
}: EmptyStateProps) {
  return (
    <div className="ui-empty" role="status" aria-live="polite">
      <span className="ui-empty__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="ui-empty__title">{title}</p>
      {description ? <p className="ui-empty__desc muted">{description}</p> : null}
      {actionLabel && actionTo ? (
        <Link to={actionTo} className="btn">
          {actionLabel}
        </Link>
      ) : null}
      {actionLabel && onAction && !actionTo ? (
        <button type="button" className="btn" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
