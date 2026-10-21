# WhereToLive

Evalúa **qué tan bien ubicada está una vivienda**: cuánto tardas hasta tus
lugares fijos (a pie, bici, carro y transporte público), qué hay cerca y cómo se
compara con otros candidatos. No busca apartamentos: tú traes la dirección.

Especificación completa: [`spec-app-ubicacion-vivienda.md`](spec-app-ubicacion-vivienda.md).

## Estado

**Fases 0 a 4 completas.** El MVP ya funciona de punta a punta: defines lugares
fijos, agregas candidatos (GPS, dirección, clic en el mapa o pegando un link),
la app calcula tiempos a tus lugares fijos en cuatro modos, busca qué hay cerca
por categoría, da una puntuación 0–100 con desglose y compara hasta 4 candidatos
lado a lado.

Lo que falta (Fase 5): bottom sheet con gestos, PWA, editor de categorías
propias, exportar/importar JSON y el pulido final de accesibilidad.

## Arranque

```bash
npm install
cp .env.example .env     # opcional en Fase 0; necesario desde la Fase 2
npm run dev
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (escucha en la red local para probar en el celular). |
| `npm run dev:https` | Igual, pero con HTTPS y certificado autofirmado: **necesario para usar el GPS desde el celular**. |
| `npm run build` | Typecheck + build de producción. |
| `npm run typecheck` | Sólo TypeScript. |
| `npm test` | Vitest (utilidades, stores y hooks). |

## Cómo está organizado

```
src/
  app/        Shell: barra superior, layout mapa+panel, bottom sheet, vistas
  components/ ui/ (kit reutilizable) · map/ (frontera con Leaflet)
  hooks/      Lógica de React: acceso a stores y, más adelante, análisis
  providers/  Interfaces de datos + adaptadores (osm/, google/)
  store/      Zustand con persistencia en localStorage
  lib/        Funciones puras: geo, formato, categorías, constantes
  types/      Modelo de datos
```

Tres reglas que no se rompen (sección 3 de la spec):

1. **Gráfico separado de funcional.** Los componentes reciben props y no llaman
   APIs ni leen stores; eso vive en `hooks/`, `providers/` y `lib/`.
2. **Un solo kit de UI.** Todo botón, tarjeta o modal sale de
   `components/ui/`; no se duplican implementaciones.
3. **Providers detrás de interfaces.** Nadie importa OSM directamente: la app
   sólo conoce `providers/types.ts`, así que migrar a Google es implementar esas
   interfaces sin tocar `components/` ni `hooks/`.

## Diseño en escala de grises

La interfaz se diseña en gris: la jerarquía se construye con peso tipográfico,
tamaño y contraste, los lugares se distinguen por icono y forma, y los avisos
llevan icono y borde punteado en vez de rojo. Es una guía de diseño, no una
restricción técnica: la paleta completa de Tailwind está disponible si en algún
momento hace falta color.

El mapa conserva sus colores.

## Proveedores de datos

Sin ninguna API key la app ya funciona: las direcciones (Photon), el reverse
(Nominatim) y el transporte público (VBB) no piden key, y los tiempos a pie,
bici y carro se **estiman** con la distancia en línea recta × 1.3, marcados como
`est.` en la interfaz.

Con `VITE_ORS_API_KEY` (gratuita en openrouteservice.org) esos tiempos pasan a
ser reales y aparece el trazado de la ruta en el mapa. Si un servicio falla, ese
bloque cae solo: el resto del análisis se sigue mostrando con un aviso.

El transporte público cubre Berlín-Brandenburg; en otra ciudad hace falta otro
`TransitProvider`.

Los lugares cercanos salen de Overpass, que se cae y limita por IP a menudo: se
prueban varias instancias en orden y los resultados se guardan 7 días en
`localStorage`, así que recalcular en la misma zona no vuelve a consultar.

## Datos y privacidad

Todo se guarda en el navegador (`localStorage`, claves `wtl:v1:*`); no hay
backend, cuentas ni telemetría. Lo leído se valida con Zod al arrancar: un
registro corrupto se descarta en vez de romper la app.

Las variables `VITE_*` **son visibles en el navegador**: usa una key de
OpenRouteService restringida. `.env` está en `.gitignore`.
