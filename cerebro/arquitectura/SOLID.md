---
tags: [arquitectura, solid]
estado: objetivo con evidencia parcial
---
# SOLID aplicado a Casino IA

Los principios se aplican a funciones, módulos y contratos. No exigen crear clases ni instalar un contenedor de dependencias. La evidencia actual es parcial; cada principio incluye una meta verificable.

| Principio | Idea aplicada | Nota |
| --- | --- | --- |
| S | Una responsabilidad y motivo de cambio | [[cerebro/arquitectura/solid/SRP]] |
| O | Extender mediante contratos estables | [[cerebro/arquitectura/solid/OCP]] |
| L | Implementaciones sustituibles sin romper garantías | [[cerebro/arquitectura/solid/LSP]] |
| I | Puertos pequeños según consumidor | [[cerebro/arquitectura/solid/ISP]] |
| D | Dominio depende de abstracciones | [[cerebro/arquitectura/solid/DIP]] |

## Evaluar una entrega

Identificar responsabilidad, puerto, adaptación y caso de prueba que demuestra el principio. No declarar un principio satisfecho solo por usar una interfaz TypeScript.

Conecta [[cerebro/arquitectura/Patrones de diseno]], [[cerebro/backend/Microservicios]], [[cerebro/frontend/Microfrontends]] y [[cerebro/arquitectura/Criterios de aceptacion]].

Referencia conceptual: Robert C. Martin, [Design Principles and Design Patterns](https://objectmentor.com/resources/articles/Principles_and_Patterns.pdf). Los ejemplos siguientes son propuestas específicas de este repositorio.
