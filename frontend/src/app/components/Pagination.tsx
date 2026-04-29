import React from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading?: boolean
}

export function Pagination({ currentPage, totalPages, onPageChange, isLoading }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="row" style={{ justifyContent: 'center', gap: '16px', marginTop: '32px', alignItems: 'center' }}>
      <button 
        className="btn secondary" 
        style={{ padding: '8px 16px', minWidth: '100px', borderRadius: '12px', fontSize: '14px' }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || isLoading}
      >
        ← Anterior
      </button>
      
      <div className="stack" style={{ alignItems: 'center' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>Página {currentPage} de {totalPages}</span>
      </div>

      <button 
        className="btn secondary" 
        style={{ padding: '8px 16px', minWidth: '100px', borderRadius: '12px', fontSize: '14px' }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || isLoading}
      >
        Próxima →
      </button>
    </div>
  )
}
