import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('exibe mensagem de erro e botão de retry', async () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Falha na API" onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Falha na API')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
