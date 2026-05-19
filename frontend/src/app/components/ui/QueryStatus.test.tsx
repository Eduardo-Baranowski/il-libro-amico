import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QueryStatus } from './QueryStatus'

describe('QueryStatus', () => {
  it('mostra loading quando isLoading', () => {
    render(
      <QueryStatus isLoading isError={false} isEmpty={false}>
        <p>conteúdo</p>
      </QueryStatus>,
    )
    expect(screen.getByRole('status', { busy: true })).toBeInTheDocument()
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument()
  })

  it('mostra children quando dados disponíveis', () => {
    render(
      <QueryStatus isLoading={false} isError={false} isEmpty={false}>
        <p>conteúdo</p>
      </QueryStatus>,
    )
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
  })

  it('mostra empty quando isEmpty', () => {
    render(
      <QueryStatus isLoading={false} isError={false} isEmpty emptyTitle="Sem itens">
        <p>conteúdo</p>
      </QueryStatus>,
    )
    expect(screen.getByText('Sem itens')).toBeInTheDocument()
  })
})
