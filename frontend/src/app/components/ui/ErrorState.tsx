import type { ApiError } from '../../../lib/api'

type ErrorStateProps = {
  title?: string
  message?: string
  error?: ApiError | Error | null
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = 'Não foi possível carregar',
  message,
  error,
  onRetry,
  retryLabel = 'Tentar novamente',
}: ErrorStateProps) {
  let fromError: string | undefined
  if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
    fromError = String((error as ApiError).message)
  } else if (error instanceof Error) {
    fromError = error.message
  }
  const detail = message || fromError || 'Verifique sua conexão e tente de novo.'

  return (
    <div className="ui-error" role="alert" aria-live="assertive">
      <p className="ui-error__title">{title}</p>
      <p className="ui-error__message muted">{detail}</p>
      {onRetry ? (
        <button type="button" className="btn secondary" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}
