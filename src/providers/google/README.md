# Adaptadores Google (Fase 2 de la migración)

Vacío a propósito. Al migrar (sección 6 de la spec):

| Archivo | Interfaz | Servicio Google |
|---|---|---|
| `placesAutocomplete.ts` | `GeocodingProvider` | Places Autocomplete + Geocoding API |
| `placesNearby.ts` | `PlacesProvider` | Places API (Nearby Search) |
| `routes.ts` | `RoutingProvider` + `TransitProvider` | Routes API / Distance Matrix |

Además: usar `googleTypes` de `PlaceCategory`, key con facturación y restringida
por dominio, y migrar también el mapa (`@vis.gl/react-google-maps`), porque los
términos de Google no permiten mostrar sus datos sobre otro mapa.
