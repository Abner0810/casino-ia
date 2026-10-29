import { RULETA_PAGOS, NUMEROS_ROJOS } from './roulette.config.js';

export const colorDe = (numero) => numero === 0 ? 'verde' : NUMEROS_ROJOS.has(numero) ? 'rojo' : 'negro';

export function pagoDe(numero, tipo, seleccion) {
  if (tipo === 'pleno') return numero === seleccion ? RULETA_PAGOS.pleno : 0;
  if (numero === 0) return 0;
  if (tipo === 'color') return colorDe(numero) === seleccion ? RULETA_PAGOS.color : 0;
  if (tipo === 'paridad') return (numero % 2 === 0 ? 'par' : 'impar') === seleccion ? RULETA_PAGOS.paridad : 0;
  if (tipo === 'docena') return Math.ceil(numero / 12) === seleccion ? RULETA_PAGOS.docena : 0;
  if (tipo === 'columna') return ((numero - 1) % 3) + 1 === seleccion ? RULETA_PAGOS.columna : 0;
  return 0;
}
