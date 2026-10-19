import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({ env: { apiUrl: 'https://api.example.test/api' } }))

import { abortarPendientes, configurarSesionHttp, http, registrarAccesoATokens } from './http'

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })
let token: string | null
let refresh = vi.fn<() => Promise<void>>()
let perder = vi.fn<() => void>()

beforeEach(() => {
  token = 'inicial'
  refresh = vi.fn(async () => { token = 'rotado' })
  perder = vi.fn()
  registrarAccesoATokens(() => token)
  configurarSesionHttp({ refrescar: refresh, alPerderSesion: perder })
})
afterEach(() => { abortarPendientes(); vi.unstubAllGlobals() })

describe('transporte y sesión', () => {
  it('coordina los 401 concurrentes y repite con el token rotado', async () => {
    const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>
      return headers.Authorization === 'Bearer inicial' ? json({ error: 'Expirado' }, 401) : json({ saldo: 20 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const respuestas = await Promise.all([http('wallet'), http('users/profile')])
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(respuestas).toEqual([{ saldo: 20 }, { saldo: 20 }])
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('no renueva otra vez ante un 401 tardío del token anterior', async () => {
    let resolver!: (response: Response) => void
    let llamadas = 0
    vi.stubGlobal('fetch', vi.fn((_url: unknown, init?: RequestInit) => {
      const anterior = (init?.headers as Record<string, string>).Authorization === 'Bearer inicial'
      if (!anterior) return Promise.resolve(json({ ok: true }))
      llamadas++
      return llamadas === 1 ? Promise.resolve(json({}, 401)) : new Promise<Response>((r) => { resolver = r })
    }))
    const primera = http('wallet')
    const tardia = http('wallet/balance')
    await primera
    resolver(json({}, 401))
    await tardia
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('no reenvía una operación con resultado incierto', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Network failure'))
    vi.stubGlobal('fetch', fetchMock)
    await expect(http('transactions/deposit', { method: 'POST', body: { monto: 10 }, idempotencyKey: 'operacion-123' })).rejects.toMatchObject({ esRed: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('descarta respuestas tardías al cerrar sesión aunque fetch ignore abort', async () => {
    let resolver!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => { resolver = r })))
    const pendiente = http('wallet')
    abortarPendientes()
    resolver(json({ saldo: 999 }))
    await expect(pendiente).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('envía Bearer capturado en logout sin disparar refresh', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ mensaje: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)
    token = null
    await http('auth/logout', { method: 'POST', auth: false, accessToken: 'capturado', body: { refreshToken: 'opaco' } })
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer capturado')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('pierde sesión si la renovación falla y no entra en bucles', async () => {
    refresh.mockRejectedValue(new Error('Expirado'))
    const fetchMock = vi.fn().mockResolvedValue(json({}, 401))
    vi.stubGlobal('fetch', fetchMock)
    await expect(http('wallet')).rejects.toMatchObject({ status: 401 })
    expect(perder).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
