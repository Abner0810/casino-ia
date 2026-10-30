---
tags: [frontend, arquitectura, objetivo]
estado: arquitectura-objetivo
actualizado: 2026-10-29
---
# 🩵 Microfrontends

**Objetivo de arquitectura.** Hoy existe una SPA React con un `createRoot`, un `BrowserRouter`, un proveedor de sesión y un build Vite. Los imports diferidos de juegos separan chunks, pero no constituyen microfrontends desplegables de forma independiente.

## Módulos y límites

| Unidad objetivo | Responsabilidad | Rutas actuales de referencia |
| --- | --- | --- |
| [[cerebro/frontend/microfrontends/Shell|Shell]] | Composición, navegación, sesión y tenant | Router raíz y layouts |
| [[cerebro/frontend/microfrontends/Publico|Público]] | Presentación y acceso | `/` |
| [[cerebro/frontend/microfrontends/Identidad y perfil|Identidad y perfil]] | Registro, login y perfil | `/login`, `/registro`, `/perfil` |
| [[cerebro/frontend/microfrontends/Inicio y lobby|Inicio y lobby]] | Resumen y catálogo | `/inicio`, `/juegos` |
| [[cerebro/frontend/microfrontends/Economia|Economía]] | Billetera, movimientos y pagos | `/billetera`, `/movimientos`, `/billetera/retorno` |
| [[cerebro/frontend/microfrontends/Plinko|Plinko]] | Tablero y apuestas | `/juegos/plinko` |
| [[cerebro/frontend/microfrontends/Blackjack|Blackjack]] | Mesa y manos | `/juegos/blackjack` |
| [[cerebro/frontend/microfrontends/Ruleta|Ruleta]] | Selecciones y giro | `/juegos/ruleta` |
| [[cerebro/frontend/microfrontends/Poker|Póker]] | Texas Hold’em | `/juegos/poker` |

## Composición propuesta

El shell carga entradas ESM de un manifiesto versionado y controlado por la plataforma. Cada módulo expone `mount(element, context) → unmount()`. El manifiesto declara versión de contrato, rutas, URL permitida y versión del artefacto. Las URLs de módulos no provienen de parámetros del usuario. Esta propuesta no instala Module Federation ni cambia dependencias.

Cada unidad conserva React, TypeScript, Vite, CSS Modules, TanStack Query y React Hook Form/Zod. Cada build empaqueta su runtime; la comunicación usa capacidades explícitas, sin importar internals de otro módulo. El shell conserva el router superior y ofrece puertos de navegación, transporte autenticado y contexto público; solo él custodia los tokens en memoria y coordina refresh.

Las cachés de cada módulo deben incluir `tenantId`, `userId`, recurso y filtros. Al cambiar sesión o tenant: desmontar, abortar solicitudes, limpiar consultas y rechazar respuestas tardías. Los eventos tipados notifican cambios y provocan lecturas; no acreditan saldo ni autorizan acceso.

## Relaciones y evidencia

Conecta [[cerebro/arquitectura/Arquitectura objetivo]], [[cerebro/backend/Microservicios]], [[cerebro/datos/Multitenancy]], [[cerebro/arquitectura/SOLID]] y [[cerebro/arquitectura/Patrones de diseno]].

Fuentes actuales: [main.tsx](../../frontend/src/main.tsx), [App.tsx](../../frontend/src/app/App.tsx), [providers.tsx](../../frontend/src/app/providers.tsx), [vite.config.ts](../../frontend/vite.config.ts), [queryKeys.ts](../../frontend/src/shared/api/queryKeys.ts).
