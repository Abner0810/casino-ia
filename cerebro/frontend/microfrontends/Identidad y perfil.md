---
tags: [frontend, microfrontend, objetivo]
estado: arquitectura-objetivo
---
# 👤 Microfrontend de identidad y perfil

Hoy `features/auth` y `features/profile` pertenecen a la misma SPA. La unidad objetivo agrupa registro, login, perfil y cambio de contraseña; los tokens y su renovación permanecen bajo [[cerebro/frontend/microfrontends/Shell|Shell]].

## Contrato de responsabilidad

Rutas de referencia: `/login`, `/registro`, `/perfil`. Posee formularios React Hook Form/Zod, errores por campo, páginas, hooks y clientes de su dominio. El shell ofrece capacidades de autenticación para procesar credenciales y establecer sesión sin entregar tokens a los demás módulos.

El perfil actual permite editar el nombre; no debe presentar edición de email o permisos sin soporte de contrato. Un registro exitoso dirige a login según el comportamiento actual. Un cambio de contraseña debe respetar la revocación y la necesidad de iniciar sesión de nuevo.

## Tenant y privacidad

El tenant de login se resuelve y valida en el servidor. Seleccionar una marca o enviar un identificador desde la interfaz no autoriza pertenencia. El cacheo privado objetivo usa tenant y usuario; las contraseñas no se publican en eventos ni logs y se descartan al desmontar el formulario.

Los eventos `session.changed.v1` notifican un cambio de contexto público. Los otros microfrontends reaccionan cancelando y reconsultando; no reciben el resultado completo de login.

## Verificación objetivo

Probar credenciales inválidas, tenant equivocado, doble envío, errores por campo, teclado, renovación concurrente y logout mientras se consulta perfil. El desmontaje elimina suscripciones y respuestas tardías.

Relaciones: [[cerebro/frontend/Microfrontends]], [[cerebro/frontend/microfrontends/Inicio y lobby]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/backend/Microservicios]].

Fuentes: [auth.api.ts](../../../frontend/src/features/auth/auth.api.ts), [profile.api.ts](../../../frontend/src/features/profile/profile.api.ts), [session.provider.tsx](../../../frontend/src/features/auth/session.provider.tsx), [PerfilPage.tsx](../../../frontend/src/features/profile/pages/PerfilPage.tsx).

## Dependencia de dominio

[[cerebro/backend/servicios/Identidad]] · [[cerebro/datos/entidades/User]] · [[cerebro/datos/entidades/TenantMembership]] · [[cerebro/datos/entidades/RefreshToken]]
