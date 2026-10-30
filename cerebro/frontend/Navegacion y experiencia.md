---
tags: [frontend, experiencia]
---
# 🧭 Navegación y experiencia

El router de [[cerebro/frontend/Frontend|Frontend]] separa rutas públicas y privadas mediante `RequireAuth` y layouts.

| Acceso | Rutas |
| --- | --- |
| Público | `/`, `/login`, `/registro` |
| Privado | `/inicio`, `/perfil`, `/billetera`, `/movimientos`, `/juegos` |
| Retorno de pago | `/billetera/retorno` |
| Juegos | `/juegos/plinko`, `/juegos/blackjack`, `/juegos/ruleta`, `/juegos/poker` |

Los juegos y el retorno de pago usan carga diferida con estados de espera. La ruta de ruleta en la interfaz usa `ruleta`, mientras la API usa `roulette`.

Revisar etiquetas, teclado, foco, estados vacío/error/carga y movimiento reducido en cada recorrido. Estas son condiciones de calidad que requieren comprobación, no una certificación de accesibilidad.

Conecta con [[cerebro/juegos/Juegos|Juegos]], [[cerebro/economia/Pagos Stripe|Pagos Stripe]] y [[cerebro/operacion/Calidad y despliegue|QA]]. Fuente: [App.tsx](../../frontend/src/app/App.tsx).
