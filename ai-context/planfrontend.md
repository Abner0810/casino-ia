# PLAN — Frontend Simulador Casino (Plinko + Blackjack)

> Fecha: 19 oct 2026.
> Base: [planbackend.md](./planbackend.md) y [pendientes-backend.md](./pendientes-backend.md), contrastados con rutas, DTOs y servicios del backend local.
> Estado: propuesta de implementación. Este documento no acredita frontend construido ni API desplegada; las verificaciones del backend citadas en sus documentos son antecedentes, no pruebas ejecutadas en esta revisión.

## 1. Objetivo y alcance

Construir una aplicación React responsive en español que permita registrarse, iniciar sesión, consultar y editar el perfil, gestionar la billetera simulada, revisar movimientos y jugar Plinko y Blackjack consumiendo la API Express de Render. Publicar la SPA en Firebase Hosting.

La primera entrega incluye todos los módulos disponibles. Las recargas y retiros son operaciones del simulador: no solicitar números de tarjeta, cuentas bancarias, claves ni datos de una pasarela. Usar la etiqueta «Saldo de simulación»; queda por acordar la moneda o unidad de presentación. La presencia del rol ADMIN no implica un panel administrativo: no hay endpoints administrativos documentados. Recuperación de contraseña, pagos reales, multijugador y funciones de IA quedan fuera del alcance actual por falta de contratos backend.

## 2. Stack propuesto

| Componente | Elección | Propósito |
|---|---|---|
| Aplicación | React + TypeScript + Vite | SPA tipada, compilación estática |
| Navegación | React Router | Rutas públicas, privadas y página 404 |
| Datos remotos | TanStack Query | Consultas, caché, invalidación y mutaciones |
| Formularios | React Hook Form + Zod | Validación alineada con DTOs y errores por campo |
| HTTP | fetch con cliente centralizado | Bearer, errores, cancelación y refresh coordinado |
| Estilos | CSS Modules + variables CSS | Diseño responsive y componentes reutilizables |
| Plinko | SVG responsive | Trayectoria y tablero escalables sin física de resultados |
| Blackjack | HTML/CSS y cartas SVG locales | Mesa accesible, adaptable y sin servicios externos |
| Verificación | Vitest + Testing Library + Playwright | Casos críticos y recorridos en navegador |
| Hosting | Firebase Hosting | HTTPS, assets y fallback de SPA |

Son elecciones de diseño, no dependencias ya instaladas. Al crear `frontend/`, fijar versiones compatibles en el lockfile y verificar requisitos de Node con las herramientas elegidas. Firebase se utiliza para hosting; la autenticación y los datos siguen en Express/PostgreSQL.

## 3. Arquitectura y carpetas

```text
Página → componente/formulario → hook del módulo → servicio API
      → cliente HTTP → API Express → respuesta validada → caché → interfaz

frontend/
  public/
  src/
    app/                 # router, providers, layouts, límites de error
    config/              # validación de variables públicas
    shared/
      api/               # HTTP, errores normalizados, refresh coordinado
      ui/                # Button, Input, Modal, Alert, Skeleton, Money
      utils/             # importes, fechas, accesibilidad
    features/
      auth/              # sesión, login, registro, protección de rutas
      profile/           # consulta y edición de nombre
      wallet/            # saldo, balance, recarga y retiro
      transactions/      # historial, filtros y paginación
      games/
        lobby/           # catálogo y acceso a mesas
        plinko/          # apuesta, tablero, resultado y rondas
        blackjack/       # mesa, manos, acciones y rondas
    styles/              # tokens, reset, tipografía, estilos globales
    test/
  e2e/
  .env.example
  firebase.json
  package.json
```

- Los componentes muestran datos; los servicios conocen rutas y payloads; el cliente HTTP gestiona transporte y autenticación.
- TanStack Query conserva datos del servidor. Context mantiene la sesión; estado local mantiene formularios, modales y animaciones. No duplicar el saldo en varios almacenes.
- Claves de caché incluyen usuario y filtros. Al cerrar sesión, cancelar solicitudes, vaciar caché privada y descartar respuestas tardías de la sesión anterior.
- Cargar los juegos por ruta y respetar la preferencia de movimiento reducido.

## 4. Pantallas y navegación

