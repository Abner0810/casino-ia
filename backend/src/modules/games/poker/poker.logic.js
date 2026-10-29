// Evaluador de Texas Hold'em: compara la mejor combinación de cinco
// entre siete cartas. El desempate incluye todos los kickers.
const VALORES = { A: 14, K: 13, Q: 12, J: 11 };
const CARTA = /^(?:A|K|Q|J|10|[2-9])[♠♥♦♣]$/u;
const MANOS = ['Carta alta', 'Pareja', 'Doble pareja', 'Trío', 'Escalera', 'Color', 'Full house', 'Póker', 'Escalera de color'];

function leerCarta(carta) {
  if (typeof carta !== 'string' || !CARTA.test(carta)) throw new Error('Carta inválida');
  const rango = carta.slice(0, -1);
  return { valor: VALORES[rango] ?? Number(rango), palo: carta.slice(-1) };
}

function escaleraMayor(valores) {
  const unicos = [...new Set(valores)].sort((a, b) => b - a);
  if (unicos.includes(14)) unicos.push(1); // A-2-3-4-5
  for (let i = 0; i <= unicos.length - 5; i++) {
    if (unicos[i] - unicos[i + 4] === 4) return unicos[i];
  }
  return 0;
}

export function evaluarCinco(cartas) {
  if (!Array.isArray(cartas) || cartas.length !== 5 || new Set(cartas).size !== 5) throw new Error('Mano de cinco cartas inválida');
  const leidas = cartas.map(leerCarta);
  const valores = leidas.map((c) => c.valor).sort((a, b) => b - a);
  const grupos = [...new Set(valores)].map((valor) => ({ valor, cantidad: valores.filter((v) => v === valor).length }))
    .sort((a, b) => b.cantidad - a.cantidad || b.valor - a.valor);
  const color = leidas.every((c) => c.palo === leidas[0].palo);
  const escalera = escaleraMayor(valores);
  let categoria, desempate;
  if (color && escalera) { categoria = 8; desempate = [escalera]; }
  else if (grupos[0].cantidad === 4) { categoria = 7; desempate = [grupos[0].valor, grupos[1].valor]; }
  else if (grupos[0].cantidad === 3 && grupos[1].cantidad === 2) { categoria = 6; desempate = [grupos[0].valor, grupos[1].valor]; }
  else if (color) { categoria = 5; desempate = valores; }
  else if (escalera) { categoria = 4; desempate = [escalera]; }
  else if (grupos[0].cantidad === 3) { categoria = 3; desempate = [grupos[0].valor, ...grupos.slice(1).map((g) => g.valor).sort((a, b) => b - a)]; }
  else if (grupos[0].cantidad === 2 && grupos[1].cantidad === 2) { categoria = 2; desempate = [Math.max(grupos[0].valor, grupos[1].valor), Math.min(grupos[0].valor, grupos[1].valor), grupos[2].valor]; }
  else if (grupos[0].cantidad === 2) { categoria = 1; desempate = [grupos[0].valor, ...grupos.slice(1).map((g) => g.valor).sort((a, b) => b - a)]; }
  else { categoria = 0; desempate = valores; }
  return { categoria, desempate, mano: categoria === 8 && desempate[0] === 14 ? 'Escalera real' : MANOS[categoria] };
}

export function compararManos(a, b) {
  if (a.categoria !== b.categoria) return Math.sign(a.categoria - b.categoria);
  for (let i = 0; i < a.desempate.length; i++) {
    if (a.desempate[i] !== b.desempate[i]) return Math.sign(a.desempate[i] - b.desempate[i]);
  }
  return 0;
}

export function evaluarMejorMano(cartas) {
  if (!Array.isArray(cartas) || cartas.length !== 7 || new Set(cartas).size !== 7) throw new Error('Mano de siete cartas inválida');
  cartas.forEach(leerCarta);
  let mejor;
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 4; b++) for (let c = b + 1; c < 5; c++)
    for (let d = c + 1; d < 6; d++) for (let e = d + 1; e < 7; e++) {
      const actual = evaluarCinco([cartas[a], cartas[b], cartas[c], cartas[d], cartas[e]]);
      if (!mejor || compararManos(actual, mejor) > 0) mejor = actual;
    }
  return mejor;
}

// Cada calle quema una carta, como en una mesa de Hold'em.
export function avanzarMesa(fase, baraja, comunitarias) {
  const siguiente = { PREFLOP: ['FLOP', 3], FLOP: ['TURN', 1], TURN: ['RIVER', 1] }[fase];
  if (!siguiente) throw new Error('Fase inválida para avanzar');
  const disponibles = [...baraja];
  disponibles.pop();
  const nuevas = Array.from({ length: siguiente[1] }, () => disponibles.pop());
  if (nuevas.some((c) => !c)) throw new Error('Baraja incompleta');
  return { fase: siguiente[0], baraja: disponibles, comunitarias: [...comunitarias, ...nuevas] };
}

// Compatibilidad con las pruebas del contrato anterior; las partidas nuevas
// usan evaluarMejorMano y el motor de Texas Hold'em de arriba.
export function evaluarMano(cartas) {
  if (!Array.isArray(cartas) || cartas.length !== 5) throw new Error('Mano inválida');
  const evaluacion = evaluarCinco(cartas);
  const pagos = [0, 0, 2, 3, 4, 6, 9, 25, 50];
  let multiplicador = pagos[evaluacion.categoria] ?? 0;
  if (evaluacion.categoria === 8 && evaluacion.desempate[0] === 14) multiplicador = 800;
  if (evaluacion.categoria === 1) {
    multiplicador = evaluacion.desempate[0] >= 11 ? 1 : 0;
  }
  return { ...evaluacion, multiplicador };
}

export function cambiarCartas(cartas, baraja, conservar) {
  if (!Array.isArray(cartas) || cartas.length !== 5 || !Array.isArray(baraja)) throw new Error('Cartas inválidas');
  if (!Array.isArray(conservar) || new Set(conservar).size !== conservar.length || conservar.some((indice) => !Number.isInteger(indice) || indice < 0 || indice > 4)) {
    throw new Error('Índices inválidos');
  }
  const reemplazos = baraja.slice(0, 5 - conservar.length);
  let indice = 0;
  return cartas.map((carta, posicion) => conservar.includes(posicion) ? carta : reemplazos[indice++]);
}
