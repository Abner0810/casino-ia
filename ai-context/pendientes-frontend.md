# Pendientes — Frontend Casino

> Última actualización: 19 oct 2026.
> Plan: [planfrontend.md](./planfrontend.md).
> Estado: frontend implementado e integrado con dev. Ver [comparación y evidencia](./comparacion-frontend.md). Los checks abiertos identifican validaciones o dependencias todavía pendientes; no equivalen a funcionalidades inexistentes.

## 1. Obligatorio — Contratos y dependencias backend

- [ ] Confirmar despliegue Render/PostgreSQL y URL de API, siguiendo [pendientes-backend.md](./pendientes-backend.md). *(Estado 19 oct 2026: `https://casino-ia-9llp.onrender.com/health` responde **503**; sigue pendiente.)*
- [ ] Registrar contrato reutilizable con ejemplos sanitizados de solicitudes, respuestas y errores de los seis módulos; contrastarlo con API real.
- [x] Confirmar DTOs de apuestas, formato de cartas, paginación y transporte Bearer/refresh/logout.
- [ ] Fijar unidad de saldo; presentar operaciones como simuladas y separar bono de saldo utilizable.
- [x] Resolver exposición de la tabla completa de multiplicadores Plinko; acceso solo entrega máximos.
- [x] Añadir recuperación segura de Blackjack activo: consulta por ID y descubrimiento de activas con ownership y carta oculta.
- [x] Acordar cantidad de partidas activas por usuario y protección de acciones concurrentes.
- [x] Resolver discrepancia de split: máximo anunciado de tres manos frente al rechazo de manos ya divididas.
- [x] Incorporar acciones permitidas y mano activa en el contrato o documentar una alternativa verificable.
- [x] Corregir/normalizar saldo final de start cuando hay natural; frontend reconsulta wallet.
- [ ] Definir idempotencia/reconciliación de mutaciones antes de habilitar reintentos; probar timeout con resultado incierto.
- [x] Confirmar sesión solo en memoria para primera entrega. Si se requiere persistencia, implementar primero transporte seguro de refresh con soporte backend.

## 2. Obligatorio — Base y diseño responsive

- [x] Crear `frontend/` con React, TypeScript, Vite y lockfile compatible.
- [x] Configurar router, providers, cliente HTTP, errores, variables públicas y `.env.example`.
- [x] Crear componentes compartidos, tokens visuales y layouts público/privado.
- [x] Implementar carga, vacío, error, éxito, 404 y conexión pendiente.
- [ ] Verificar 320/375/768/1024/1440 px, landscape y zoom 200%, sin desbordamiento de página.
- [ ] Verificar teclado, foco, etiquetas, contraste, modales y movimiento reducido.

## 3. Obligatorio — Auth y perfil

- [x] Registro validado y redirección a login; no asumir login automático.
- [x] Login, rutas privadas y perfil confirmado por API (contrato local; API remota pendiente).
- [x] Refresh único ante 401 concurrentes, reemplazo de ambos tokens y prevención de bucles.
- [x] Logout con revocación remota intentada y limpieza local completa incluso ante error de red.
- [x] Cancelar solicitudes y descartar respuestas tardías al cambiar/cerrar sesión.
- [x] Editar solo nombre y mostrar errores por campo.
- [x] Comprobar que recargar exige login con la estrategia inicial y explicarlo en UX.

## 4. Obligatorio — Billetera y movimientos

- [x] Integrar wallet y balance respetando las estadísticas anidadas en `historial`.
- [x] Recarga y retiro con `{monto, metodo: "simulado"}`, sin datos de pago reales.
- [x] Validar importes positivos, máximo y dos decimales; bloquear doble envío.
- [x] Limitar cada retiro a 500 en formulario y backend, con pruebas de frontera 500/500,01.
- [x] Reconsultar saldo, estadísticas, perfil y movimientos después de mutaciones.
- [x] Historial paginado con tipo, rango de fechas y zona horaria explícita.
- [x] Retiro mayor al saldo muestra rechazo y no altera el saldo mostrado como confirmado.
- [x] Ante timeout, reconciliar y no reenviar automáticamente la operación.

