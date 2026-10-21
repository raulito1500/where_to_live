# Adaptadores OpenStreetMap

Implementaciones de las interfaces de `providers/types.ts`. Se añaden por fase:

| Archivo | Interfaz | Fase |
|---|---|---|
| `photon.ts` | `GeocodingProvider.search` (autocompletar, debounce 400 ms) | 1 |
| `nominatim.ts` | `GeocodingProvider.reverse` (cola, máx. 1 req/s) | 1 |
| `ors.ts` | `RoutingProvider` (endpoint `matrix`) + fallback estimado | 2 |
| `transitRest.ts` | `TransitProvider` (VBB `/journeys`) | 2 |
| `overpass.ts` | `PlacesProvider` (una consulta con todas las categorías) | 3 |

Reglas: ningún archivo de `components/` o `hooks/` importa de esta carpeta;
todo pasa por `providers/index.ts`.
