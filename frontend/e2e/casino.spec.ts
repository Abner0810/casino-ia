import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

// Contratos reproducibles, sin credenciales ni conexión a Render/PostgreSQL.
async function prepararApi(page: Page) {
  let saldo = 100
  let partida: Record<string, unknown> | null = null
  let partidaPoker: Record<string, unknown> | null = null
  const rondasBlackjack: object[] = []
  const rondasRuleta: object[] = []
  const rondasPoker: object[] = []
  const items: object[] = []
  const usuario = { publicId: 'qa-user', email: 'qa@example.com', nombre: 'Usuario QA', rol: 'USER' }
  await page.route(/^http:\/\/127\.0\.0\.1:3000\/api\//, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/', '')
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body })
    if (path === 'auth/register') return json({ ...usuario, mensaje: 'Cuenta creada' }, 201)
    if (path === 'auth/login') return json({ usuario, accessToken: 'qa-access', refreshToken: 'qa-refresh', tokenType: 'Bearer', expiresInMinutes: 30 })
    if (path === 'auth/logout') return json({ mensaje: 'Sesión cerrada' })
    if (path === 'users/profile') return json({ ...usuario, wallet: { saldo, bono: 0 }, creadoEn: '2026-10-19T12:00:00Z' })
    if (path === 'wallet') return json({ saldo, bono: 0, totalDisponible: saldo, actualizadoEn: '2026-10-19T12:00:00Z' })
    if (path === 'wallet/balance') return json({ saldo, bono: 0, total: saldo, historial: { totalApostado: 0, totalGanado: 0, cantidadApuestas: 0, cantidadPremios: 0, totalDepositado: 100, totalRetirado: 0, resultadoNeto: 0 } })
    if (path === 'transactions/deposit' || path === 'transactions/withdraw') {
      expect(request.headers()['idempotency-key']).toBeTruthy()
      const { monto, metodo } = request.postDataJSON()
      expect(metodo).toBe('simulado')
      if (path.endsWith('withdraw') && monto > saldo) return json({ error: 'Saldo insuficiente' }, 400)
      const antes = saldo
      saldo += path.endsWith('deposit') ? monto : -monto
      items.unshift({ id: `mov-${items.length}`, tipo: path.endsWith('deposit') ? 'DEPOSITO' : 'RETIRO', monto, saldoAntes: antes, saldoDespues: saldo, juego: null, descripcion: 'Operación simulada QA', fecha: '2026-10-19T12:00:00Z' })
      return json({ mensaje: 'Operación registrada correctamente', saldoActual: saldo }, 201)
    }
    if (path === 'transactions/history') return json({ items, paginacion: { pagina: 1, porPagina: 10, total: items.length, totalPaginas: 1 } })
    if (path === 'users/games/blackjack/access') return json({ juego: 'blackjack', saldo, mesa: { apuestaMinima: 10, apuestaMaxima: 1000, reglas: [] } })
    if (path === 'games/blackjack/active') return json({ partida: partida?.estado === 'ACTIVA' ? partida : null })
    if (path === 'games/blackjack/rounds') return json({ items: rondasBlackjack })
    if (path === 'games/blackjack/start') {
      expect(request.headers()['idempotency-key']).toBeTruthy()
      const { apuesta } = request.postDataJSON()
      saldo -= apuesta
      partida = { partidaId: 'blackjack-qa', version: 0, estado: 'ACTIVA', apuestaBase: apuesta, apuestaTotal: apuesta, dealer: { cartas: ['7♠', '🂠'], totalVisible: 7 }, manos: [{ cartas: ['10♥', '8♦'], valor: 18, apuesta, estado: 'ACTIVA', ganancia: null }], cartasRestantes: 308, indiceManoActiva: 0, accionesPermitidas: ['hit', 'stand', 'double', 'exit'], saldoActual: saldo }
      return json(partida, 201)
    }
    if (path === 'games/blackjack/blackjack-qa/exit') {
      expect(request.headers()['idempotency-key']).toBeTruthy()
      expect(request.postDataJSON().version).toBe(0)
      const apuesta = Number(partida!.apuestaTotal)
      saldo += apuesta / 2
      partida = { ...partida, version: 1, estado: 'RENDIDA', dealer: { cartas: ['7♠', '10♣'], totalVisible: 17 }, manos: [{ cartas: ['10♥', '8♦'], valor: 18, apuesta, estado: 'RENDIDA', ganancia: apuesta / 2 }], indiceManoActiva: -1, accionesPermitidas: [], saldoActual: saldo, devuelto: apuesta / 2 }
      rondasBlackjack.unshift({ id: 'blackjack-qa', apuesta, estado: 'RENDIDA', creadaEn: '2026-10-19T12:00:00Z', cerradaEn: '2026-10-19T12:01:00Z' })
      return json(partida)
    }
    if (path === 'games/blackjack/blackjack-qa') return json(partida)
    if (path === 'users/games/roulette/access') return json({ juego: 'roulette', saldo, mesa: { apuestaMinima: 1, apuestaMaxima: 1000, reglas: [] } })
    if (path === 'games/roulette/config') return json({ apuestaMinima: 1, apuestaMaxima: 1000, pagos: { pleno: 36, color: 2, paridad: 2, docena: 3, columna: 3 } })
    if (path === 'games/roulette/rounds') return json({ items: rondasRuleta })
    if (path === 'games/roulette/bet') {
      expect(request.headers()['idempotency-key']).toBeTruthy()
      const { apuesta, tipo, seleccion } = request.postDataJSON()
      expect({ tipo, seleccion }).toEqual({ tipo: 'color', seleccion: 'rojo' })
      saldo += apuesta
      const resultado = { rondaId: 'ruleta-qa', numero: 32, color: 'rojo', apuesta, tipo, seleccion, multiplicador: 2, ganancia: apuesta * 2, gananciaNeta: apuesta, saldoActual: saldo }
      rondasRuleta.unshift({ id: resultado.rondaId, numero: 32, color: 'rojo', apuesta, tipo, seleccion, multiplicador: 2, ganancia: apuesta * 2, fecha: '2026-10-19T12:00:00Z' })
      return json(resultado, 201)
    }
    if (path === 'users/games/poker/access') return json({ juego: 'poker', saldo, mesa: { apuestaMinima: 1, apuestaMaxima: 1000, reglas: [] } })
    if (path === 'games/poker/config') return json({ apuestaMinima: 1, apuestaMaxima: 1000, maxSubidas: 4, reglas: ['Texas Hold’em contra la banca'] })
    if (path === 'games/poker/active') return json({ partida: partidaPoker?.estado === 'ACTIVA' ? partidaPoker : null })
    if (path === 'games/poker/rounds') return json({ items: rondasPoker })
    if (path === 'games/poker/start') {
      expect(request.headers()['idempotency-key']).toBeTruthy()
      const { apuesta } = request.postDataJSON()
      saldo -= apuesta
      partidaPoker = {
        partidaId: 'poker-qa',
        version: 0,
        estado: 'ACTIVA',
        fase: 'PREFLOP',
        cartasJugador: ['J♥', 'J♠'],
        cartasBanca: ['🂠', '🂠'],
        comunitarias: [],
        apuestaBase: apuesta,
        apuestaTotal: apuesta,
        bote: apuesta * 2,
        accionesPermitidas: ['check', 'raise', 'fold'],
        saldoActual: saldo,
        resultado: null,
      }
      rondasPoker.unshift({ id: 'poker-qa', apuesta, apuestaTotal: apuesta, bote: apuesta * 2, estado: 'ACTIVA', fase: 'PREFLOP', manoJugador: null, manoBanca: null, ganancia: 0, creadaEn: '2026-10-19T12:00:00Z', cerradaEn: null })
      return json(partidaPoker, 201)
    }
    if (path === 'games/poker/poker-qa/action') {
      expect(request.headers()['idempotency-key']).toBeTruthy()
      const { version, accion } = request.postDataJSON()
      expect(version).toBe(partidaPoker!.version)
      expect(['check', 'raise', 'fold']).toContain(accion)
      const transiciones: Record<string, readonly [string, string[]]> = {
        PREFLOP: ['FLOP', ['2♦', '7♣', '10♥']],
        FLOP: ['TURN', ['A♠']],
        TURN: ['RIVER', ['3♣']],
        RIVER: ['SHOWDOWN', []],
      }
      const siguiente = transiciones[partidaPoker!.fase as string]
      if (!siguiente) throw new Error(`Fase Poker desconocida: ${String(partidaPoker!.fase)}`)
      const apuesta = Number(partidaPoker!.apuestaTotal)
      const nuevaApuesta = accion === 'raise' ? apuesta + Number(partidaPoker!.apuestaBase) : apuesta
      if (accion === 'raise') saldo -= Number(partidaPoker!.apuestaBase)
      const termina = accion === 'fold' || siguiente[0] === 'SHOWDOWN'
      const resultado = termina ? { ganador: accion === 'fold' ? 'BANCA' : 'JUGADOR', motivo: accion === 'fold' ? 'RETIRO' : 'SHOWDOWN', manoJugador: 'Pareja', manoBanca: 'Carta alta', ganancia: accion === 'fold' ? 0 : nuevaApuesta * 2, gananciaNeta: accion === 'fold' ? -nuevaApuesta : nuevaApuesta } : null
      if (resultado?.ganador === 'JUGADOR') saldo += resultado.ganancia
      partidaPoker = {
        ...partidaPoker,
        version: Number(partidaPoker!.version) + 1,
        estado: termina ? (resultado?.ganador === 'JUGADOR' ? 'GANADA' : 'PERDIDA') : 'ACTIVA',
        fase: siguiente[0],
        comunitarias: [...(partidaPoker!.comunitarias as string[]), ...siguiente[1]],
        cartasBanca: termina ? ['A♣', 'K♦'] : ['🂠', '🂠'],
        apuestaTotal: nuevaApuesta,
        bote: nuevaApuesta * 2,
        accionesPermitidas: termina ? [] : ['check', 'raise', 'fold'],
        saldoActual: saldo,
        resultado,
      }
      rondasPoker[0] = { ...rondasPoker[0], estado: partidaPoker.estado, fase: partidaPoker.fase, apuestaTotal: nuevaApuesta, bote: nuevaApuesta * 2, ganancia: resultado?.ganancia ?? 0, cerradaEn: termina ? '2026-10-19T12:01:00Z' : null }
      return json(partidaPoker)
    }
    if (path === 'games/poker/poker-qa') return json(partidaPoker)
    const riesgos = [
      { riesgo: 'PEQUENO', apuestaMinima: 1, apuestaMaxima: 50, maximoMultiplicador: 5, multiplicadores: [5, 2, 1.5, 1, 0.8, 0.5, 1, 1.5, 2.5, 5] },
      { riesgo: 'MEDIANO', apuestaMinima: 50, apuestaMaxima: 500, maximoMultiplicador: 15, multiplicadores: [15, 4, 1.6, 1, 0.5, 0.3, 0.8, 2, 5, 15] },
      { riesgo: 'GRANDE', apuestaMinima: 500, apuestaMaxima: 5000, maximoMultiplicador: 30, multiplicadores: [30, 6, 2, 0.8, 0.3, 0.2, 0.5, 1.5, 8, 30] },
    ]
    if (path === 'users/games/plinko/access') return json({ juego: 'plinko', saldo, riesgos })
    if (path === 'games/plinko/config') return json({ filas: 9, slots: 10, riesgos })
    if (path === 'games/plinko/rounds') return json({ items: [] })
    if (path === 'games/plinko/bet') {
      expect(request.headers()['idempotency-key']).toBeTruthy()
      const { apuesta, riesgo } = request.postDataJSON()
      saldo -= apuesta / 2
      return json({ riesgo, apuesta, multiplicador: 0.5, ganancia: apuesta / 2, gananciaNeta: -apuesta / 2, saldoActual: saldo, ruta: ['D', 'I', 'D', 'I', 'D', 'I', 'D', 'I', 'D'] }, 201)
    }
    return json({ error: `Contrato QA no definido: ${path}` }, 404)
  })
}

