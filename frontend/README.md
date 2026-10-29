# Frontend Casino IA

SPA en español: React + TypeScript + Vite, React Router, TanStack Query,
React Hook Form + Zod y CSS Modules. Se conservan package.json y package-lock.json
recibidos de `frontmedias`; las mejoras de backend se integraron desde `origin/dev`.

## Desarrollo

Usar Node 22.23.4 (ver `.nvmrc` en la raíz) y las dependencias fijadas:

```powershell
cd frontend
npm.cmd ci
Copy-Item .env.example .env.local
# Editar VITE_API_URL con http://localhost:3000/api o la API pública.
npm.cmd run dev
```

No ejecutar create-next-app ni actualizar paquetes. Si `VITE_API_URL` está vacía,
la interfaz muestra conexión pendiente y no envía solicitudes a un backend ficticio.
La variable es pública; jamás poner secretos en variables VITE_. Las sesiones y
ambos tokens viven en memoria: recargar exige login. Blackjack se recupera desde
el servidor después de volver a iniciar sesión. Poker también recupera
la mano activa; la ruleta y Poker muestran pagos y resultados confirmados
por la API.

## Verificación

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd --no-install playwright install chromium
npm.cmd run e2e
# Desde la raíz:
node scripts/agent-policy.mjs --release
node --test scripts/agent-policy.test.mjs
```

Vitest verifica transporte, concurrencia de refresh, cancelación de sesión,
operaciones idempotentes, formularios/utilidades, modal y Blackjack. Playwright
usa respuestas interceptadas para repetir recorridos en Chromium de escritorio
y móvil, incluidos la ruleta, Poker y el saldo, sin depender de Render.
Estos recorridos no certifican una API remota.

## Firebase Hosting y Actions

Proyecto real: **casino-ia-4e7b6** (nombre visible casino-ia). Hosting se ejecuta
desde `frontend/`; `dist` es relativo a esa carpeta. `.firebaserc` selecciona el
proyecto. Firebase solo aloja el frontend; autenticación y datos siguen en Express.

1. Firebase → Configuración del proyecto → Cuentas de servicio: preparar una
   cuenta de servicio con los permisos de Hosting necesarios. La integración
   oficial `firebase init hosting:github` también puede crear esta credencial.
2. GitHub → Settings → Secrets and variables → Actions: añadir el secret
   `FIREBASE_SERVICE_ACCOUNT_CASINO_IA` con el JSON de **casino-ia-4e7b6**.
   No guardar el JSON en el repositorio, chat ni variables VITE_.
3. El workflow usa `https://casino-ia-9llp.onrender.com/api` como API pública
   predeterminada. La variable de Actions `VITE_API_URL` permite cambiarla;
   para QA se admite `VITE_API_URL_QA`, que tiene prioridad en esa rama.
   La configuración se incorpora al bundle durante el build: cambiar una variable
   de Actions requiere otro despliegue. La publicación rechaza una URL vacía o inválida.
4. En Render, configurar `CORS_ORIGINS` con los orígenes reales separados por coma:
   `https://casino-ia-4e7b6.web.app,https://casino-ia-4e7b6.firebaseapp.com`.
   Agregar el origen exacto de preview QA cuando se utilice; no usar `*` en producción.
5. Promover `dev → qa → main`. Push a `qa` publica canal temporal QA (7 días);
   push a `main` publica `live`. Los checks de frontend y la integración backend
   con PostgreSQL 18 deben pasar antes del despliegue. Cada run deja el enlace
   real en su resumen y en el environment de GitHub.

El workflow también puede lanzarse manualmente desde main/qa. Los cambios locales
no activan Actions hasta que se publiquen en GitHub. Ejecutar
`node scripts/agent-policy.mjs --release` desde la raíz antes de publicar y respetar
la autorización vigente para push/despliegue. Confirmar el run de Actions y probar
registro/login desde la URL publicada antes de dar el despliegue por verificado.

Despliegue manual, desde frontend:

```powershell
firebase.cmd login
npm.cmd run build
firebase.cmd deploy --only hosting --project casino-ia-4e7b6
```

URL de producción: https://casino-ia-4e7b6.web.app

Hosting reescribe rutas profundas a index.html; assets con hash se cachean un año
y HTML se revalida. No se publican sourcemaps. Para rollback, usar Hosting →
Historial de versiones → revertir a una publicación anterior compatible con la API,
o volver a desplegar el commit anterior. No revertir migraciones de base de datos.

Referencia: [Integración oficial Firebase y GitHub](https://firebase.google.com/docs/hosting/github-integration).
Agentes y hooks: [docs/agentes.md](../docs/agentes.md).
Comparación y evidencia: [comparacion-frontend.md](../ai-context/comparacion-frontend.md).
