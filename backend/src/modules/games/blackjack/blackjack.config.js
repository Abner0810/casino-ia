// Configuración de la mesa de Blackjack.
export const BLACKJACK_LIMITES = {
  MIN: 10,
  MAX: 10000,
};

// Reglas del crupier y pagos
export const REGLAS = {
  EL_CRUPIER_PLANTA_EN: 17, // planta en todos los 17 (fuerte o suave)
  PAGO_BLACKJACK_NATURAL: 2.5, // 3:2 → devuelve stake + 1.5 de ganancia
  PAGO_VICTORIA_NORMAL: 2, // devuelve stake + 1:1
  PAGO_EMPATE: 1, // devuelve el stake
  RENDICION: 0.5, // "salir" devuelve el 50% de la apuesta
  MAX_MANOS_POR_SPLIT: 3,
};
