interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  isDanger?: boolean
}

export function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmLabel = 'Confirmar', 
  cancelLabel = 'Cancelar',
  isDanger = false
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="settings-card" style={{
        width: '400px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        animation: 'slideUp 0.3s ease-out'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{isDanger ? '⚠️' : '❓'}</div>
        <h2 style={{ margin: '0 0 12px', fontSize: '1.5rem' }}>{title}</h2>
        <p className="muted" style={{ marginBottom: '32px', lineHeight: '1.6' }}>{message}</p>
        
        <div className="row" style={{ gap: '12px' }}>
          <button 
            className="btn secondary" 
            style={{ flex: 1, height: '48px' }} 
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button 
            className={`btn ${isDanger ? 'error' : ''}`} 
            style={{ 
              flex: 1, 
              height: '48px',
              background: isDanger ? 'var(--error)' : 'var(--primary)',
              color: '#fff'
            }} 
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
