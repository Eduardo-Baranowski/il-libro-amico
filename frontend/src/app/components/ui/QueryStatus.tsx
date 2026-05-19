import type { ReactNode } from 'react'
import type { ApiError } from '../../../lib/api'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { LoadingState } from './LoadingState'

type QueryStatusProps = {
  isLoading: boolean
  isError: boolean
  error?: ApiError | Error | null
  isEmpty?: boolean
  onRetry?: () => void
  loadingLabel?: string
  loadingVariant?: 'inline' | 'block' | 'skeleton-grid'
  emptyTitle?: string
  emptyDescription?: string
  emptyActionLabel?: string
  emptyActionTo?: string
  children: ReactNode
}

export function QueryStatus({
  isLoading,
  isError,
  error,
  isEmpty = false,
  onRetry,
  loadingLabel,
  loadingVariant = 'block',
  emptyTitle = 'Nenhum resultado',
  emptyDescription,
  emptyActionLabel,
  emptyActionTo,
  children,
}: QueryStatusProps) {
  if (isLoading) {
    return <LoadingState label={loadingLabel} variant={loadingVariant} />
  }

  if (isError) {
    return <ErrorState error={error} onRetry={onRetry} />
  }

  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        actionTo={emptyActionTo}
      />
    )
  }

  return <>{children}</>
}