| Ruta frontend propuesta | Acceso | Contenido |
|---|---|---|
| `/` | Público | Presentación del simulador y acceso a registro/login |
| `/registro` | Público | Nombre, email, contraseña y confirmación local |
| `/login` | Público | Inicio de sesión y errores de credenciales |
| `/inicio` | Privado | Resumen de saldo, estadísticas y accesos a juegos |
| `/perfil` | Privado | Email de lectura, nombre editable y datos públicos |
| `/billetera` | Privado | Saldo, bono separado, recarga y retiro simulados |
| `/movimientos` | Privado | Filtros por tipo/fechas y paginación |
| `/juegos` | Privado | Plinko y Blackjack, reglas y validación de acceso |
| `/juegos/plinko` | Privado | Riesgo, apuesta, tablero y últimas rondas |
| `/juegos/blackjack` | Privado | Mesa, manos, acciones y últimas partidas |
| `*` | Según sesión | Página no encontrada y retorno seguro |

Layout privado: encabezado con saldo y sesión, navegación, contenido y avisos accesibles. Tras registro exitoso, dirigir a login: el registro actual no devuelve tokens. Las rutas privadas esperan a resolver la sesión antes de renderizar datos. Si se conserva una ruta de retorno, aceptar solo rutas internas válidas.

## 5. Diseño responsive y accesibilidad

Diseño desde móvil, con tokens para color, espaciado, tipografía, bordes y estados. Propuesta visual: fondo oscuro, mesas diferenciadas y acentos con contraste; resultados identificados también con texto e iconos.

| Ancho orientativo | Distribución |
|---|---|
| 320–767 px | Una columna, navegación compacta, formularios a ancho disponible |
| 768–1023 px | Resúmenes en dos columnas y controles junto al tablero cuando quepan |
| Desde 1024 px | Navegación lateral y área de juego con panel de controles |

- Probar 320, 375, 768, 1024 y 1440 px, orientación horizontal y zoom 200%. Sin scroll horizontal de página ni controles ocultos.
- Plinko conserva proporción mediante `viewBox`; los diez slots deben ser legibles. En móvil, controles debajo del tablero.
- Blackjack distribuye manos en varias filas si hace falta; destaca la primera mano ACTIVA, mantiene cartas y controles legibles y evita superposiciones con navegación fija.
- Historial en tabla en escritorio y tarjetas con los mismos datos en móvil.
- Objetivo de accesibilidad: WCAG 2.2 AA. Navegación por teclado, foco visible, etiquetas explícitas, mensajes vinculados a campos, contraste suficiente y controles táctiles de al menos 44 × 44 px.
- Modales con foco contenido, retorno del foco y cierre accesible. Anunciar resultados mediante una región de estado sin leer cada fotograma. Las cartas tienen nombre textual y la carta oculta no revela información.
- Cada pantalla contempla carga, vacío, error, éxito y reintento seguro. Una espera de Render se muestra como conexión pendiente, no como saldo cero.

## 6. Integración con la API existente

La URL base propuesta incluye `/api`; `/health` se consulta desde el origen del backend. No inventar respuestas a partir del esquema Prisma. No se encontró un contrato OpenAPI o colección Postman en los archivos buscados: antes de integrar, registrar ejemplos sanitizados y esquemas de las operaciones consumidas en un contrato local reutilizable, derivado del código y comprobado contra la API.

