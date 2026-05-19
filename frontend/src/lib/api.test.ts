import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

vi.mock('./env', () => ({ env: { apiBaseUrl: 'http://test.local' } }))
vi.mock('./token', () => ({ getToken: () => null, clearToken: vi.fn() }))

describe('api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retorna JSON em resposta ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    } as Response)

    const data = await api<{ ok: boolean }>('/reader/books')
    expect(data.ok).toBe(true)
  })

  it('lança ApiError com message do backend', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ message: 'Dados inválidos' }),
    } as Response)

    await expect(api('/x')).rejects.toMatchObject({ status: 400, message: 'Dados inválidos' })
  })
})
