import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../../lib/api'
import type { User } from '../../lib/types'
import type { Role } from '../../lib/token'

export function AdminUsersPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ nome: '', email: '', senha: '', papel: 'editor' as Role })
  const [err, setErr] = useState<string | null>(null)

  const usersQ = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => api<User[]>('/admin/users'),
  })

  const createM = useMutation({
    mutationFn: () =>
      api<{ id: number; message: string }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    onSuccess: async () => {
      setForm({ nome: '', email: '', senha: '', papel: 'editor' })
      setErr(null)
      await qc.invalidateQueries({ queryKey: ['adminUsers'] })
    },
    onError: (e: any) => setErr(e?.message ?? 'Erro ao criar usuário'),
  })

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <div className="card" style={{ flex: 1, minWidth: 320 }}>
        <h1 style={{ marginTop: 0 }}>Usuários</h1>

        {usersQ.isLoading ? <p>Carregando…</p> : null}
        {usersQ.isError ? <p className="error">{(usersQ.error as any)?.message}</p> : null}

        {usersQ.data ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">ID</th>
                  <th align="left">Nome</th>
                  <th align="left">Email</th>
                  <th align="left">Papel</th>
                </tr>
              </thead>
              <tbody>
                {usersQ.data.map((u) => (
                  <tr key={u.id}>
                    <td style={{ padding: '6px 0' }}>{u.id}</td>
                    <td>{u.nome}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="pill">{u.papel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <div className="card" style={{ flex: 1, minWidth: 320 }}>
        <h2 style={{ marginTop: 0 }}>Criar usuário</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label className="muted">Nome</label>
            <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div>
            <label className="muted">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="muted">Senha</label>
            <input className="input" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
          </div>
          <div>
            <label className="muted">Papel</label>
            <select className="input" value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value as Role })}>
              <option value="admin">admin</option>
              <option value="editor">editor</option>
              <option value="leitor">leitor</option>
            </select>
          </div>

          {err ? <div className="error">{err}</div> : null}

          <button className="btn" type="button" onClick={() => createM.mutate()} disabled={createM.isPending}>
            {createM.isPending ? 'Criando…' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  )
}