| Módulo | Operaciones backend | Uso frontend |
|---|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/refresh`, `/logout` | Crear cuenta, obtener/rotar tokens y revocar refresh |
| Perfil | `GET`, `PATCH /api/users/profile` | Consultar usuario y editar `{nombre}` |
| Acceso | `POST /api/users/games/:juego/access` | Obtener saldo y límites antes de jugar |
| Billetera | `GET /api/wallet`, `/api/wallet/balance` | Saldo y estadísticas |
| Transacciones | `POST /api/transactions/deposit`, `/withdraw` | Enviar `{monto, metodo: "simulado"}` |
| Historial | `GET /api/transactions/history` | Consultar `pagina`, `porPagina`, `tipo`, `desde`, `hasta` |
| Plinko | `POST /api/games/plinko/bet` | Enviar `{apuesta, riesgo}` |
| Rondas Plinko | `GET /api/games/plinko/rounds` | Consultar últimas rondas |
| Blackjack | `POST /api/games/blackjack/start` | Enviar `{apuesta}` |
| Acciones Blackjack | `POST /api/games/blackjack/:id/hit`, `/stand`, `/split`, `/double`, `/exit` | Actuar sobre la partida del usuario |
| Partidas Blackjack | `GET /api/games/blackjack/rounds` | Consultar resúmenes recientes |

### 6.1 Formas verificadas en el código local

- Login: `{accessToken, refreshToken, tokenType, expiresInMinutes, usuario}`. Refresh devuelve un par nuevo sin `usuario`. Refresh/logout reciben `{refreshToken}` en el body; revisar además protección de las rutas antes de construir el cliente.
- Perfil incluye `publicId`, `email`, `nombre`, `rol`, `wallet` y `creadoEn`.
- Wallet: `{saldo, bono, totalDisponible, actualizadoEn}`. Balance: `{saldo, bono, total, historial: {totalApostado, totalGanado, cantidadApuestas, cantidadPremios, totalDepositado, totalRetirado, resultadoNeto}}`.
- Historial: `{items, paginacion: {pagina, porPagina, total, totalPaginas}}`; movimientos incluyen `fecha`, `saldoAntes`, `saldoDespues`, `tipo`, `monto`, `juego` y `descripcion`.
- Plinko devuelve `riesgo`, `apuesta`, `multiplicador`, `ganancia`, `ruta`, `gananciaNeta` y `saldoActual`. El nombre de respuesta es `ruta`, aunque en DB se almacena `rutaBola`. La seed no se devuelve al cliente.
- Blackjack devuelve `partidaId`, `estado`, `apuestaBase`, `apuestaTotal`, `dealer`, `manos` y `cartasRestantes`; no todas las acciones incluyen saldo. El crupier tiene `totalVisible`; una carta aparece como `🂠` mientras está oculta.
- Errores controlados: `{error, detalles?}`; la validación usa `detalles: [{campo, mensaje}]`. Normalizar también errores de red y respuestas no JSON.

### 6.2 Validación, dinero y fechas

- Registro: nombre de 2–80 caracteres, email válido hasta 150 y contraseña de 8–72 según DTO actual. No recortar contraseñas. Confirmación de contraseña solo en UI. Perfil permite editar únicamente nombre.
- Recarga/retiro: monto positivo, hasta 1.000.000 y máximo dos decimales. Mantener entrada textual mientras se escribe; convertir a número finito solo al enviar, porque los DTOs actuales esperan números JSON.
- Evitar aritmética monetaria con floats en la UI; si se requiere, usar centavos enteros dentro de rangos seguros o una librería decimal. Los valores y liquidaciones definitivos vienen del servidor. Formatear dos decimales y no asignar una moneda hasta acordarla.
- Mostrar bono separado: no asumir que `totalDisponible` o `total` son apostables/retirables; la lógica actual opera sobre saldo.
- Serializar fechas en ISO con zona explícita. Para un filtro por día, incluir el fin del día elegido, validar `desde <= hasta` y mostrar la zona usada. Cambiar filtros reinicia `pagina` a 1.
- Tras depósito, retiro o acción de juego, invalidar wallet, balance, perfil con wallet y los historiales afectados. No acreditar premios de forma optimista.

## 7. Sesión, errores y concurrencia

Decisión inicial compatible con la API actual: access y refresh solo en memoria, sin «recordarme». Recargar la página requiere iniciar sesión; los siete días del refresh son su vigencia backend, no una promesa de persistencia del navegador. No guardar tokens en URLs, logs ni almacenamiento web persistente.

Si se necesita conservar sesión tras recarga, resolver primero una ampliación backend para refresh en cookie HttpOnly/Secure, política SameSite, CORS con credenciales y protección CSRF según la topología Firebase/Render. No presentar ese transporte como ya implementado.

- Enviar `Authorization: Bearer <accessToken>` en solicitudes protegidas. El servidor valida permisos y ownership; un guard frontend solo organiza la navegación.
- Coordinar una sola renovación ante varios 401 simultáneos; reemplazar ambos tokens. Excluir login/refresh del bucle y permitir como máximo una repetición tras un 401 de autenticación confirmado. Si refresh falla, limpiar sesión.
- Antes de repetir una mutación tras renovar, verificar que ese 401 se produce en middleware antes de ejecutar negocio. Ante timeout, desconexión o 5xx, el resultado puede haberse confirmado: no repetir automáticamente POST, depósitos, retiros o acciones.
- Desactivar envíos duplicados y serializar acciones de mesa. Esto reduce errores de UI pero no sustituye idempotencia ni concurrencia del servidor.
- Ante resultado incierto, bloquear nuevas mutaciones afectadas y reconciliar saldo/historial/partida mediante lecturas. Sin consulta de estado de Blackjack no se puede garantizar esta recuperación.
- 400: error de campos o negocio; 401: sesión; 403: acceso denegado; 404: recurso no disponible sin revelar existencia ajena; 409: conflicto; 429: respetar `Retry-After` si existe; red/5xx: mensaje recuperable. No hacer polling continuo ni renovar sesión por cualquier error.
- Logout intenta revocar refresh y siempre elimina datos locales. Si falla la red, informar que la revocación remota no pudo confirmarse. El backend actual no garantiza revocación inmediata de un access JWT ya emitido.
- Renderizar texto como texto, evitar HTML arbitrario y no registrar credenciales. Las variables `VITE_*` son públicas.

## 8. Plinko

1. Solicitar acceso al juego; sin saldo, ofrecer ir a billetera.
2. Mostrar riesgos PEQUENO, MEDIANO y GRANDE con límites de la API. Referencia del plan: 1–50, 50–500 y 500–5000; el riesgo seleccionado distingue los extremos compartidos.
3. Validar monto y bloquear apuesta mientras exista una solicitud o animación pendiente.
4. Enviar una única apuesta. Tras respuesta exitosa, animar las nueve direcciones de `ruta` (`I`/`D`) hasta uno de diez slots.
5. Mostrar multiplicador, retorno bruto (`ganancia`), resultado neto y saldo confirmado. Un retorno positivo no implica ganancia neta positiva.
6. Actualizar billetera y últimas rondas. En movimiento reducido, mostrar directamente el resultado.

La animación representa el resultado del servidor. El endpoint de acceso solo expone el multiplicador máximo de cada riesgo, no la tabla completa de diez slots. Resolver esa configuración antes de rotular todos los slots; no inventar multiplicadores ni prometer verificación «provably fair» desde la UI con el contrato actual.

## 9. Blackjack

1. Obtener acceso, límites y reglas; referencia local: apuesta inicial 10–1000.
2. Iniciar una partida y renderizar su respuesta. Puede terminar en la apertura por blackjack natural.
3. Identificar la primera mano ACTIVA y mostrar Pedir, Plantarse, Dividir, Doblar y Rendirse según reglas y disponibilidad.
4. Cada acción espera respuesta antes de habilitar otra. El servidor decide cartas, valor, cambio de mano y resultado.
5. Al finalizar, mostrar resultado de cada mano, apuesta total, devolución/premio y saldo consultado de nuevo.

Reglas previstas: crupier planta en todos los 17; blackjack natural paga 3:2 de ganancia, con retorno bruto 2,5× incluyendo apuesta; victoria normal devuelve 2×; empate devuelve apuesta. Doblar exige dos cartas y saldo adicional. Split exige par del mismo valor y saldo adicional; ases reciben una carta y se plantan.

«Rendirse» requiere confirmar la devolución del 50% de la apuesta total e invoca `/exit`. Navegar fuera de la página no ejecuta automáticamente esa operación; cerrar una pestaña tampoco liquida una partida.

### 9.1 Dependencias a resolver antes de cerrar la mesa

| Hallazgo local | Impacto | Acción propuesta |
|---|---|---|
| No existe GET de estado completo de una partida activa; `/rounds` devuelve resúmenes | Recarga, reconexión o timeout impiden reconstruir la mesa | Añadir consulta autenticada de partida por ID y descubrimiento de activas, con ownership y carta oculta |
| No hay idempotencia de operaciones en el contrato revisado | Una repetición puede duplicar una operación | Diseñar clave de operación y reconciliación; hasta entonces, desactivar retries de mutaciones |
| El resumen omite `dividida`, `doblada` y acciones permitidas | El cliente no conoce con certeza todas las opciones válidas | Proponer `accionesPermitidas` e índice de mano activa calculados por backend |
| Split marca ambas manos como divididas y rechaza dividirlas otra vez | El máximo anunciado de tres manos no es alcanzable en ese flujo | Acordar regla y corregir motor o documentación antes de prometer tres manos |
| Start devuelve saldo tras débito aunque un natural puede acreditar premio después | Mostrar `saldoActual` de start puede dejar saldo desactualizado | Reconsultar wallet y proponer respuesta con saldo final consistente |

También acordar si habrá una sola partida activa por usuario y cómo impedir acciones concurrentes desde varias pestañas. Las propuestas de esta tabla requieren trabajo backend; esta planificación no las implementa ni las trata como endpoints disponibles.

## 10. Configuración y despliegue

```dotenv
# frontend/.env.example: configuración pública, sin credenciales
VITE_API_URL=https://<servicio>.onrender.com/api
VITE_APP_NAME=Casino Simulador
```

- Validar configuración al arrancar; desarrollo usa el origen local real y producción HTTPS. Construir con la URL del ambiente correspondiente.
- Firebase Hosting publica `frontend/dist` y reescribe rutas de SPA a `/index.html`; verificar recarga directa de `/juegos/blackjack` y `/movimientos`.
- Configurar caché prolongada solo para assets con hash; permitir actualización del HTML y revisar headers de seguridad/CSP, incluyendo conexión al backend.
- Completar `CORS_ORIGINS` en Render con los orígenes realmente usados: `.web.app`, `.firebaseapp.com` si se usa y dominio propio. Desarrollo/QA requieren orígenes explícitos del entorno correspondiente.
- Mantener `dev → qa → main`: CI de tipos/lint/tests/build; QA con preview; despliegue de producción desde main tras checks satisfactorios. Evitar disparadores duplicados.
- Credenciales de despliegue solo en secretos de CI, con permisos mínimos; nunca en `VITE_*`. Separar usuarios/datos de QA de producción y evitar recargas de prueba sobre cuentas ajenas.
- Verificar API/DB y CORS desde navegador antes de dar por terminado el despliegue. Conservar una versión anterior desplegable para rollback.

## 11. Fases y entregables

| Fase | Trabajo | Criterio de salida |
|---|---|---|
| 0. Contratos | Registrar ejemplos, diferencias y decisiones de sesión/mesa | Payloads, errores y dependencias críticas acordados |
| 1. Cimientos y diseño | Crear frontend, router, cliente HTTP, tokens visuales y layouts | Navegación responsive y estados compartidos funcionando |
| 2. Auth y perfil | Registro, login, refresh, logout y edición | Flujo privado completo; caché aislada entre usuarios |
| 3. Billetera e historial | Operaciones simuladas, balance, filtros y paginación | Saldo y movimientos coherentes sin duplicación |
| 4. Plinko | Acceso, apuestas, representación y rondas | Los tres riesgos funcionan con resultado servidor |
| 5. Blackjack | Mesa, acciones, manos y recuperación | Reglas acordadas y reconexión resuelta con soporte backend |
| 6. QA integral | Responsive, accesibilidad, red lenta y errores | Casos críticos verificados, defectos bloqueantes cerrados |
| 7. Publicación | Firebase, CORS y CI/CD | Recorridos reales desde dominio publicado contra Render |

Se puede avanzar con layouts mientras se completan Render y los contratos. No cerrar las fases de integración usando respuestas inventadas como evidencia de funcionamiento real.

## 12. Verificación y definición de terminado

- Comprobación estática: tipos, lint y build de producción.
- Pruebas focalizadas: refresh concurrente sin bucle; limpieza de sesión y respuestas tardías; conversión de importes; errores por campo; bloqueo de doble envío; estados y acciones de Blackjack.
- Recorridos de navegador: registro → login → recarga simulada → acceso → Plinko/Blackjack → movimientos → retiro → logout. Cubrir saldo insuficiente, natural al inicio, split, doble y rendición mediante escenarios reproducibles.
- Errores: token vencido, refresh inválido, 429, API no disponible, timeout tras mutación, recarga y navegación con partida activa. Verificar anti-IDOR del lado servidor y presentación genérica en cliente.
- Cuando se implemente y ejecute código contra servicios simulados, aplicar `postman:api-simulation`; distinguir evidencia simulada de pruebas reales con PostgreSQL/Render. No se ejecutaron simulaciones en esta tarea documental.
- QA manual: móvil y escritorio, Chrome/Firefox/Safari disponibles, teclado, foco, zoom y movimiento reducido. Registrar navegador, viewport y resultado; no declarar accesibilidad cumplida solo por una herramienta automática.
- Entrega terminada: todos los módulos integrados, contratos críticos resueltos, operaciones reflejadas en ledger, sin tokens en artefactos/logs y URL Firebase comprobada con rutas directas. Evidencias y pendientes actualizados en [pendientes-frontend.md](./pendientes-frontend.md).
