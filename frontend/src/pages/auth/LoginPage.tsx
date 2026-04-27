import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { useAuth } from '../../app/AuthProvider'

const schema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Informe a senha'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const nav = useNavigate()
  const { login, auth } = useAuth()
  const [err, setErr] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', senha: '' },
  })

  const onSubmit = form.handleSubmit(async (v) => {
    setErr(null)
    try {
      await login(v.email, v.senha)
      // auth será atualizado; mas também dá para navegar por papel no próximo render.
      nav('/', { replace: true })
    } catch (e: any) {
      setErr(e?.message ?? 'Falha no login')
    }
  })

  // Se já logado, manda pra home
  useEffect(() => {
    if (auth.token) nav('/', { replace: true })
  }, [auth.token, nav])

  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Entrar</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label className="muted">Email</label>
          <input className="input" type="email" {...form.register('email')} />
          <div className="error">{form.formState.errors.email?.message}</div>
        </div>
        <div>
          <label className="muted">Senha</label>
          <input className="input" type="password" {...form.register('senha')} />
          <div className="error">{form.formState.errors.senha?.message}</div>
        </div>

        {err ? <div className="error">{err}</div> : null}

        <button className="btn" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
