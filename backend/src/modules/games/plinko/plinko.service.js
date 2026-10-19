// SERVICIO PLINKO
//
// RNG 100% server-side (auditoría interna; sin protocolo público de equidad):
//  1. Se genera una semilla de 32 bytes con CSPRNG (crypto.randomBytes)
//     ANTES de conocer el resultado.
//  2. La trayectoria se deriva de la semilla: byte[i] % 2 decide
//     izquierda/derecha en cada una de las 9 filas. 256 % 2 == 0, así
//     que la derivación es exactamente uniforme, sin sesgo de módulo.
//  3. Semilla y ruta quedan registradas en la ronda: cualquier auditor
//     puede reproducir la misma trayectoria desde la semilla.
// El cliente jamás envía ni influye en el resultado.

import { randomBytes } from 'crypto';
import { userTransaction } from '../../../shared/transaction.js';
import { ApiError } from '../../../shared/ApiError.js';
import { toDecimal, toNumber, dosDecimales } from '../../../shared/utils/money.js';
import { debitar, acreditar } from '../../../shared/utils/ledger.js';
import { PLINKO_FILAS, PLINKO_RIESGOS } from './plinko.config.js';
import * as repo from './plinko.repository.js';

// Deriva la ruta de la bola desde la semilla (auditable y reproducible)
export function simularRuta(seedHex) {
  const bytes = Buffer.from(seedHex, 'hex');
  const ruta = [];
  let indice = 0;
  for (let fila = 0; fila < PLINKO_FILAS; fila++) {
    const derecha = bytes[fila] % 2 === 1;
    ruta.push(derecha ? 'D' : 'I');
    if (derecha) indice++;
  }
  return { ruta, indice }; // indice = slot (0..9) donde cae la bola
}

export async function apostar(userId, { apuesta, riesgo }) {
  const cfg = PLINKO_RIESGOS[riesgo];
  if (apuesta < cfg.min || apuesta > cfg.max) {
    throw new ApiError(
      400,
      `En riesgo ${riesgo} la apuesta debe estar entre ${cfg.min} y ${cfg.max}`
    );
  }

  // Paso 1: semilla ANTES del resultado (registra la intención)
  const seed = randomBytes(32).toString('hex');

  // Paso 2: derivar ruta y premio
  const { ruta, indice } = simularRuta(seed);
  const multiplicador = cfg.multiplicadores[indice];
  const montoApuesta = dosDecimales(toDecimal(apuesta));
  const ganancia = dosDecimales(montoApuesta.times(multiplicador));

  // Paso 3: cobrar todo de forma atómica (débito + premio + ledger + ronda)
  const resultado = await userTransaction(userId, async (tx) => {
    const saldoTrasApuesta = await debitar(
      tx,
      userId,
      montoApuesta,
      'plinko',
      `Apuesta Plinko riesgo ${riesgo} (multiplicador potencial ${multiplicador}x)`
    );

    let saldoFinal = saldoTrasApuesta;
    if (ganancia.gt(0)) {
      saldoFinal = await acreditar(
        tx,
        userId,
        ganancia,
        'plinko',
        `Premio Plinko riesgo ${riesgo}: ${multiplicador}x sobre ${toNumber(montoApuesta)}`
      );
    }

    const ronda = await repo.crearRonda(tx, {
      userId,
      apuesta: montoApuesta,
      riesgo,
      multiplicador,
      ganancia,
      seed,
      rutaBola: ruta,
    });
    return { saldoFinal, rondaId: ronda.id };
  });

  return {
    rondaId: resultado.rondaId,
    slot: indice,
    riesgo,
    apuesta: toNumber(montoApuesta),
    multiplicador,
    ganancia: toNumber(ganancia),
    ruta,
    gananciaNeta: toNumber(ganancia.minus(montoApuesta)),
    saldoActual: toNumber(resultado.saldoFinal),
  };
}

export function configuracion() {
  return {
    filas: PLINKO_FILAS,
    slots: PLINKO_FILAS + 1,
    direcciones: ['I', 'D'],
    unidad: 'creditos_simulados',
    riesgos: Object.entries(PLINKO_RIESGOS).map(([riesgo, cfg]) => ({
      riesgo, apuestaMinima: cfg.min, apuestaMaxima: cfg.max,
      multiplicadores: [...cfg.multiplicadores],
    })),
  };
}

export async function ultimasRondas(userId) {
  const rondas = await repo.rondasDeUsuario(userId);
  return rondas.map((r) => ({
    id: r.id,
    riesgo: r.riesgo,
    apuesta: toNumber(r.apuesta),
    multiplicador: toNumber(r.multiplicador),
    ganancia: toNumber(r.ganancia),
    ruta: r.rutaBola,
    fecha: r.createdAt,
  }));
}
