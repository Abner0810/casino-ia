# Casino IA Constitution

<!--
Sync Impact Report
Version: plantilla sin ratificar -> 1.0.0
Principios: se establecen diez principios a partir de AGENTS.md, ai-context/, docs/ y contratos actuales.
Secciones añadidas: restricciones de producto y arquitectura; flujo de desarrollo y calidad.
Secciones eliminadas: ninguna.
TODO: confirmar la fecha de ratificación con el equipo.
Este informe es temporal y debe retirarse al ratificar la constitución.
-->

## Core Principles

### I. Estabilidad del stack y las dependencias
Casino IA mantiene el stack, las versiones y las herramientas ya adoptadas. Ningún cambio de versión, incorporación o eliminación de dependencias se realiza sin una decisión explícita del equipo. Se usa `npm ci` para instalar lo fijado por los lockfiles; estos no se editan como parte de cambios funcionales.

### II. Autoridad del servidor sobre dinero y resultados
El backend es la fuente de verdad para resultados de juegos, saldo, bonos, ledger e invariantes de toda operación monetaria. El frontend presenta estados confirmados por el servidor y no calcula ni persiste resultados o saldos como autoridad. Las operaciones del simulador se identifican como simuladas; una integración de pagos no autoriza a tratar el saldo local como confirmado.

### III. Validación alineada con contratos
Toda entrada se valida en el backend antes de procesarse y en el frontend para orientar al usuario. Los esquemas, DTOs, rutas y respuestas de los módulos existentes son la referencia compartida. Los cambios de contrato se reflejan en ambos lados y en sus pruebas; no se inventan campos, estados ni reglas incompatibles con la API.

### IV. Mutaciones seguras ante incertidumbre
Las mutaciones que puedan afectar saldo, ledger o estado de una partida deben ser idempotentes conforme al contrato del servidor y protegerse contra envíos duplicados. El cliente no reintenta automáticamente una mutación cuando un timeout o error de red deja incierto si el servidor la procesó; primero se reconcilia el estado mediante las consultas disponibles o se informa el resultado incierto.

### V. Protección de secretos y sesiones
No se exponen tokens, secretos ni credenciales en código público, bundles, logs, documentación de ejemplo ni respuestas innecesarias. Toda variable `VITE_*` se considera pública. Los tokens de sesión permanecen en memoria según el flujo actual, y la renovación coordinada no debe crear bucles ni repetir mutaciones.

### VI. Aislamiento, autorización y propiedad
Los datos y la caché privada se aíslan por usuario. El servidor autentica y autoriza cada operación, comprueba la propiedad de recursos antes de leerlos o modificarlos y evita acceso entre cuentas. Al cerrar o cambiar sesión, se limpian los datos privados, se cancelan solicitudes cuando corresponda y se descartan respuestas tardías.

### VII. Accesibilidad y adaptación de interfaz
Las pantallas y controles funcionan en móvil y escritorio, con teclado, etiquetas, foco visible y estados comprensibles de carga, error y vacío. Se respeta `prefers-reduced-motion`; la información de resultado no depende únicamente de animaciones ni de color. Los cambios mantienen los patrones visuales y de interacción compartidos existentes.

### VIII. Pruebas según el flujo afectado
Una funcionalidad no se considera terminada hasta contar con pruebas automatizadas pertinentes para sus cambios y hasta que estas pasen. Se cubren los límites de validación, errores y contratos del módulo afectado; los cambios en recorridos críticos de usuario incluyen pruebas Playwright. Las pruebas complementan, no sustituyen, la verificación manual requerida para responsive o accesibilidad.

### IX. Flujo de entrega con autorización
El flujo de ramas es `dev → qa → main`, con las verificaciones de calidad vigentes antes de publicar. No se hace push, PR ni deploy sin autorización explícita. La configuración de hosting o CI por sí sola no demuestra que una versión esté publicada; el estado remoto se verifica con evidencia del entorno correspondiente.

### X. Cambios pequeños y compatibles
Se prefieren cambios acotados, legibles y fáciles de revisar, que sigan la organización por módulos y capas ya existente. Se reutilizan componentes y servicios compartidos cuando corresponde. Los cambios que amplían o alteran contratos deben justificar su necesidad y preservar compatibilidad con consumidores existentes siempre que sea posible.

## Restricciones de producto y arquitectura

- Se conserva React, TypeScript y Vite en el frontend, Express y PostgreSQL/Prisma en el backend, y las herramientas de enrutamiento, consulta, formularios, validación y pruebas ya instaladas; la lista y sus versiones se verifican en los manifiestos y lockfiles vigentes.
- La comunicación sigue los servicios API, cliente HTTP, autenticación y caché existentes. Las reglas de negocio y de propiedad se imponen en backend; el cliente no reemplaza esas verificaciones.
- Los valores monetarios se validan según los DTOs reales, con límites y precisión definidos por el módulo. No se presentan depósitos, retiros ni pagos como reales si el contrato y el entorno no lo confirman.
- Los cambios de autenticación, billetera, ledger o juegos consideran fallos parciales, concurrencia y respuestas inciertas sin asumir que una solicitud fallida no tuvo efecto.

## Flujo de desarrollo y calidad

- Antes de proponer cambios de contrato, se revisan los controladores, DTOs y servicios del módulo backend relacionado y sus servicios, hooks y pruebas frontend.
- Se siguen las verificaciones de `AGENTS.md` y del proyecto. Para la validación de release desde la raíz se usa `node scripts/agent-policy.mjs --release`; los recorridos críticos alterados se cubren con Playwright.
- Los formularios proporcionan errores por campo y estados accesibles. La interfaz contempla teclado, pantallas estrechas, movimiento reducido, carga, error y ausencia de datos según el flujo afectado.
- Los cambios de configuración de despliegue no equivalen a una publicación. Se registra y comprueba la evidencia correspondiente antes de afirmar que un entorno está actualizado.

## Governance

Esta constitución define los principios de desarrollo de Casino IA. Si una instrucción de trabajo entra en conflicto con ella, el equipo debe resolver la contradicción antes de aceptar una excepción o cambiar el diseño. `AGENTS.md` concreta reglas operativas; los planes, pendientes, documentación y contratos describen el estado y el comportamiento de cada módulo. Una especificación de funcionalidad no puede anular las reglas de seguridad, autorización o protección monetaria aquí establecidas.

Las enmiendas requieren decisión explícita del equipo, actualización de este documento y revisión de los artefactos SDD que dependan de la regla modificada. Se usa versionado semántico: MAJOR ante una incompatibilidad de principios, MINOR al añadir un principio o una obligación compatible, y PATCH para aclaraciones que no alteren obligaciones. Toda implementación debe comprobar su conformidad; cualquier excepción debe estar documentada y aprobada. La fecha de ratificación inicial requiere confirmación del equipo.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): confirmar con el equipo la fecha de ratificación inicial | **Last Amended**: 2026-10-29
