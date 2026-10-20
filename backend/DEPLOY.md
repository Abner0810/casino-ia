# Backend en Render

Servicio de produccion: https://casino-ia-9llp.onrender.com

Abrir `/` redirige con HTTP 302 a https://casino-ia-4e7b6.web.app.
La API conserva sus rutas `/api/*`; `/health` sigue comprobando API y base de datos.

Render usa `backend` como Root Directory, Node 22 y el build
`npm ci && npm run build && npm run migrate:deploy`. Configurar las variables
DATABASE_URL, DIRECT_URL, secretos JWT independientes de al menos 32 caracteres
y CORS_ORIGINS con origenes HTTPS permitidos. Las migraciones deben ser
compatibles con la version que todavia esta sirviendo trafico.

El secreto de GitHub `RENDER_DEPLOY_HOOK_URL` contiene el deploy hook del
servicio. No publicar su URL: incluye una credencial. El workflow no necesita
RENDER_API_KEY ni RENDER_SERVICE_ID para usar este mecanismo.

Un push a main o una ejecucion manual de Actions > Deploy backend to Render
sobre dev, main o backend/polish-render ejecuta checks y unit tests antes de las
migraciones y los E2E sobre PostgreSQL 18 aislado. Solo despues invoca el hook
con `ref` igual al SHA completo validado. Segun Render, desplegar un commit
especifico mediante hook desactiva Auto Deploy; el Blueprint tambien lo fija
en Off para evitar despliegues que salten el gate.

El script `backend/scripts/deploy-hook.mjs` espera hasta 25 minutos a que
`/health` devuelva status ok, db up y commit igual al SHA validado. El commit
se obtiene de RENDER_GIT_COMMIT, variable incorporada de Render. Una instancia
anterior saludable nunca confirma el nuevo despliegue. Timeout, secretos
ausentes y fallo del hook hacen fallar el workflow. La URL secreta y los
mensajes internos del proveedor nunca se imprimen.
El push a dev ejecuta CI; solo una ejecucion manual autorizada publica desde
esa rama. Los logs muestran la aceptacion del hook y un ID de deploy validado
cuando Render lo devuelve, ademas del progreso de HTTP, timeout, disponibilidad
de la base y espera del commit correcto. No contienen cuerpos de respuesta ni
errores internos. El hook no permite consultar logs de build/start de Render:
si expira la espera, revisar el dashboard del servicio o conectar acceso API.

Para ejecutar manualmente desde terminal: validar primero un commit limpio,
publicarlo en este repositorio, exportar RENDER_DEPLOY_HOOK_URL,
RENDER_SERVICE_URL=https://casino-ia-9llp.onrender.com y DEPLOY_COMMIT_SHA,
y ejecutar `node backend/scripts/deploy-hook.mjs`.

El script alternativo deploy-render.mjs requiere RENDER_API_KEY y
RENDER_SERVICE_ID, usa Bearer auth y consulta estados del despliegue. El flujo
activo utiliza el hook ya configurado.

Referencias oficiales:
- https://render.com/docs/deploy-hooks
- https://render.com/docs/environment-variables
- https://render.com/docs/deploys
