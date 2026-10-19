# Pendientes — Frontend Casino

> Última actualización: 19 oct 2026.
> Plan: [planfrontend.md](./planfrontend.md).
> Estado: planificación creada. No se implementó ni desplegó frontend en esta tarea. Todos los checks de implementación quedan abiertos.

## 1. Obligatorio — Contratos y dependencias backend

- [ ] Confirmar despliegue Render/PostgreSQL y URL de API, siguiendo [pendientes-backend.md](./pendientes-backend.md).
- [ ] Registrar contrato reutilizable con ejemplos sanitizados de solicitudes, respuestas y errores de los seis módulos; contrastarlo con API real.
- [ ] Confirmar DTOs de apuestas, formato de cartas, paginación y transporte Bearer/refresh/logout.
- [ ] Fijar unidad de saldo; presentar operaciones como simuladas y separar bono de saldo utilizable.
- [ ] Resolver exposición de la tabla completa de multiplicadores Plinko; acceso solo entrega máximos.
- [ ] Añadir recuperación segura de Blackjack activo: consulta por ID y descubrimiento de activas con ownership y carta oculta.
- [ ] Acordar cantidad de partidas activas por usuario y protección de acciones concurrentes.
- [ ] Resolver discrepancia de split: máximo anunciado de tres manos frente al rechazo de manos ya divididas.
- [ ] Incorporar acciones permitidas y mano activa en el contrato o documentar una alternativa verificable.
- [ ] Corregir/normalizar saldo final de start cuando hay natural; frontend reconsulta wallet.
- [ ] Definir idempotencia/reconciliación de mutaciones antes de habilitar reintentos; probar timeout con resultado incierto.
- [ ] Confirmar sesión solo en memoria para primera entrega. Si se requiere persistencia, implementar primero transporte seguro de refresh con soporte backend.

## 2. Obligatorio — Base y diseño responsive

- [ ] Crear `frontend/` con React, TypeScript, Vite y lockfile compatible.
- [ ] Configurar router, providers, cliente HTTP, errores, variables públicas y `.env.example`.
- [ ] Crear componentes compartidos, tokens visuales y layouts público/privado.
- [ ] Implementar carga, vacío, error, éxito, 404 y conexión pendiente.
- [ ] Verificar 320/375/768/1024/1440 px, landscape y zoom 200%, sin desbordamiento de página.
- [ ] Verificar teclado, foco, etiquetas, contraste, modales y movimiento reducido.

## 3. Obligatorio — Auth y perfil

- [ ] Registro validado y redirección a login; no asumir login automático.
- [ ] Login, rutas privadas y perfil confirmado por API.
- [ ] Refresh único ante 401 concurrentes, reemplazo de ambos tokens y prevención de bucles.
- [ ] Logout con revocación remota intentada y limpieza local completa incluso ante error de red.
- [ ] Cancelar solicitudes y descartar respuestas tardías al cambiar/cerrar sesión.
- [ ] Editar solo nombre y mostrar errores por campo.
- [ ] Comprobar que recargar exige login con la estrategia inicial y explicarlo en UX.

## 4. Obligatorio — Billetera y movimientos

- [ ] Integrar wallet y balance respetando las estadísticas anidadas en `historial`.
- [ ] Recarga y retiro con `{monto, metodo: "simulado"}`, sin datos de pago reales.
- [ ] Validar importes positivos, máximo y dos decimales; bloquear doble envío.
- [ ] Reconsultar saldo, estadísticas, perfil y movimientos después de mutaciones.
- [ ] Historial paginado con tipo, rango de fechas y zona horaria explícita.
- [ ] Retiro mayor al saldo muestra rechazo y no altera el saldo mostrado como confirmado.
- [ ] Ante timeout, reconciliar y no reenviar automáticamente la operación.

## 5. Obligatorio — Juegos

### 5.1 Plinko

- [ ] Acceso con saldo, límites por riesgo y enlace a billetera cuando corresponda.
- [ ] Tres riesgos integrados y tabla de slots contrastada con backend.
- [ ] Tablero de nueve filas/diez slots responsive; animación fiel a `ruta` del servidor.
- [ ] Bloqueo de apuesta durante solicitud/animación y alternativa sin movimiento.
- [ ] Resultado con retorno bruto, neto, multiplicador, saldo y rondas recientes.

### 5.2 Blackjack

- [ ] Acceso, límites, inicio y resolución natural en apertura.
- [ ] Cartas visibles/ocultas, primera mano ACTIVA y apuestas por mano.
- [ ] Pedir, plantarse, split y doble con estados válidos y rechazos claros.
- [ ] Rendición confirmada con devolución del 50% y diferenciada de navegar fuera de mesa.
- [ ] Resumen final y reconsulta de billetera; historial de partidas recientes.
- [ ] Recuperación tras recarga/reconexión con endpoints backend acordados.
- [ ] Acciones serializadas y resolución de errores/timeout sin duplicar jugadas.
- [ ] Manos legibles en móvil y controles accesibles.

## 6. Obligatorio — QA y publicación

- [ ] Tipos, lint, pruebas críticas y build en CI.
- [ ] Recorrido completo de cuenta, billetera, ambos juegos, movimientos y logout.
- [ ] Escenarios reproducibles para split, ases divididos, doble, empate, natural y rendición.
- [ ] Errores 400/401/403/404/409/429, red lenta, API caída y resultado de mutación incierto.
- [ ] Pruebas responsive y accesibles en navegadores disponibles, con evidencia registrada.
- [ ] Configurar Firebase Hosting para `frontend/dist`, fallback SPA y caché adecuada.
- [ ] Configurar `VITE_API_URL` de cada entorno y secretos de despliegue solo en CI.
- [ ] Completar CORS de Render con dominios reales Firebase y los de desarrollo/QA usados.
- [ ] Integrar flujo `dev → qa → main`, preview QA y despliegue de producción tras checks.
- [ ] Verificar desde Firebase publicado: registro/login, operaciones, juegos y recarga de rutas profundas.
- [ ] Comprobar que bundle/logs no contienen tokens ni secretos y que logout elimina datos privados.
- [ ] Documentar URL final, commit, fecha, ambiente, pruebas ejecutadas y rollback disponible.

## 7. Mejoras futuras

- [ ] Persistencia de sesión mediante refresh seguro con soporte backend, si se requiere.
- [ ] Telemetría de errores con datos sensibles excluidos.
- [ ] Historial de juegos con filtros/paginación adicionales si el backend los incorpora.
- [ ] Panel ADMIN, recuperación de contraseña, pagos reales, IA o multijugador solo con alcance y contratos nuevos.

## 8. Evidencia de esta revisión

- Revisados ambos Markdown del backend y contrastadas rutas, servicios, DTOs y middleware locales relevantes.
- Identificadas diferencias de balance, rondas, errores, recuperación de Blackjack, split y saldo de apertura.
- Creados plan y checklist de frontend. No se ejecutaron pruebas de aplicación, llamadas a Render, builds ni despliegues: el cambio es documental.
