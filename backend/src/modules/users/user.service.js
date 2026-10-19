// SERVICIO DE USUARIOS
// Anti-IDOR por diseño: el usuario SIEMPRE se deriva del token
// (req.user.id), nunca de un parámetro de la URL. El cliente no tiene
// forma de pedir "el perfil de otro", porque no manda IDs.

import { ApiError } from '../../shared/ApiError.js';
import { toNumber } from '../../shared/utils/money.js';
import { PLINKO_RIESGOS } from '../games/plinko/plinko.config.js';
import { BLACKJACK_LIMITES } from '../games/blackjack/blackjack.config.js';
import * as repo from './user.repository.js';

const perfil = (user) => ({
  publicId: user.publicId, // el único ID que el cliente ve (hash argon2)
  email: user.email,
  nombre: user.nombre,
  rol: user.rol,
  wallet: {
    saldo: toNumber(user.wallet.saldo),
    bono: toNumber(user.wallet.bono),
  },
  creadoEn: user.createdAt,
});

export async function verPerfil(userId) {
  const user = await repo.findById(userId);
  if (!user) throw new ApiError(404, 'Usuario no encontrado');
  return perfil(user);
}

export async function editarPerfil(userId, { nombre }) {
  const user = await repo.updateNombre(userId, nombre);
  return { ...perfil(user), mensaje: 'Perfil actualizado correctamente' };
}

// "Ir a los juegos": valida que el usuario tenga saldo y devuelve los
// límites de la mesa elegida (lo consume el frontend antes de abrir el juego).
export async function accesoJuego(userId, juego) {
  const user = await repo.findById(userId);
  if (!user) throw new ApiError(404, 'Usuario no encontrado');

  if (user.wallet.saldo.lte(0)) {
    throw new ApiError(400, 'Saldo insuficiente. Recarga primero en la billetera para poder jugar');
  }

  if (juego === 'plinko') {
    return {
      juego,
      saldo: toNumber(user.wallet.saldo),
      riesgos: Object.entries(PLINKO_RIESGOS).map(([riesgo, cfg]) => ({
        riesgo,
        apuestaMinima: cfg.min,
        apuestaMaxima: cfg.max,
        maximoMultiplicador: Math.max(...cfg.multiplicadores),
      })),
    };
  }

  return {
    juego,
    saldo: toNumber(user.wallet.saldo),
    mesa: {
      apuestaMinima: BLACKJACK_LIMITES.MIN,
      apuestaMaxima: BLACKJACK_LIMITES.MAX,
      reglas: ['Blackjack natural paga 3:2', 'El crupier planta en 17', 'Hasta 3 manos por split', 'Salir cancela toda la mesa y devuelve el 50% de la apuesta total'],
    },
  };
}
