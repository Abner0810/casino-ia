---
tags: [seguridad]
---
# 🛡️ Seguridad y sesión

Tokens de acceso y refresh solo en memoria del frontend; recargar la página requiere iniciar sesión. El backend gestiona autenticación, rotación del refresh y propiedad de recursos. Los guards del navegador organizan navegación, pero no sustituyen permisos del servidor.

Reglas del proyecto:

- Coordinar la renovación de sesión y descartar respuestas tardías de sesiones anteriores.
- Aislar la caché por usuario y cancelar consultas al salir.
- No repetir automáticamente mutaciones ante errores de red o resultados inciertos.
- Mantener resultados, cartas ocultas y saldo bajo control del servidor.
- Tratar `VITE_*` como público; no copiar secretos a notas o ejemplos.

Relaciona [[cerebro/frontend/Frontend|Frontend]], [[cerebro/backend/Backend|Backend]], [[cerebro/economia/Pagos Stripe|Pagos]], [[cerebro/juegos/Juegos|Juegos]] y [[cerebro/arquitectura/Contratos y operaciones|Operaciones]].

Fuentes: [auth.store.ts](../../frontend/src/features/auth/auth.store.ts), [http.ts](../../frontend/src/shared/api/http.ts), [[backend/HARDENING]], [[AGENTS]].
