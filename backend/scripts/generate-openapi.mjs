import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { PLINKO_FILAS, PLINKO_RIESGOS } from '../src/modules/games/plinko/plinko.config.js';
import { BLACKJACK_LIMITES } from '../src/modules/games/blackjack/blackjack.config.js';

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const str = { type: 'string' };
const integer = { type: 'integer', minimum: 0 };
const money = { type: 'number', minimum: 0, description: 'Créditos simulados, dos decimales. Saldo máximo 9999999999.99; agregados históricos pueden superarlo. No es dinero real.' };
const date = { type: 'string', format: 'date-time' };
const uuid = { type: 'string', format: 'uuid' };
const array = (items) => ({ type: 'array', items });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const schemas = {
  Error: object({ error: str, codigo: str, requestId: uuid, detalles: {} }, ['error', 'codigo', 'requestId']),
  Nombre: { type: 'string', minLength: 2, maxLength: 80 },
  Money: money,
  RegisterInput: object({ email: { type: 'string', format: 'email', maxLength: 150 }, password: { type: 'string', minLength: 8, maxLength: 72 }, nombre: ref('Nombre') }),
  LoginInput: object({ email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 1 } }),
  RefreshInput: object({ refreshToken: { type: 'string', minLength: 20 } }),
  Tokens: object({ accessToken: str, refreshToken: str, tokenType: { type: 'string', enum: ['Bearer'] }, expiresInMinutes: { type: 'integer', enum: [30] } }),
  Usuario: object({ publicId: str, email: { type: 'string', format: 'email' }, nombre: str, rol: { type: 'string', enum: ['JUGADOR', 'ADMIN'] } }),
  Profile: { allOf: [ref('Usuario'), object({ wallet: object({ saldo: money, bono: money }), creadoEn: date })] },
  Wallet: object({ saldo: money, bono: money, totalDisponible: money, actualizadoEn: date }),
  Balance: object({ saldo: money, bono: money, total: money, historial: object({ totalApostado: money, totalGanado: money, cantidadApuestas: integer, cantidadPremios: integer, totalDepositado: money, totalRetirado: money, resultadoNeto: { type: 'number' } }) }),
  TransactionInput: object({ monto: { type: 'number', exclusiveMinimum: 0, maximum: 1000000, multipleOf: 0.01 }, metodo: { type: 'string', enum: ['simulado'], default: 'simulado' } }, ['monto']),
  MutationResult: object({ mensaje: str, saldoActual: money, operationId: uuid }),
  Movement: object({ id: uuid, tipo: { type: 'string', enum: ['DEPOSITO', 'RETIRO', 'APUESTA', 'PREMIO'] }, monto: money, saldoAntes: money, saldoDespues: money, juego: { type: ['string', 'null'] }, descripcion: str, fecha: date }),
  History: object({ items: array(ref('Movement')), paginacion: object({ pagina: { type: 'integer', minimum: 1 }, porPagina: { type: 'integer', minimum: 1, maximum: 100 }, total: integer, totalPaginas: integer }) }),
  Riesgo: { type: 'string', enum: Object.keys(PLINKO_RIESGOS) },
  PlinkoBet: object({ apuesta: { type: 'number', exclusiveMinimum: 0, multipleOf: 0.01 }, riesgo: ref('Riesgo') }),
  PlinkoConfig: object({ filas: { const: PLINKO_FILAS }, slots: { const: PLINKO_FILAS + 1 }, direcciones: array({ type: 'string', enum: ['I', 'D'] }), unidad: { const: 'creditos_simulados' }, riesgos: array(object({ riesgo: ref('Riesgo'), apuestaMinima: money, apuestaMaxima: money, multiplicadores: { type: 'array', minItems: 10, maxItems: 10, items: { type: 'number', minimum: 0 } } })) }),
  PlinkoResult: object({ rondaId: uuid, slot: { type: 'integer', minimum: 0, maximum: 9 }, riesgo: ref('Riesgo'), apuesta: money, multiplicador: { type: 'number' }, ganancia: money, ruta: { type: 'array', minItems: 9, maxItems: 9, items: { type: 'string', enum: ['I', 'D'] } }, gananciaNeta: { type: 'number' }, saldoActual: money, operationId: uuid }),
  PlinkoRound: object({ id: uuid, riesgo: ref('Riesgo'), apuesta: money, multiplicador: { type: 'number' }, ganancia: money, ruta: array({ type: 'string', enum: ['I', 'D'] }), fecha: date }),
  BlackjackStart: object({ apuesta: { type: 'number', minimum: BLACKJACK_LIMITES.MIN, maximum: BLACKJACK_LIMITES.MAX, multipleOf: 0.01 } }),
  BlackjackAction: { ...object({ version: integer }), additionalProperties: false },
  Hand: object({ cartas: array(str), valor: integer, apuesta: money, estado: { type: 'string', enum: ['ACTIVA', 'PLANTADO', 'GANADA', 'PERDIDA', 'EMPATE', 'RENDIDA'] }, ganancia: { type: ['number', 'null'] }, dividida: { type: 'boolean' }, doblada: { type: 'boolean' } }),
  GameState: { type: 'string', enum: ['ACTIVA', 'GANADA', 'PERDIDA', 'EMPATE', 'RENDIDA'] },
  Blackjack: object({ partidaId: uuid, version: integer, indiceManoActiva: { type: ['integer', 'null'], minimum: 0 }, estado: ref('GameState'), apuestaBase: money, apuestaTotal: money, dealer: object({ cartas: array(str), totalVisible: integer }), manos: array(ref('Hand')), cartasRestantes: integer, resultado: { type: ['object', 'null'] }, accionesPermitidas: array({ type: 'string', enum: ['hit', 'stand', 'split', 'double', 'exit'] }), saldoActual: money, mensaje: str, devuelto: money, operationId: uuid }, ['partidaId', 'version', 'indiceManoActiva', 'estado', 'apuestaBase', 'apuestaTotal', 'dealer', 'manos', 'cartasRestantes', 'resultado', 'accionesPermitidas', 'saldoActual']),
  BlackjackRound: object({ id: uuid, apuesta: money, estado: ref('GameState'), resultado: { type: ['object', 'null'] }, creadaEn: date, cerradaEn: { type: ['string', 'null'], format: 'date-time' } }),
  Operation: object({ id: uuid, operation: str, status: { type: 'integer' }, response: { type: 'object', description: 'Respuesta JSON original de la mutación, incluido operationId.' }, createdAt: date, estado: { const: 'CONFIRMADA' } }),
};

