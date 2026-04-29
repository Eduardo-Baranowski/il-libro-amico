import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { getUserIdFromToken } from '../../lib/token'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { toast } from 'react-hot-toast'
import type { VisitProfile } from '../../lib/types'
import { ConfirmModal } from '../../app/components/ConfirmModal'

export function SettingsPage() {
  const qc = useQueryClient()
  const { auth, logout } = useAuth()
  const meId = getUserIdFromToken()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  
  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile', meId],
    enabled: Boolean(meId),
    queryFn: () => api<VisitProfile>(`/reader/users/${meId}/visit`),
  })

  // Estados para Informações Pessoais
  const [nome, setNome] = useState('')
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')

  // Estados para Senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')

  // Mutations
  const updateProfileM = useMutation({
    mutationFn: (data: any) => api('/reader/profile', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      toast.success('Perfil atualizado!')
      qc.invalidateQueries({ queryKey: ['myProfile', meId] })
    },
  })

  const updatePhotoM = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData()
      fd.append('imagem', file)
      return api('/reader/profile/photo', { method: 'POST', body: fd })
    },
    onSuccess: () => {
      toast.success('Foto atualizada!')
      qc.invalidateQueries({ queryKey: ['myProfile', meId] })
    },
  })

  const updatePasswordM = useMutation({
    mutationFn: (data: any) => api('/reader/profile/password', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      setSenhaAtual('')
      setNovaSenha('')
      toast.success('Senha alterada com sucesso!')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteAccountM = useMutation({
    mutationFn: () => api('/reader/profile', { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Conta excluída. Sentiremos sua falta!')
      logout()
    },
  })

  if (isLoading) return <div className="container">Carregando configurações...</div>

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileM.mutate({ 
      nome: nome || profile?.user.nome, 
      headline: headline || profile?.user.headline, 
      bio: bio || profile?.user.bio 
    })
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) updatePhotoM.mutate(file)
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900 }}>Gerenciar Conta</h1>
        <p className="muted">Gerencie suas informações pessoais, preferências de segurança e notificações da biblioteca.</p>
      </div>

      <div className="settings-grid">
        <aside className="visit-sidebar" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
             <div className="user-avatar-sm" style={{ width: '40px', height: '40px' }}>
                {profile?.user.imagem_url ? <img src={profile.user.imagem_url} /> : <span>{auth.role?.slice(0, 1).toUpperCase()}</span>}
             </div>
             <div>
                <div style={{ fontWeight: 700 }}>{profile?.user.nome}</div>
                <div className="muted" style={{ fontSize: '12px', textTransform: 'capitalize' }}>{auth.role}</div>
             </div>
          </div>
          <nav>
            <Link to="/" className="nav-link">Painel</Link>
            <Link to="/livros" className="nav-link">Catálogo</Link>
            <Link to="/" className="nav-link">Centro de Pesquisa</Link>
            <Link to="/leitor/leituras" className="nav-link">Contribuições</Link>
            <Link to={`/perfil/${meId}`} className="nav-link">Meu Perfil</Link>
            <Link to="/configuracoes" className="nav-link active">Configurações</Link>
          </nav>
          
          <div style={{ marginTop: '40px', padding: '16px', borderTop: '1px solid var(--border)' }}>
             <button className="btn secondary" style={{ width: '100%', justifyContent: 'flex-start', display: 'flex', gap: '8px' }} onClick={logout}>
                ⬅️ Sair da Conta
             </button>
          </div>
        </aside>

        <main>
          <section className="settings-card">
            <div className="settings-section-title">
              <h2>👤 Informações Pessoais</h2>
            </div>
            
            <form onSubmit={handleSave} className="stack">
              <div className="responsive-form-grid">
                <div>
                  <label className="label">Nome Completo</label>
                  <input className="input" defaultValue={profile?.user.nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
                </div>
                <div>
                  <label className="label">Título Profissional</label>
                  <input className="input" defaultValue={profile?.user.headline} onChange={e => setHeadline(e.target.value)} placeholder="ex: Pesquisador Sênior" />
                </div>
              </div>
              
              <div>
                <label className="label">Biografia Profissional</label>
                <textarea 
                  className="input" 
                  style={{ minHeight: '120px', resize: 'vertical' }} 
                  defaultValue={profile?.user.bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Conte-nos sobre sua trajetória acadêmica..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn" type="submit" disabled={updateProfileM.isPending}>
                  {updateProfileM.isPending ? 'Salvando...' : updateProfileM.isSuccess ? '✅ Salvo!' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </section>

          <section className="settings-card">
            <div className="settings-section-title">
              <h2>🛡️ Configurações de Segurança</h2>
            </div>
            
            <div className="stack">
              <div className="search-card" style={{ padding: '16px', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="avatar-circle" style={{ borderRadius: '8px', background: 'var(--surface-2)' }}>🔑</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>Atualizar Senha</div>
                      <div className="muted" style={{ fontSize: '12px' }}>Escolha uma senha forte</div>
                    </div>
                  </div>
                </div>
                
                <div className="responsive-form-grid" style={{ gap: '16px' }}>
                   <input className="input" type="password" placeholder="Senha Atual" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />
                   <input className="input" type="password" placeholder="Nova Senha" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
                </div>
                <button 
                  className="btn" 
                  style={{ marginTop: '12px' }} 
                  onClick={() => updatePasswordM.mutate({ senha_atual: senhaAtual, nova_senha: novaSenha })}
                  disabled={!senhaAtual || !novaSenha || updatePasswordM.isPending}
                >
                  {updatePasswordM.isPending ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
              </div>

              <div className="search-card" style={{ padding: '16px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div className="avatar-circle" style={{ borderRadius: '8px', background: 'var(--surface-2)' }}>📱</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>Autenticação em Duas Etapas</div>
                    <div className="muted" style={{ fontSize: '12px' }}>Altamente recomendado para editores</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)' }}>DESATIVADO</span>
                   <button className="btn secondary">Ativar</button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside>
          <div className="settings-card" style={{ textAlign: 'center' }}>
             <div className="avatar-circle" style={{ width: '120px', height: '120px', margin: '0 auto 16px', fontSize: '40px' }}>
                {profile?.user.imagem_url ? <img src={profile.user.imagem_url} /> : profile?.user.nome.slice(0,1).toUpperCase()}
             </div>
             <h3 style={{ margin: '0 0 4px' }}>{profile?.user.nome}</h3>
             <p className="muted" style={{ fontSize: '13px', marginBottom: '20px', textTransform: 'capitalize' }}>Acesso de {auth.role}</p>
             <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={onFileChange} />
             <button className="btn secondary" style={{ width: '100%' }} onClick={() => fileInputRef.current?.click()} disabled={updatePhotoM.isPending}>
                {updatePhotoM.isPending ? 'Enviando...' : 'Alterar Foto'}
             </button>
          </div>

          <div className="settings-card">
            <div className="settings-section-title">
              <h3 style={{ margin: 0, fontSize: '1rem' }}>🔔 Notificações</h3>
            </div>
            
            <div className="toggle-group">
              <span style={{ fontSize: '14px' }}>Atualizações de manuscritos</span>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            
            <div className="toggle-group">
              <span style={{ fontSize: '14px' }}>Alertas do sistema</span>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            
            <div className="toggle-group">
              <span style={{ fontSize: '14px' }}>Resumo semanal</span>
              <label className="switch">
                <input type="checkbox" />
                <span className="slider"></span>
              </label>
            </div>
            
            <div className="toggle-group">
              <span style={{ fontSize: '14px' }}>Notificações de segurança</span>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="danger-zone">
            <h3 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>⚠️ Zona de Perigo</h3>
            <p style={{ fontSize: '12px', color: '#7f1d1d', margin: '8px 0 16px' }}>
              Uma vez que você exclui sua conta, não há volta. Por favor, tenha certeza.
            </p>
            <button 
              className="btn secondary" 
              style={{ width: '100%', borderColor: '#fee2e2', color: 'var(--error)' }}
              onClick={() => setShowDeleteModal(true)}
              disabled={deleteAccountM.isPending}
            >
              {deleteAccountM.isPending ? 'Excluindo...' : 'Desativar Conta'}
            </button>
          </div>
        </aside>
      </div>

      <ConfirmModal 
        isOpen={showDeleteModal}
        title="Excluir Conta permanentemente?"
        message="Esta ação é irreversível. Todos os seus dados, leituras e histórico serão apagados para sempre."
        confirmLabel="Sim, Excluir tudo"
        cancelLabel="Não, quero ficar"
        isDanger={true}
        onConfirm={() => deleteAccountM.mutate()}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  )
}
