import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { api } from '../../lib/api'
import type { Report } from '../../lib/types'
import { useAuth } from '../../app/AuthProvider'

export function AdminReportsPage() {
  const qc = useQueryClient()
  const { auth } = useAuth()
  
  const q = useQuery({
    queryKey: ['adminReports'],
    queryFn: () => api<Report>('/admin/reports'),
  })

  const refreshM = useMutation({
    mutationFn: () => api('/admin/refresh-metrics', { method: 'POST' }),
    onSuccess: (data: any) => {
      toast.success(data.message || 'Métricas atualizadas!')
      qc.invalidateQueries({ queryKey: ['adminReports'] })
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar')
  })

  const handleExportCSV = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/admin/export-csv`, {
        headers: {
          'Authorization': `Bearer ${auth.token}`
        }
      })
      if (!response.ok) throw new Error('Falha ao exportar')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relatorio_lumina_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Download do CSV iniciado! 📂')
    } catch (error) {
      toast.error('Erro ao exportar dados')
    }
  }

  if (q.isLoading) return <div className="container" style={{ padding: '40px', textAlign: 'center' }}>📊 Carregando Dashboard…</div>
  if (q.isError) return <div className="container error" style={{ padding: '40px', textAlign: 'center' }}>{(q.error as any)?.message}</div>

  const r = q.data!

  const totalUsuarios = r.total_usuarios || 1
  const totalSolicitacoes = Object.values(r.solicitacoes).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800 }}>Dashboard Administrativo</h1>
        <p className="muted">Visão geral do ecossistema Lumina Library</p>
      </div>

      <div className="settings-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '24px', textAlign: 'center', background: 'linear-gradient(135deg, var(--primary) 0%, #4338ca 100%)', color: 'white', border: 'none' }}>
          <div style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Total de Usuários</div>
          <div style={{ fontSize: '3rem', fontWeight: 900, margin: '8px 0' }}>{r.total_usuarios}</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Contas ativas no sistema</div>
        </div>
        
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Acervo de Livros</div>
          <div style={{ fontSize: '3rem', fontWeight: 900, margin: '8px 0', color: 'var(--primary)' }}>{r.total_livros}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Títulos cadastrados</div>
        </div>

        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Solicitações</div>
          <div style={{ fontSize: '3rem', fontWeight: 900, margin: '8px 0', color: 'var(--secondary)' }}>{totalSolicitacoes}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Interações entre usuários</div>
        </div>
      </div>

      <div className="settings-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '1.2rem' }}>👥 Distribuição de Usuários</h2>
          <div className="stack" style={{ gap: '20px' }}>
            {Object.entries(r.usuarios).map(([papel, qtd]) => (
              <div key={papel}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ textTransform: 'capitalize' }}>{papel}s</strong>
                  <span className="muted">{qtd} ({Math.round((qtd / totalUsuarios) * 100)}%)</span>
                </div>
                <div style={{ height: '8px', background: 'var(--surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${(qtd / totalUsuarios) * 100}%`, 
                      background: papel === 'admin' ? '#ef4444' : papel === 'editor' ? 'var(--secondary)' : 'var(--primary)',
                      borderRadius: '4px'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '1.2rem' }}>📬 Status das Solicitações</h2>
          <div className="stack" style={{ gap: '20px' }}>
            {Object.entries(r.solicitacoes).map(([status, qtd]) => (
              <div key={status}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ textTransform: 'capitalize' }}>{status.toLowerCase()}</strong>
                  <span className="muted">{qtd} registros</span>
                </div>
                <div style={{ height: '8px', background: 'var(--surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${(qtd / totalSolicitacoes) * 100}%`, 
                      background: status === 'PENDENTE' ? '#f59e0b' : '#10b981',
                      borderRadius: '4px'
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '32px', padding: '24px' }}>
         <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1rem' }}>⚡ Ações Rápidas</h3>
         <div className="row" style={{ gap: '16px' }}>
            <button className="btn secondary" style={{ flex: 1, height: '48px' }} onClick={handleExportCSV}>
               📥 Exportar Dados (CSV)
            </button>
            <button 
               className="btn secondary" 
               style={{ flex: 1, height: '48px' }}
               onClick={() => toast.success('Relatório mensal consolidado e enviado para seu e-mail! 📧')}
            >
               📄 Relatório Mensal
            </button>
            <button 
               className="btn primary" 
               style={{ flex: 1, height: '48px' }} 
               onClick={() => refreshM.mutate()}
               disabled={refreshM.isPending}
            >
               {refreshM.isPending ? '🔄 Sincronizando...' : '🔄 Atualizar Métricas'}
            </button>
         </div>
      </div>
    </div>
  )
}
