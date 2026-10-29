---
tags: [datos, seguridad, objetivo]
estado: no implementado
---
# Aislamiento RLS

PostgreSQL permite políticas por fila para lectura y escritura. Al habilitar RLS sin una política aplicable, el acceso normal queda denegado. Superusuarios y roles BYPASSRLS la evitan; el propietario normalmente también, salvo FORCE ROW LEVEL SECURITY. RLS no controla TRUNCATE ni REFERENCES.

Fuente primaria: [PostgreSQL · Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## Requisitos propuestos para Casino IA

- Rol runtime por servicio, sin BYPASSRLS, sin privilegios de superusuario ni propiedad de tablas; migraciones con otra credencial.
- Políticas de lectura con USING y de escritura con WITH CHECK que exijan tenantId del contexto validado.
- Instalar contexto con set_config local a la transacción, desde backend confiable, después de verificar tenant. No usar estado de sesión permanente de una conexión del pool.
- Toda consulta privada, incluidas lecturas, debe entrar en el contexto transaccional. Si falta contexto, fallar cerrado.
- Ningún endpoint público permite SQL arbitrario ni que el cliente configure el tenant de PostgreSQL. RLS refuerza la autorización; el contexto lo establece código de confianza.
- Revisar funciones privilegiadas, SQL crudo y tareas de mantenimiento; una política no reemplaza las FK compuestas.

Las políticas SQL y su integración con Prisma aún deben diseñarse y probarse en migraciones propias. No pegar estas reglas como una supuesta implementación existente.

## Prueba mínima

Con rol runtime y pool real: tenant A crea y lee; B no lee ni modifica; insertar referencia cruzada falla; conexión reutilizada sin contexto no conserva A ni B. Repetir con procesos de fondo y credenciales por servicio.

Volver a [[cerebro/datos/Multitenancy]]. Relaciona [[cerebro/datos/Modelo relacional objetivo]], [[cerebro/seguridad/Seguridad y sesion]] y [[cerebro/arquitectura/Criterios de aceptacion]].
