import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { api } from '../../lib/api'

const schema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Mínimo de 6 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const nav = useNavigate()
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', email: '', senha: '' },
  })

  const onSubmit = form.handleSubmit(async (v) => {
    setErr(null)
    setOk(null)
    try {
      await api<{ message: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(v),
      })
      setOk('Conta criada. Agora faça login.')
      setTimeout(() => nav('/entrar'), 500)
    } catch (e: any) {
      setErr(e?.message ?? 'Falha no cadastro')
    }
  })

  return (
    <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Cadastro (leitor)</h1>
      <form onSubmit={onSubmit} className="stack">
        <div>
          <label className="label">Nome</label>
          <input className="input" {...form.register('nome')} />
          <div className="error">{form.formState.errors.nome?.message}</div>
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" {...form.register('email')} />
          <div className="error">{form.formState.errors.email?.message}</div>
        </div>
        <div>
          <label className="label">Senha</label>
          <input className="input" type="password" {...form.register('senha')} />
          <div className="error">{form.formState.errors.senha?.message}</div>
        </div>

        {err ? <div className="error">{err}</div> : null}
        {ok ? <div className="success">{ok}</div> : null}

        <button className="btn" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Criando…' : 'Criar conta'}
        </button>
      </form>
    </div>
  )
}