async function login(page: Page, destino = /\/inicio$/) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('qa@example.com')
  await page.getByLabel('Contraseña', { exact: true }).fill('Password123!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(destino)
}

test.beforeEach(async ({ page }) => {
  await prepararApi(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('registro, login, recarga, Plinko, movimientos, retiro rechazado y logout', async ({ page }) => {
  await page.goto('/registro')
  await page.getByLabel('Nombre', { exact: true }).fill('Usuario QA')
  await page.getByLabel('Email', { exact: true }).fill('qa@example.com')
  await page.getByLabel('Contraseña', { exact: true }).fill('Password123!')
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Password123!')
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
  await expect(page.getByText('Cuenta creada correctamente. Ya puedes iniciar sesión.')).toBeVisible()
  await login(page)
  await page.getByRole('link', { name: 'Billetera', exact: true }).click()
  await page.getByLabel(/Monto a recargar/).fill('150.50')
  await page.getByRole('button', { name: 'Simular recarga' }).click()
  await expect(page.getByText('Operación completada', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Juegos', exact: true }).click()
  await page.getByRole('link', { name: /Plinko|tablero/i }).first().click()
  await expect(page.getByRole('heading', { name: 'Plinko', exact: true })).toBeVisible()
  await page.getByLabel('Apuesta por bola', { exact: true }).fill('10')
  await page.getByRole('button', { name: 'Lanzar bolas', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Resultados (1)', exact: true })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Bola 1' })).toContainText('Neto')
  await page.getByRole('link', { name: 'Movimientos', exact: true }).click()
  await expect(page.getByText('Operación simulada QA', { exact: true })).toBeVisible()
  await page.getByLabel('Tipo', { exact: true }).selectOption('DEPOSITO')
  await page.getByRole('link', { name: 'Billetera', exact: true }).click()
  await page.getByLabel(/Monto a retirar/).fill('9999')
  await page.getByRole('button', { name: 'Continuar con el retiro' }).click()
  await page.getByRole('button', { name: 'Confirmar retiro', exact: true }).click()
  await expect(page.getByText('Saldo insuficiente', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
})

test('plinko lanza varias bolas y actualiza el saldo al terminar', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Juegos', exact: true }).click()
  await page.getByRole('link', { name: /Plinko|tablero/i }).first().click()
  await expect(page.getByRole('heading', { name: 'Plinko', exact: true })).toBeVisible()
  await page.getByLabel('Apuesta por bola', { exact: true }).fill('10')
  await page.getByLabel(/Cantidad de bolas/).fill('3')
  await page.getByRole('button', { name: 'Lanzar bolas', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Resultados (3)', exact: true })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Neto' })).toHaveCount(3)
  // 100 de saldo inicial - 3 bolas de 10 con retorno del 50% = 85.
  await expect(page.getByText('Saldo de simulación', { exact: true }).locator('..')).toContainText('85.00')
})

test('rutas privadas y sesión en memoria', async ({ page }) => {
  await page.goto('/billetera')
  await expect(page).toHaveURL(/\/login$/)
  await login(page, /\/billetera$/)
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
})

test('blackjack muestra carta oculta, recupera mesa al navegar y confirma rendición', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Juegos', exact: true }).click()
  await page.getByRole('link', { name: 'Jugar Blackjack' }).click()
  await page.getByLabel('Apuesta', { exact: true }).fill('20')
  await page.getByRole('button', { name: 'Repartir cartas' }).click()
  await expect(page.getByRole('img', { name: 'Carta oculta', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Movimientos', exact: true }).click()
  await page.getByRole('link', { name: 'Juegos', exact: true }).click()
  await page.getByRole('link', { name: 'Jugar Blackjack' }).click()
  await expect(page.getByRole('button', { name: 'Pedir carta' })).toBeEnabled()
  await page.getByRole('button', { name: 'Rendirse', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Rendirse y cerrar la partida' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar rendición' }).click()
  await expect(page.getByRole('heading', { name: 'Rendida', exact: true })).toBeVisible()
  await page.getByLabel('Apuesta', { exact: true }).fill('20')
  await expect(page.getByRole('button', { name: 'Nueva partida' })).toBeEnabled()
})

test('layout sin desbordamiento horizontal en tamaños requeridos', async ({ page }) => {
  await login(page)
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const ruta of ['Billetera', 'Movimientos', 'Juegos']) {
      await page.getByRole('link', { name: ruta, exact: true }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }
    for (const nombre of ['Jugar Ruleta clásica', 'Jugar Poker']) {
      await page.getByRole('link', { name: nombre }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.getByRole('link', { name: 'Juegos', exact: true }).click()
    }
  }
})

test('ruleta confirma el giro y actualiza saldo con movimiento reducido', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Juegos', exact: true }).click()
  await page.getByRole('link', { name: 'Jugar Ruleta clásica' }).click()
  await page.getByLabel('Apuesta', { exact: true }).fill('10')
  await page.getByRole('radio', { name: 'Negro' }).focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('radio', { name: 'Negro' })).toBeChecked()
  await page.getByRole('radio', { name: 'Rojo' }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Girar ruleta' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Salió 32 rojo' })).toBeVisible()
  await expect(page.getByText('Saldo confirmado')).toContainText('110.00')
  await page.getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect(page.getByText('Saldo', { exact: true }).first().locator('..')).toContainText('110.00')
})

test('Poker Texas Hold’em recupera la mano y avanza sus fases', async ({ page }) => {
  await login(page)
  await page.getByRole('link', { name: 'Juegos', exact: true }).click()
  await page.getByRole('link', { name: 'Jugar Poker' }).click()
  await page.getByLabel('Apuesta', { exact: true }).fill('20')
  await page.getByRole('button', { name: 'Repartir cartas' }).click()
  await expect(page.getByRole('heading', { name: 'Poker', exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Tus cartas' })).toContainText('J♥')
  await expect(page.getByRole('group', { name: 'Tus cartas' })).toContainText('J♠')
  await page.setViewportSize({ width: 320, height: 900 })
  await expect(page.getByRole('group', { name: 'Cartas comunitarias' })).toBeVisible()
  await page.getByRole('link', { name: 'Movimientos', exact: true }).click()
  await page.getByRole('link', { name: 'Juegos', exact: true }).click()
  await page.getByRole('link', { name: 'Jugar Poker' }).click()
  await expect(page.getByText('Cartas iniciales').first()).toBeVisible()
  await page.getByRole('button', { name: /Pasar · ver flop/i }).click()
  await expect(page.getByText('Flop').first()).toBeVisible()
})
