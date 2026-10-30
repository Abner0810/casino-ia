---
tags: [backend, arquitectura-objetivo]
estado: propuesto
---
# 🔐 Servicio Identidad

**Actual:** auth y users forman parte del monolito; registro crea también una wallet dentro del proceso. **Objetivo:** separar identidad global, pertenencias y sesiones del dinero.

## Responsabilidad y datos

Identidad conserva User global, TenantMembership por tenant–usuario y RefreshToken. Una persona puede pertenecer a varios operadores sin compartir automáticamente sus saldos. El rol y estado de acceso al operador se resuelven desde la pertenencia, no desde un rol global de jugador.

Mantener bcrypt, rotación de refresh y comprobación de credenciales. El contexto autorizado debe ligar usuario, tenant activo, pertenencia, audiencia y vigencia; definir su contrato antes de extraer servicios.

## Contratos y colaboraciones objetivo

- Login/refresh validan que la sesión pueda operar en el tenant seleccionado.
- Perfil devuelve solo los datos permitidos, sin hashes ni material de autenticación.
- La creación de wallet se solicita a [[cerebro/backend/servicios/Economia|Economía]] de forma idempotente; no escribir su esquema.
- El acceso al juego deja de consultar repositorios de dinero desde Identidad; [[cerebro/backend/servicios/Gateway|Gateway]] compone información de acceso y cada juego vuelve a validar la operación.

Usar credencial y esquema propios. FK internas entre User, pertenencia y refresh; los identificadores referenciados por otros servicios no requieren joins remotos.

## SOLID y riesgos

SRP separa identidad de contabilidad. ISP distingue autenticación, perfil y autorización de pertenencia. DIP permite sustituir repositorio y emisor de credenciales sin alterar las reglas de acceso.

Probar rotación simultánea, logout, cambio de contraseña, pertenencia suspendida, tenant incorrecto y creación de wallet duplicada. Los tokens continúan en memoria del navegador; el shell de [[cerebro/frontend/Microfrontends|Microfrontends]] coordina su transporte.

Fuentes actuales: [auth.service.js](../../../backend/src/modules/auth/auth.service.js), [user.service.js](../../../backend/src/modules/users/user.service.js), [user.routes.js](../../../backend/src/modules/users/user.routes.js).

Mapa: [[cerebro/backend/Microservicios]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]], [[cerebro/arquitectura/Patrones de diseno]].

## Vertical y datos

[[cerebro/frontend/microfrontends/Identidad y perfil|Interfaz relacionada]] · [[cerebro/datos/entidades/User]] · [[cerebro/datos/entidades/TenantMembership]] · [[cerebro/datos/entidades/RefreshToken]]
