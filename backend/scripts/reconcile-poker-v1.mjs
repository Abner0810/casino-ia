import { PrismaClient } from '@prisma/client';
import { toDecimal, toNumber } from '../src/shared/utils/money.js';

const prisma = new PrismaClient();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const limitArg = process.argv.find((value) => value.startsWith('--limit='));
const limit = Math.max(1, Math.min(1000, Number(limitArg?.slice(8) || 100)));

function legacyWhere() {
  return { estado: 'ACTIVA', modalidad: 'TEXAS_HOLDEM', mesaVersion: 1 };
}

async function reconcile(partida) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "PartidaPoker" WHERE "id" = ${partida.id} FOR UPDATE`;
    const current = await tx.partidaPoker.findUnique({ where: { id: partida.id } });
    if (!current || current.estado !== 'ACTIVA' || current.modalidad !== 'TEXAS_HOLDEM' || current.mesaVersion !== 1) {
      return { id: partida.id, estado: 'SIN_CAMBIO' };
    }
    const monto = toDecimal(current.apuestaTotal || current.apuesta || 0);
    if (monto.lte(0)) throw new Error(`Apuesta inválida para ${current.id}`);
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: current.userId } });
    const descripcion = 'Devolución por migración de mesa Poker';
    const resultado = {
      ganador: 'EMPATE', ganadores: ['jugador'], motivo: 'MIGRACION_MESA_BOTS',
      manoJugador: null, manoBanca: null, manosBots: [null, null, null],
      bote: toNumber(monto), ganancia: toNumber(monto), gananciaNeta: 0,
    };
    const actualizado = await tx.partidaPoker.updateMany({
      where: { id: current.id, estado: 'ACTIVA', mesaVersion: 1 },
      data: { estado: 'RENDIDA', mesaVersion: 2, resultado, ganancia: monto, fase: 'SHOWDOWN', finishedAt: new Date(), version: { increment: 1 } },
    });
    if (actualizado.count !== 1) return { id: current.id, estado: 'SIN_CAMBIO' };
    await tx.wallet.update({ where: { userId: current.userId }, data: { saldo: { increment: monto } } });
    await tx.movimiento.create({ data: {
      userId: current.userId, tipo: 'PREMIO', monto,
      saldoAntes: wallet.saldo, saldoDespues: wallet.saldo.add(monto),
      juego: 'poker', descripcion,
    } });
    return { id: current.id, estado: 'RENDIDA', monto: toNumber(monto) };
  });
}

try {
  const partidas = await prisma.partidaPoker.findMany({ where: legacyWhere(), orderBy: { createdAt: 'asc' }, take: limit });
  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, cantidad: partidas.length, ids: partidas.map(({ id }) => id) }));
  } else {
    const resultados = [];
    for (const partida of partidas) resultados.push(await reconcile(partida));
    console.log(JSON.stringify({ dryRun: false, procesadas: resultados.length, resultados }));
  }
} finally {
  await prisma.$disconnect();
}
