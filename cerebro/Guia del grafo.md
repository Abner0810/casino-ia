---
tags: [mapa]
---
# Guía del grafo y canvas

Comienza en [[cerebro/Inicio]]. El **grafo global** se construye con enlaces entre notas; el **canvas** ofrece una composición manual de módulos y relaciones: [abrir mapa de arquitectura](Mapa de arquitectura.canvas).

## Paleta por categoría

| Área | Color | Carpeta principal |
| --- | --- | --- |
| Datos relacionales y multitenancy | Ámbar #FBBF24 | cerebro/datos |
| Backend y dominios existentes | Verde #34D399 | cerebro/backend, economia y juegos |
| Frontend y microfrontends | Cian #22D3EE | cerebro/frontend |
| Arquitectura, SOLID y patrones | Violeta #A78BFA | cerebro/arquitectura |
| Seguridad | Coral #FB7185 | cerebro/seguridad |
| Operación | Naranja #FB923C | cerebro/operacion |
| Gestión | Azul #60A5FA | cerebro/gestion |

Los grupos están en .obsidian/graph.json; el canvas también usa esos tres colores principales. La nota de Datos histórica queda ámbar aunque esté en arquitectura. Los grupos específicos se evalúan antes de los generales.

## Explorar

- Global: abrir grafo desde la barra lateral. Si ya estaba abierto, cerrarlo y volverlo a abrir para cargar la configuración guardada.
- Local: abrir una nota → Abrir grafo local; profundidad 1 para vecinos y 2 para dependencias de sus vecinos.
- Datos: path:"cerebro/datos".
- Backend: path:"cerebro/backend".
- Frontend: path:"cerebro/frontend".
- Principios: path:"cerebro/arquitectura/solid".
- Arquitectura objetivo completa: path:"cerebro".

Si aplicas un filtro temporal en el grafo, conserva o restablece las exclusiones de copias/dependencias del filtro global. No elimina archivos. Adjuntos y destinos inexistentes se ocultan para evitar ruido; el canvas se abre por su enlace.

## Mantenerlo útil

Una idea por nota; ruta completa en wikilinks; fuentes de código como enlaces Markdown. Señalar si un contrato está implementado o propuesto. Nunca pegar secretos de .env ni tokens. Registrar fecha, decisión, evidencia y seguimiento en [[cerebro/gestion/Pendientes y decisiones]].

Referencia: [grupos y vista local de Obsidian](https://help.obsidian.md/plugins/graph).
