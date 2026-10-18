// Configuración del tablero Plinko.
//
// Tablero de 9 filas → 10 slots (0..9). La probabilidad de caer en el
// slot k sigue una binomial: C(9,k) / 512.
//
// Cada riesgo tiene su rango de apuesta y su tabla de multiplicadores,
// diseñada con ventaja de la casa en ~4-5% (EV ≈ 0.95):
//   PEQUENO:  [1, 50]        máx 5x   — dispersión baja
//   MEDIANO:  [50, 500]      máx 15x  — dispersión media
//   GRANDE:   [500, 5000]    máx 30x  — dispersión alta
//
// El resultado SIEMPRE se genera en el server (la ruta se deriva de una
// semilla CSPRNG de 32 bytes registrada en la ronda para auditoría).

export const PLINKO_FILAS = 9;

export const PLINKO_RIESGOS = {
  PEQUENO: {
    min: 1,
    max: 50,
    // EV ≈ 0.957
    multiplicadores: [5, 2, 1.5, 1, 0.8, 0.5, 1, 1.5, 2.5, 5],
  },
  MEDIANO: {
    min: 50,
    max: 500,
    // EV ≈ 0.962
    multiplicadores: [15, 4, 1.6, 1, 0.5, 0.3, 0.8, 2, 5, 15],
  },
  GRANDE: {
    min: 500,
    max: 5000,
    // EV ≈ 0.946
    multiplicadores: [30, 6, 2, 0.8, 0.3, 0.2, 0.5, 1.5, 8, 30],
  },
};

export const RIESGOS_VALIDOS = Object.keys(PLINKO_RIESGOS);