## 5. Obligatorio — Juegos

### 5.1 Plinko

- [x] Acceso con saldo, límites por riesgo y enlace a billetera cuando corresponda.
- [x] Tres riesgos integrados y tabla de slots contrastada con backend.
- [x] Tablero de nueve filas/diez slots responsive; animación fiel a `ruta` del servidor.
- [x] Bloqueo de apuesta durante solicitud/animación y alternativa sin movimiento.
- [x] Resultado con retorno bruto, neto, multiplicador, saldo y rondas recientes.

### 5.2 Blackjack

- [x] Acceso, límites, inicio y resolución natural en apertura.
- [x] Apuesta inicial de Blackjack hasta 10.000; frontend toma el máximo de la API y backend aplica el mismo límite.
- [x] Cartas visibles/ocultas, primera mano ACTIVA y apuestas por mano.
- [x] Pedir, plantarse, split y doble con estados válidos y rechazos claros.
- [x] Rendición confirmada con devolución del 50% y diferenciada de navegar fuera de mesa.
- [x] Resumen final y reconsulta de billetera; historial de partidas recientes.
- [x] Recuperación tras recarga/reconexión con endpoints backend acordados.
- [x] Acciones serializadas y resolución de errores/timeout sin duplicar jugadas.
- [x] Manos legibles en móvil y controles accesibles.

## 6. Obligatorio — QA y publicación

- [x] Tipos, lint, pruebas críticas y build en CI (ejecutado en GitHub Actions: `Frontend checks` en verde con typecheck, lint, Vitest, build y e2e Playwright — verificado 19 oct 2026).
- [ ] Recorrido completo de cuenta, billetera, ambos juegos, movimientos y logout.
- [ ] Escenarios reproducibles para split, ases divididos, doble, empate, natural y rendición.
- [ ] Errores 400/401/403/404/409/429, red lenta, API caída y resultado de mutación incierto.
- [ ] Pruebas responsive y accesibles en navegadores disponibles, con evidencia registrada.
- [x] Configurar Firebase Hosting para `frontend/dist`, fallback SPA y caché adecuada.
- [ ] Configurar `VITE_API_URL` de cada entorno y secretos de despliegue solo en CI.
- [ ] Completar CORS de Render con dominios reales Firebase y los de desarrollo/QA usados.
- [x] Integrar flujo `dev → qa → main`, preview QA y despliegue de producción tras checks (requiere secret GitHub).
- [ ] Verificar desde Firebase publicado: registro/login, operaciones, juegos y recarga de rutas profundas.
- [ ] Comprobar que bundle/logs no contienen tokens ni secretos y que logout elimina datos privados.
- [ ] Documentar URL final, commit, fecha, ambiente, pruebas ejecutadas y rollback disponible.

## 7. Mejoras futuras

- [ ] Persistencia de sesión mediante refresh seguro con soporte backend, si se requiere.
- [ ] Telemetría de errores con datos sensibles excluidos.
- [ ] Historial de juegos con filtros/paginación adicionales si el backend los incorpora.
- [ ] Panel ADMIN, pagos reales, IA o multijugador solo con alcance y contratos nuevos.
- [x] Cambio de contraseña autenticado (`POST /api/auth/change-password` + tarjeta «Seguridad» en el perfil): exige la actual, revoca todas las sesiones y obliga a re-loguear.
- [ ] Recuperación de contraseña (correo de restablecimiento): fuera de alcance; requiere proveedor de email y una dependencia nueva que `AGENTS.md` prohíbe sin aprobación.

## 8. Evidencia de esta revisión

- Revisados ambos Markdown del backend y contrastadas rutas, servicios, DTOs y middleware locales relevantes.
- Identificadas diferencias de balance, rondas, errores, recuperación de Blackjack, split y saldo de apertura.
- La revisión inicial era documental. La implementación posterior, las pruebas realmente ejecutadas y los bloqueos externos están en [comparacion-frontend.md](./comparacion-frontend.md).

## Mapa de conocimiento

[[cerebro/Inicio|Casino IA · Segundo cerebro]] · [[cerebro/Guia del grafo|Guía del grafo de Obsidian]]
