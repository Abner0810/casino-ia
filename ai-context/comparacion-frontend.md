# Comparación frontend con dev — 19 oct 2026

Se revisó el prompt adjunto y se actualizó el checkout de Desktop existente, sin
duplicar la carpeta ni descartar `frontmedias`. `git fetch origin` identificó
`origin/dev` en **3e27a14**; se integró mediante merge **0e24a27**. El avance inicial
del frontend provenía de **75d2fff**. El backend actualizado se conserva tal como
viene de dev; sus cambios de dependencias pertenecen a ese merge. Las dependencias
y el lockfile del frontend permanecen iguales al avance recibido.

| Área | Estado recibido | Implementación completada |
| --- | --- | --- |
| Rutas y diseño | Pantallas generales y Plinko; import Blackjack inexistente | Todas las rutas del plan, Blackjack y carga por ruta |
| Contrato | Frontend anterior a la integración backend | Config Plinko remota, `{items}`, claves idempotentes, versiones y recuperación Blackjack |
| Sesión | Refresh coordinado inicial; logout sin Bearer | Rotación única, 401 tardíos, limpieza local, revocación Bearer y descarte de respuestas de otra sesión |
| Dinero | Posibilidad de liberar incertidumbre con solo consultar saldo | UUID por operación, consulta de operación exacta, sin repetición automática y bloqueo de doble envío |
| Juegos | Plinko parcial; Blackjack ausente | Plinko SVG y cartas SVG; acciones permitidas por servidor, varias manos, natural, doble, split y rendición confirmada |
| QA | Sin suites ni config E2E | Vitest/Testing Library, Playwright desktop/móvil y pruebas de hooks |
| Agentes | Config OpenCode incompleta | Cinco roles en cada cliente, hooks reales, integridad del lockfile y guía de activación |
| Publicación | firebase.json parcial, CI solo backend | Proyecto correcto, SPA/cache, CI frontend, QA preview y live main con integración backend como gate |

## Límites externos

- El usuario confirmó que **todavía no existe URL pública del backend**. La
  publicación inicial muestra conexión pendiente; no simula cuentas ni saldos.
- Cuenta local confirmada con acceso a **casino-ia-4e7b6**. El enlace original a
  `casino-ia` correspondía a otro ID; el nuevo ID se usa en toda la configuración.
- El secret GitHub `FIREBASE_SERVICE_ACCOUNT_CASINO_IA` debe configurarse en la
  cuenta del repositorio. No se entregaron credenciales GitHub para verificarlo.
- Activar API requiere VITE_API_URL, CORS, base de datos y migraciones en Render;
  después debe probarse el recorrido completo desde Firebase contra esa API real.
- OpenCode **sí está instalado en esta máquina** (corrección 19 oct 2026: la sesión de
  auditoría opera en OpenCode). Los handlers de hooks tienen pruebas unitarias, pero la
  carga del plugin `casino-guardia` dentro del cliente **no se confirmó** en esta revisión.
  Codex requiere revisar y confiar en sus hooks según las reglas del cliente.
- Las comprobaciones de accesibilidad automatizadas no constituyen certificación
  WCAG; contraste, lectores de pantalla, zoom y otros navegadores requieren revisión.

## Evidencia ejecutada

- Rama de entrega: `feat/frontend-completo`, basada en el merge `0e24a27`.
  El commit final se identifica con `git log -1` en esa rama. **Actualización 19 oct:**
  la rama sí se publicó y fue mergeada a `dev` mediante el PR #3 ("completar frontend y
  Firebase Hosting").
- TypeScript, ESLint y build de producción: aprobados. `git diff 75d2fff --
  frontend/package.json frontend/package-lock.json` no muestra cambios.
- Vitest: **33 pruebas**, ocho archivos, aprobadas.
- Playwright Chromium: **8 pruebas aprobadas**, desktop y móvil. Flujos con API
  interceptada: registro, login, recarga, Plinko, Blackjack, rendición, recuperación
  de mesa, movimientos, retiro rechazado, logout y sesión al recargar. Anchos
  320/375/768/1024/1440 sin desbordamiento horizontal en las pantallas comprobadas.
- Hooks Node: **6 pruebas aprobadas** e integridad del stack verificada.
- Backend integrado: generación Prisma, **11 pruebas de lógica/contrato** y siete
  comprobaciones smoke de middleware aprobadas. Health devolvió 503 con DB de
  prueba no disponible. No se ejecutó integración contra PostgreSQL en esta entrega:
  Docker no estaba iniciado. El nuevo workflow provisiona PostgreSQL 18 y ejecuta verify.
- Los cinco workflows se analizaron como YAML válido y **ya se ejecutaron en GitHub**
  (19 oct 2026, 18 runs): `Backend checks` y `Frontend checks` en verde; los runs #2 y #3
  de `Deploy backend to Render` fallaron por timeout de salud; `Firebase Hosting` sigue
  con **0 ejecuciones** (la publicación actual fue manual por CLI).
- **Firebase Hosting publicado** el 19 oct 2026 a las 12:51 (America/La_Paz),
  canal live, proyecto casino-ia-4e7b6. Versión **8b5aa58b6e8dd466**;
  release **1792428699811000**. URL: https://casino-ia-4e7b6.web.app
- Smoke de Chromium contra Firebase: `/`, `/registro`, `/login` y
  `/juegos/blackjack` respondieron HTTP 200; fallback SPA, guard privado y aviso
  de conexión pendiente correctos; sin errores JavaScript ni overflow móvil.
  Captura local: `frontend/test-results/firebase-mobile.png` (ignorada por Git).

La guía reproducible de configuración está en [frontend/README.md](../frontend/README.md).

## Mapa de conocimiento

[[cerebro/Inicio|Casino IA · Segundo cerebro]] · [[cerebro/Guia del grafo|Guía del grafo de Obsidian]]
