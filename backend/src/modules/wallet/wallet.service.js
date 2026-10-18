import { ApiError } from '../../shared/ApiError.js';
import { toNumber } from '../../shared/utils/money.js';
import * as repo from './wallet.repository.js';

export async function verSaldo(userId) {
  const wallet = await repo.getWallet(userId);
  if (!wallet) throw new ApiError(404, 'Billetera no encontrada');
  return {
    saldo: toNumber(wallet.saldo),
    bono: toNumber(wallet.bono),
    totalDisponible: toNumber(wallet.saldo.add(wallet.bono)),
    actualizadoEn: wallet.updatedAt,
  };
}

export async function verBalance(userId) {
  const { wallet, apostado, ganado, depositos, retiros } = await repo.getBalanceConsolidado(userId);
  if (!wallet) throw new ApiError(404, 'Billetera no encontrada');

  const saldo = wallet.saldo;
  const bono = wallet.bono;
  const totalApostado = apostado._sum.monto ?? 0;
  const totalGanado = ganado._sum.monto ?? 0;

  return {
    saldo: toNumber(saldo),
    bono: toNumber(bono),
    total: toNumber(saldo.add(bono)),
    historial: {
      totalApostado: toNumber(totalApostado),
      totalGanado: toNumber(totalGanado),
      cantidadApuestas: apostado._count,
      cantidadPremios: ganado._count,
      totalDepositado: toNumber(depositos._sum.monto ?? 0),
      totalRetirado: toNumber(retiros._sum.monto ?? 0),
      resultadoNeto: toNumber(totalGanado.sub(totalApostado)),
    },
  };
}
