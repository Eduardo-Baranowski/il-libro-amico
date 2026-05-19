import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renderiza título e descrição', () => {
    render(
      <EmptyState title="Nada aqui" description="Tente outro filtro" />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Nada aqui')
    expect(screen.getByText('Tente outro filtro')).toBeInTheDocument()
  })

  it('renderiza link de ação quando actionTo informado', () => {
    render(
      <MemoryRouter>
        <EmptyState title="Vazio" actionLabel="Ver loja" actionTo="/livros" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Ver loja' })).toHaveAttribute('href', '/livros')
  })
})