const paths = {};
schemas.RegisterInput.example = { email: 'jugador@example.test', password: 'example-only-password', nombre: 'Jugador Demo' };
schemas.LoginInput.example = { email: 'jugador@example.test', password: 'example-only-password' };
schemas.TransactionInput.example = { monto: 100, metodo: 'simulado' };
schemas.BlackjackStart.example = { apuesta: 10 };
schemas.BlackjackAction.example = { version: 0 };
schemas.PlinkoBet.example = { apuesta: 10, riesgo: 'PEQUENO' };
schemas.Error.example = { error: 'La partida cambió. Consulta su estado actual.', codigo: 'STALE_VERSION', requestId: 'bd61d740-589b-48a6-98e7-b07f93040b4e' };
schemas.Wallet.example = { saldo: 100, bono: 0, totalDisponible: 100, actualizadoEn: '2026-10-19T16:00:00Z' };
schemas.Blackjack.example = { partidaId: 'bd61d740-589b-48a6-98e7-b07f93040b4e', version: 0, indiceManoActiva: 0, estado: 'ACTIVA', apuestaBase: 10, apuestaTotal: 10, dealer: { cartas: ['10♣', '🂠'], totalVisible: 10 }, manos: [{ cartas: ['8♠', '8♥'], valor: 16, apuesta: 10, estado: 'ACTIVA', ganancia: null, dividida: false, doblada: false }], cartasRestantes: 308, resultado: null, accionesPermitidas: ['hit', 'stand', 'exit', 'double', 'split'], saldoActual: 90 };
const json = (schema, example) => ({ 'application/json': { schema, ...(example ? { example } : {}) } });
const key = { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 8, maxLength: 128, pattern: '^[A-Za-z0-9_-]+$' }, description: 'Clave por intención y usuario. Reutilizar con el mismo body y recurso recupera la respuesta original; otro payload produce 409. No se purgan claves automáticamente.' };
const id = { name: 'id', in: 'path', required: true, schema: uuid };
function endpoint(path, method, summary, { input, output, example, status = 200, publicRoute = false, mutation = false, params = [], description = '' } = {}) {
  const response = { description: 'Operación completada', content: json(output ?? object({ mensaje: str }), example) };
  if (mutation) response.headers = { 'Idempotency-Replayed': { schema: { type: 'boolean' }, description: 'true si devuelve la respuesta almacenada, sin nuevos efectos.' } };
  paths[path] ??= {};
  paths[path][method] = {
    operationId: `${method}_${path.replace(/[^a-zA-Z0-9]+/g, '_')}`,
    summary, description,
    ...(publicRoute ? { security: [] } : {}),
    ...(params.length || mutation ? { parameters: [...params, ...(mutation ? [key] : [])] } : {}),
    ...(input ? { requestBody: { required: true, content: json(input) } } : {}),
    responses: { [status]: response, ...Object.fromEntries([400, 401, 403, 404, 409, 429, 500].map((code) => [code, { description: { 400: 'Datos o regla de negocio inválidos', 401: 'Credenciales ausentes, vencidas o inválidas', 403: 'Acceso denegado', 404: 'Recurso inexistente o ajeno', 409: 'Conflicto de clave, versión o partida activa', 429: 'Límite de solicitudes; respetar Retry-After', 500: 'Fallo inesperado; reconciliar mutaciones antes de reenviar' }[code], content: json(ref('Error')) }])) },
  };
}
paths['/'] = {
  get: {
    summary: 'Abre la interfaz del casino en Firebase',
    security: [],
    responses: {
      '302': {
        description: 'Redirección temporal a la aplicación pública',
        headers: {
          Location: { schema: { type: 'string', format: 'uri', const: 'https://casino-ia-4e7b6.web.app' } },
          'Cache-Control': { schema: { type: 'string', const: 'no-store' } },
        },
      },
    },
  },
};
endpoint('/health', 'get', 'Verifica API y DB', { publicRoute: true, output: object({ status: { enum: ['ok', 'degraded'] }, db: { enum: ['up', 'down'] } }) });
paths['/health'].get.responses['503'] = { description: 'Base no disponible', content: json(object({ status: { const: 'degraded' }, db: { const: 'down' } })) };
endpoint('/api/auth/register', 'post', 'Crea cuenta y wallet vacía', { input: ref('RegisterInput'), output: object({ publicId: str, email: str, nombre: str, mensaje: str }), status: 201, publicRoute: true });
endpoint('/api/auth/login', 'post', 'Inicia sesión', { input: ref('LoginInput'), output: { allOf: [ref('Tokens'), object({ usuario: ref('Usuario') })] }, publicRoute: true });
endpoint('/api/auth/refresh', 'post', 'Consume refresh y rota tokens', { input: ref('RefreshInput'), output: ref('Tokens'), publicRoute: true, description: 'Refresh opaco de 7 días. Un solo consumo concurrente prospera. Token anterior revocado; no requiere access vigente.' });
endpoint('/api/auth/logout', 'post', 'Revoca refresh de la sesión propia', { input: ref('RefreshInput'), description: 'Requiere Bearer vigente. Token ajeno/desconocido no se revoca y recibe respuesta genérica. No revoca inmediatamente access JWT emitidos.' });
endpoint('/api/users/profile', 'get', 'Consulta perfil propio', { output: ref('Profile') });
endpoint('/api/users/profile', 'patch', 'Edita nombre propio', { input: object({ nombre: ref('Nombre') }), output: { allOf: [ref('Profile'), object({ mensaje: str })] } });
endpoint('/api/users/games/{juego}/access', 'post', 'Valida acceso con saldo positivo y entrega límites', { params: [{ name: 'juego', in: 'path', required: true, schema: { type: 'string', enum: ['plinko', 'blackjack'] } }], output: object({ juego: str, saldo: money, riesgos: array(object({ riesgo: ref('Riesgo'), apuestaMinima: money, apuestaMaxima: money, maximoMultiplicador: { type: 'number' } })), mesa: object({ apuestaMinima: money, apuestaMaxima: money, reglas: array(str) }) }, ['juego', 'saldo']) });
endpoint('/api/wallet', 'get', 'Consulta saldo y bono separados', { output: ref('Wallet') });
endpoint('/api/wallet/balance', 'get', 'Consulta consolidado consistente', { output: ref('Balance'), description: 'totalGanado incluye premios y devoluciones (PREMIO). resultadoNeto = totalGanado - totalApostado. Bono no utilizable en juegos o retiros.' });
for (const action of ['deposit', 'withdraw']) endpoint(`/api/transactions/${action}`, 'post', action === 'deposit' ? 'Recarga simulada' : 'Retiro simulado', { input: ref('TransactionInput'), output: ref('MutationResult'), mutation: true, status: action === 'deposit' ? 201 : 200 });
endpoint('/api/transactions/history', 'get', 'Historial propio paginado', { output: ref('History'), params: [
  { name: 'pagina', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'porPagina', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  { name: 'tipo', in: 'query', schema: { type: 'string', enum: ['DEPOSITO', 'RETIRO', 'APUESTA', 'PREMIO'] } },
  ...['desde', 'hasta'].map((name) => ({ name, in: 'query', schema: date, description: 'ISO 8601 con zona explícita; inclusivo. desde <= hasta.' })),
], description: 'Orden createdAt DESC e id DESC. No ofrece snapshot entre páginas; recargar página 1 tras mutaciones.' });
endpoint('/api/games/plinko/config', 'get', 'Configuración de tablero, incluso con saldo cero', { output: ref('PlinkoConfig') });
endpoint('/api/games/plinko/bet', 'post', 'Resuelve una apuesta Plinko', { input: ref('PlinkoBet'), output: ref('PlinkoResult'), mutation: true, status: 201, description: 'ganancia es retorno bruto, gananciaNeta descuenta apuesta. La ruta representa el resultado servidor. Seed solo para auditoría interna.' });
endpoint('/api/games/plinko/rounds', 'get', 'Últimas diez rondas propias', { output: object({ items: array(ref('PlinkoRound')) }) });
endpoint('/api/games/blackjack/start', 'post', 'Inicia única partida activa', { input: ref('BlackjackStart'), output: ref('Blackjack'), status: 201, mutation: true, description: 'Puede terminar por natural. saldoActual ya incluye liquidación. Si existe activa: 409 con detalles.partidaId.' });
endpoint('/api/games/blackjack/active', 'get', 'Recupera partida activa propia', { output: object({ partida: { anyOf: [ref('Blackjack'), { type: 'null' }] } }) });
endpoint('/api/games/blackjack/rounds', 'get', 'Últimas diez partidas propias', { output: object({ items: array(ref('BlackjackRound')) }) });
endpoint('/api/games/blackjack/{id}', 'get', 'Consulta partida propia activa o terminada', { output: ref('Blackjack'), params: [id], description: 'Nunca muestra baraja. Carta oculta como 🂠 y resultado null mientras ACTIVA. Tras login se puede reconstruir la mesa con /active.' });
for (const action of ['hit', 'stand', 'split', 'double', 'exit']) endpoint(`/api/games/blackjack/{id}/${action}`, 'post', `Blackjack: ${action}`, { input: ref('BlackjackAction'), output: ref('Blackjack'), mutation: true, params: [id], description: 'Enviar version de última consulta. Versión antigua: 409 STALE_VERSION sin efectos. Repetir misma clave/body devuelve respuesta original antes de comprobar versión. split hasta 3 manos, doble tras split permitido, ases divididos reciben una carta y se plantan. exit rinde toda la mesa y devuelve 50% del total, incluido lo apostado en manos ya perdidas/plantadas; regla particular del simulador.' });
endpoint('/api/operations/{key}', 'get', 'Recupera resultado confirmado de una mutación', { params: [{ name: 'key', in: 'path', required: true, schema: str }], output: ref('Operation'), description: '404 puede significar solicitud aún en curso, rollback, clave ajena o desconocida. No prueba por sí solo que la intención no se ejecutó. Repetir exactamente la mutación con la misma clave es seguro; no generar una nueva.' });

export const contract = {
  openapi: '3.1.0',
  info: { title: 'Casino Simulador API', version: '1.1.0', description: 'Créditos simulados. Bearer access 30 min y refresh opaco 7 días en JSON. Sesión del navegador solo en memoria en la primera entrega. Mutaciones monetarias exigen Idempotency-Key; acciones Blackjack exigen version. Todas las fechas llevan zona. Nuevos requisitos de headers/body son cambios de contrato respecto a 1.0.' },
  servers: [{ url: 'http://localhost:3000', description: 'Desarrollo; sustituir origen al consumir en QA/producción' }],
  security: [{ bearerAuth: [] }],
  paths,
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas },
};

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  writeFileSync(new URL('../openapi.json', import.meta.url), JSON.stringify(contract, null, 2) + '\n');
}
