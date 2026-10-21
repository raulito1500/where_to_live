# App de evaluación de ubicación de vivienda (MVP)

> Documento de especificación para desarrollar en Visual Studio Code.
> Nombre de trabajo: **WhereToLive** (cambiable).

---

## 1. Objetivo

Ayudar a evaluar **qué tan bien ubicada está una vivienda** en una ciudad desconocida. La app **no busca apartamentos**: el usuario ya tiene una dirección candidata (de Immoscout, un anuncio, etc.) y la app responde:

1. ¿Qué tan lejos queda de mis **lugares fijos** (universidad, trabajo, etc.)? A pie, en bici, en carro y en transporte público.
2. ¿Qué hay **cerca**? Supermercado, parque, gimnasio, estación de tren, parada de bus, piscina pública, zona de restaurantes, centro comercial, etc.
3. ¿Cómo se **compara** con otros candidatos?

**Caso de uso inicial:** mudanza a Potsdam (Alemania). La app debe ser genérica, funcionar en cualquier ciudad.

## 2. Alcance del MVP

### Incluido
- Configurar lugares fijos (con nombre libre, sin categoría obligatoria).
- Agregar una ubicación candidata por: búsqueda de dirección, clic en el mapa, o pegar link/coordenadas.
- Distancia y tiempo a los lugares fijos: a pie, bici, carro, transporte público.
- Búsqueda de lugares cercanos por categoría (configurable) con distancia y tiempo reales al más cercano.
- Indicador de "zona de restaurantes" (densidad en radio).
- Lista de candidatos guardados con notas y comparación lado a lado.
- **Puntuación ponderada (0–100)** según las prioridades del usuario.
- **Uso en móvil** con botón "Usar mi ubicación actual" (geolocalización del navegador).
- Persistencia local (localStorage).
- UI en escala de grises.

### Fuera del MVP (Fase 2)
- Isócronas (área alcanzable en X minutos).
- Backend, cuentas de usuario, sincronización entre dispositivos.
- Reseñas, precios, horarios de apertura de los lugares.
- Exportar/compartir comparación (PDF/imagen).
- Multi-idioma (el MVP es en español).

## 3. Stack técnico

| Área | Decisión |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS, **solo paleta `gray`/`neutral`/`white`/`black`** |
| Mapa | Leaflet + `react-leaflet` |
| Estado | Zustand con middleware `persist` (localStorage) |
| Datos remotos | `@tanstack/react-query` (caché y estados de carga) |
| Iconos | `lucide-react` (los lugares se distinguen por icono/forma, no por color) |
| Tests | Vitest + React Testing Library (mínimo para utilidades y hooks) |
| Backend | Ninguno |

### Principios de código (obligatorios)
- **Separación gráfico / funcional:** los componentes visuales son "tontos" (reciben props, no llaman APIs). La lógica vive en **hooks** (`useXxx`) y en `services/`/`providers/`.
- **Componentes reutilizables** en `components/ui/` (Button, Card, Badge, Input, Modal, Tabs, Spinner, EmptyState, IconButton). No duplicar implementaciones.
- **Providers detrás de interfaces** (ver sección 6) para poder migrar de OpenStreetMap a Google sin tocar la UI.

## 4. Proveedores de datos (implementación OSM)

| Necesidad | Servicio | Notas |
|---|---|---|
| Tiles del mapa | CARTO Positron (`light_all`) o tiles OSM con filtro CSS `grayscale(1)` | Ya en gris. Respetar atribución. Los tiles OSM oficiales no son para uso intensivo. |
| Autocompletar dirección | **Photon** (`photon.komoot.io/api`) | Pensado para autocompletar; sin API key. Debounce de 400 ms. |
| Geocodificación inversa | **Nominatim** (`/reverse`) | Máx. 1 req/s. Se usa solo al hacer clic en el mapa. |
| Lugares cercanos | **Overpass API** (`overpass-api.de`) | Una sola consulta por candidato con todas las categorías. |
| Rutas y tiempos (pie/bici/carro) | **OpenRouteService** (endpoint `matrix`) | Requiere API key gratuita en `.env`. Límite de cuota diaria y de locaciones por matriz: revisar la documentación vigente. |
| Transporte público | **transport.rest (VBB)** `/journeys` | Cubre Berlín-Brandenburg (Potsdam). Instancia pública, sin garantía; verificar disponibilidad. Otras ciudades requieren otro proveedor. |

**Variables de entorno (`.env`):**
```
VITE_ORS_API_KEY=
VITE_TRANSIT_BASE_URL=https://v6.vbb.transport.rest
VITE_PHOTON_URL=https://photon.komoot.io
```

**Fallback sin API key de rutas:** estimar tiempo con distancia en línea recta × 1.3 y velocidades (pie 5 km/h, bici 15 km/h, carro 30 km/h) y marcar el valor como **"estimado"** en la UI.

## 5. Modelo de datos (TypeScript)

```ts
type TravelMode = 'foot' | 'bike' | 'car' | 'transit';

interface LatLng { lat: number; lng: number; }

interface FixedPlace {
  id: string;
  label: string;          // "Universidad", "Trabajo de Ana"...
  address: string;
  position: LatLng;
  icon?: string;          // nombre de icono lucide
  scoring: ScoringRule;   // importancia y umbrales de tiempo
}

interface ScoringRule {
  weight: number;         // 0 (no importa) a 5 (crítico)
  idealMin: number;       // hasta este tiempo => 100 puntos
  maxMin: number;         // desde este tiempo => 0 puntos (lineal entre ambos)
}

interface TravelInfo {
  mode: TravelMode;
  durationMin: number;
  distanceKm?: number;
  estimated: boolean;     // true si viene del fallback
  transfers?: number;     // solo transit
}

interface FixedPlaceResult {
  fixedPlaceId: string;
  straightLineKm: number;
  travel: Partial<Record<TravelMode, TravelInfo>>;
}

interface NearbyPlace {
  osmId: string;
  name?: string;
  position: LatLng;
  straightLineKm: number;
  travel?: Partial<Record<TravelMode, TravelInfo>>; // solo el top-N enrutado
}

interface CategoryResult {
  categoryId: string;
  nearest: NearbyPlace[];   // top 3 ordenados por distancia real (o recta)
  countInRadius?: number;   // usado en categorías de tipo "density"
  radiusM: number;
}

interface Candidate {
  id: string;
  name: string;             // "Apto Babelsberg 2 hab"
  address: string;
  position: LatLng;
  notes?: string;
  listingUrl?: string;
  createdAt: string;        // ISO
  analysis?: {
    computedAt: string;
    fixed: FixedPlaceResult[];
    categories: CategoryResult[];
    score?: CandidateScore;
  };
}

interface PlaceCategory {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  kind: 'nearest' | 'density';
  radiusM: number;          // radio de búsqueda
  osmFilters: string[];     // ej. ['["shop"="supermarket"]']
  scoring: ScoringRule;     // en 'nearest': tiempos; en 'density' ver sección 7.1
  scoringMode: TravelMode;  // modo con el que se puntúa (ej. supermercado => 'foot')
}

interface CandidateScore {
  total: number;            // 0-100, promedio ponderado
  breakdown: { itemId: string; label: string; score: number; weight: number }[];
}

interface Settings {
  primaryMode: TravelMode;  // modo destacado en tarjetas
  transitDepartureTime: string; // "08:00", día laboral próximo, para consultas de transit
  categories: PlaceCategory[];
}
```

### Categorías por defecto

| Categoría | Tipo | Radio | Filtros OSM |
|---|---|---|---|
| Supermercado | nearest | 2000 m | `shop=supermarket` |
| Drogería | nearest | 2000 m | `shop=chemist` (DM, Rossmann) |
| Farmacia | nearest | 2000 m | `amenity=pharmacy` |
| Panadería | nearest | 1500 m | `shop=bakery` |
| Parque | nearest | 2500 m | `leisure=park` |
| Gimnasio | nearest | 3000 m | `leisure=fitness_centre` |
| Piscina pública | nearest | 5000 m | `leisure=swimming_pool` + `access` público, y `leisure=sports_centre` + `sport=swimming` |
| Centro comercial | nearest | 6000 m | `shop=mall` |
| Estación de tren | nearest | 5000 m | `railway=station`, `railway=halt` |
| Parada de tranvía | nearest | 1500 m | `railway=tram_stop` |
| Parada de bus | nearest | 1000 m | `highway=bus_stop` |
| Zona de restaurantes | density | 600 m | `amenity=restaurant` (cuenta cuántos hay) |
| Cafés | density | 600 m | `amenity=cafe` |
| Médico / hospital | nearest | 4000 m | `amenity=doctors`, `amenity=clinic`, `amenity=hospital` |

El usuario puede activar/desactivar, cambiar radio y **crear categorías propias** (nombre, icono, radio y filtros OSM avanzados opcionales).

## 6. Arquitectura de providers (para migrar a Google)

Toda la app depende solo de estas interfaces, nunca de OSM directamente.

```ts
// src/providers/types.ts
interface GeocodingProvider {
  search(query: string, bias?: LatLng): Promise<GeocodeResult[]>;
  reverse(position: LatLng): Promise<GeocodeResult | null>;
}

interface PlacesProvider {
  findNearby(origin: LatLng, categories: PlaceCategory[]): Promise<Record<string, NearbyPlace[]>>;
}

interface RoutingProvider {
  // 1 origen -> N destinos, por modo
  matrix(origin: LatLng, destinations: LatLng[], mode: Exclude<TravelMode, 'transit'>): Promise<TravelInfo[]>;
}

interface TransitProvider {
  journey(from: LatLng, to: LatLng, departure: Date): Promise<TravelInfo | null>;
}

// El mapa también se abstrae con un componente <MapView /> propio
```

**Selección del provider:** `src/providers/index.ts` exporta las instancias según `VITE_PROVIDER=osm|google`.

### ¿Qué tan difícil es migrar a Google?

**Dificultad: media-baja si se respeta esta arquitectura.** Estimado: ~½–1 día por adaptador; el trabajo grande es el mapa y el tema de facturación.

| Interfaz | OSM (MVP) | Google |
|---|---|---|
| `GeocodingProvider` | Photon + Nominatim | Places Autocomplete + Geocoding API |
| `PlacesProvider` | Overpass | Places API (Nearby Search) |
| `RoutingProvider` | OpenRouteService | Routes API / Distance Matrix |
| `TransitProvider` | transport.rest (VBB) | Routes API con modo transit (cobertura global) |
| `<MapView />` | Leaflet | `@vis.gl/react-google-maps` |

Puntos a considerar en la migración:
- Requiere API key **con facturación habilitada** y restringir la key por dominio.
- Mapear las categorías: los filtros OSM se convierten en tipos de Google (`supermarket`, `park`, `gym`, `shopping_mall`, `train_station`, `bus_station`, etc.). Añadir un campo opcional `googleTypes: string[]` a `PlaceCategory`.
- Los términos de uso de Google limitan cachear datos de Places y mostrarlos sobre un mapa que no sea de Google: al migrar, migrar también el mapa.
- Ventaja: mejores datos, nombres, horarios y transporte público global. Desventaja: costo por uso.

## 7. Flujo de análisis de un candidato

1. El usuario define la posición (búsqueda / clic / link).
2. Se guarda como candidato (o se analiza en modo borrador).
3. `useAnalyzeCandidate(candidate)`:
   1. **Overpass**: una sola consulta con todas las categorías habilitadas (`nwr(around:R,lat,lng)[filtro]; out center tags;`). Se agrupa por categoría en el cliente.
   2. Por categoría *nearest*: ordenar por distancia en línea recta (haversine) y quedarse con el **top 3**.
   3. **Matriz de rutas** (pie, bici, carro): 1 llamada por modo con origen = candidato y destinos = lugares fijos + top 3 de cada categoría.
   4. **Transporte público**: solo hacia los **lugares fijos** (no hacia cada POI). Salida en día laboral próximo a `transitDepartureTime`.
   5. Reordenar el top 3 por tiempo real en el modo principal.
   6. Para categorías *density*: solo `countInRadius`.
4. Guardar `analysis` con `computedAt`.
5. Mostrar resultados progresivamente (primero lugares fijos, luego categorías).

### 7.1 Puntuación ponderada

Función pura en `lib/scoring.ts` (sin dependencias de React ni de red), recalculable al instante cuando el usuario cambia pesos o umbrales, **sin volver a consultar APIs**.

- **Puntaje por elemento (0–100):** interpolación lineal según el tiempo real en el modo de puntuación.
  `tiempo <= idealMin` → 100 · `tiempo >= maxMin` → 0 · entre ambos, lineal.
- **Categorías `nearest`:** se usa el tiempo al lugar más cercano. Si no hay ninguno en el radio → 0.
- **Categorías `density`:** se usa el conteo. `idealMin` y `maxMin` se reinterpretan como **conteo ideal** y **conteo mínimo** (ej. 20 restaurantes = 100, 0 = 0).
- **Lugares fijos:** se puntúan con el `primaryMode` de Ajustes y su propia regla.
- **Total:** `Σ(puntaje × weight) / Σ(weight)`, ignorando elementos con `weight = 0` o sin datos (los elementos sin datos por error de red se excluyen y se avisa "puntuación parcial").
- **Desglose visible:** en el Resumen se muestra el total y un listado de aportes por elemento (barra en gris + puntaje + peso).
- **Valores por defecto:** lugares fijos `weight 5`, ideal 15 min, máx 60 min; supermercado `weight 4`, a pie, ideal 5, máx 20; parque `3`, a pie, ideal 8, máx 25; gimnasio `2`, bici, ideal 10, máx 30; estación de tren `4`, a pie, ideal 10, máx 30; parada de bus/tranvía `3`, a pie, ideal 3, máx 10; piscina `2`, bici, ideal 15, máx 40; restaurantes `2`, conteo ideal 20; resto `1`.
- **Ajustes:** pantalla con un slider de peso (0–5) por elemento y campos de umbrales; botón "Restaurar valores por defecto".

**Caché:** resultados de Overpass por `(lat redondeada a 4 decimales, lng, categoría, radio)` con TTL de 7 días en localStorage. Botón "Recalcular" para forzar.

**Errores:** cada bloque falla de forma independiente (ej. si transit falla, se sigue mostrando pie/bici/carro con aviso). Reintentos con backoff en Overpass (429/504). Mostrar aviso claro si falta la API key de rutas y se está usando estimación.

## 8. Pantallas y UX

### Layout general
- **Desktop:** mapa a la izquierda (~60%), panel lateral a la derecha con pestañas.
- **Móvil:** mapa arriba, panel como bottom sheet deslizable.
- Barra superior: nombre de la app, botón "Nuevo candidato", acceso a Ajustes.

### 8.1 Mapa
- Marcador del candidato activo (grande, negro).
- Marcadores de lugares fijos (icono en círculo blanco con borde negro).
- Marcadores de los lugares cercanos más próximos por categoría (icono pequeño gris).
- Al seleccionar un lugar en el panel, el mapa centra y dibuja la **ruta** (polilínea gris oscuro) si está disponible.
- Círculo tenue con el radio de la categoría seleccionada.
- Capas ocultables por categoría (chips de filtro sobre el mapa).

### 8.2 Pestaña "Resumen" (candidato activo)
- Cabecera: nombre, dirección, notas editables, link del anuncio y **puntuación total (0–100)** con desglose desplegable.
- **Tarjetas de lugares fijos:** por cada uno, tiempos con iconos 🚶 🚲 🚗 🚆 (usar iconos lucide, no emojis) y distancia. Destacar el modo principal.
- **Tarjetas por categoría:** nombre del lugar más cercano, distancia/tiempo, y "ver otros 2". En *density*: "23 restaurantes en 600 m" con barra de nivel (bajo / medio / alto).
- Estados: cargando (skeleton), error por bloque, vacío ("Nada encontrado en 2 km").

### 8.3 Pestaña "Candidatos"
- Lista de candidatos guardados (tarjeta compacta: nombre, dirección, tiempo al primer lugar fijo).
- Acciones: seleccionar, renombrar, duplicar, eliminar (con confirmación), recalcular.
- Botón "Comparar" con selección múltiple (2–4 candidatos).
- Ordenar por puntuación total, fecha o nombre.

### 8.4 Vista "Comparar"
- Tabla: filas = lugares fijos y categorías; columnas = candidatos.
- Cada celda muestra tiempo en el modo principal; **resalta con negrita/fondo gris más oscuro** el mejor valor de cada fila.
- Selector de modo para cambiar toda la tabla.
- Primera fila: **puntuación total** de cada candidato, con el mayor resaltado.
- Fila final de notas.

### 8.5 Pestaña "Lugares fijos"
- CRUD de lugares fijos: etiqueta, dirección (con el mismo buscador), icono opcional.
- Reordenar con arrastrar (opcional en MVP).
- Al cambiar un lugar fijo, marcar los análisis existentes como **desactualizados** y ofrecer recalcular.

### 8.6 Ajustes
- Modo principal de desplazamiento.
- Hora de referencia para transporte público.
- Categorías: activar/desactivar, radio, crear/editar/eliminar, restaurar por defecto.
- Datos: exportar/importar JSON, borrar todo.
- Estado de proveedores (ej. "API key de rutas: configurada / no configurada").
- **Prioridades y puntuación:** peso (0–5) y umbrales por lugar fijo y categoría (ver 7.1).

### 8.7 Agregar ubicación (modal o barra)
Cuatro entradas en un mismo control:
0. **Usar mi ubicación actual** (botón destacado en móvil). Ver 8.8.
1. **Buscar dirección** con autocompletado.
2. **Clic en el mapa:** modo "colocar pin" con geocodificación inversa para mostrar la dirección.
3. **Pegar link o coordenadas.** Parser soportado:
   - `52.3906, 13.0645` (lat, lng)
   - Links de Google Maps con `@lat,lng` o `?q=lat,lng` (los links cortos `maps.app.goo.gl` no se pueden resolver desde el navegador: mostrar mensaje pidiendo abrir el link y copiar las coordenadas).
   - Links de OpenStreetMap con `#map=zoom/lat/lng` o `mlat`/`mlon`.

### 8.8 Ubicación actual y uso en móvil

Caso de uso: estás **parado frente al apartamento** durante una visita y quieres evaluarlo al instante.

- Botón "Usar mi ubicación actual" que llama a `navigator.geolocation.getCurrentPosition` con `enableHighAccuracy: true`, `timeout: 10000`.
- Hook `useCurrentLocation()` (en `hooks/`) que devuelve `{ position, accuracyM, status, error, request }`. La UI no toca `navigator` directamente.
- Tras obtener la posición: centrar el mapa, mostrar el pin con un círculo de **precisión** y la dirección por geocodificación inversa.
- Si la precisión es peor que **50 m**, avisar "Ubicación poco precisa" y sugerir ajustar el pin manualmente (el pin es arrastrable) antes de guardar.
- Manejar los tres errores: permiso denegado (explicar cómo habilitarlo en el navegador), posición no disponible y timeout, cada uno con botón "Reintentar".
- Flujo rápido: ubicación → "Analizar aquí" → resumen con puntuación, sin pasos intermedios. Nombre por defecto: la dirección; editable después.
- **Requisito técnico:** la geolocalización solo funciona en **HTTPS** (o `localhost`). Para probar en el celular durante el desarrollo, usar `@vitejs/plugin-basic-ssl` o un túnel (ej. `cloudflared`/`ngrok`), y para uso real desplegar en un hosting estático con HTTPS (Netlify, Vercel, GitHub Pages).
- **Móvil primero:** objetivos táctiles de al menos 44 px, panel inferior (bottom sheet) con 3 alturas (colapsado / medio / completo), mapa siempre visible, sin depender de hover.
- **PWA opcional (recomendado):** manifest + service worker básico para instalarla en la pantalla de inicio y abrir rápido. El análisis requiere conexión; los candidatos ya guardados se pueden consultar sin red.

## 9. Diseño visual (escala de grises)

- Solo clases Tailwind de `white`, `black`, `gray-50…gray-950` (o `neutral`). **Prohibido** cualquier otro color, incluidos rojo/verde para errores o estados.
- Errores y advertencias: se distinguen con icono + texto + borde punteado/grueso, no con color.
- Mapa en gris: tiles CARTO Positron o filtro `grayscale(1)` sobre `.leaflet-tile-pane`.
- Jerarquía con peso tipográfico, tamaño y contraste, no con color.
- Tipografía: `Inter` (o sistema). Bordes redondeados moderados (`rounded-lg`), sombras suaves.
- Accesibilidad: contraste AA, foco visible (`ring-2 ring-gray-900`), botones de icono con `aria-label`, navegable por teclado.
- Tema oscuro: opcional en Fase 2 (usar `dark:` con la misma escala invertida).

## 10. Estructura del proyecto

```
src/
  app/
    App.tsx
    routes.tsx
  components/
    ui/                     # Button, Card, Badge, Input, Modal, Tabs, Spinner, EmptyState, IconButton
    map/                    # MapView, CandidateMarker, PlaceMarker, RouteLayer, RadiusCircle
    candidate/              # CandidateSummary, FixedPlaceCard, CategoryCard, DensityBar
    compare/                # CompareTable
    forms/                  # AddressSearch, CoordinateInput, FixedPlaceForm, CategoryForm
  hooks/
    useAnalyzeCandidate.ts
    useAddressSearch.ts
    useMapPicker.ts
    useCurrentLocation.ts
    useCandidateScore.ts
    useCandidates.ts
    useFixedPlaces.ts
    useSettings.ts
  providers/
    types.ts
    index.ts
    osm/                    # photon.ts, nominatim.ts, overpass.ts, ors.ts, transitRest.ts
    google/                 # (Fase 2, vacío al inicio)
  store/
    candidatesStore.ts
    fixedPlacesStore.ts
    settingsStore.ts
  lib/
    geo.ts                  # haversine, redondeo de coordenadas
    parseLocationInput.ts   # coordenadas y links
    estimateTravel.ts       # fallback sin API key
    scoring.ts              # puntuación ponderada (función pura, con tests)
    format.ts               # formato de minutos/distancias
    categories.ts           # categorías por defecto
  types/
    index.ts
  styles/
    index.css
```

## 11. Persistencia local

Claves de localStorage (con versión para migraciones):

- `wtl:v1:fixedPlaces`
- `wtl:v1:candidates`
- `wtl:v1:settings`
- `wtl:v1:cache:overpass` (con TTL)

Exportar/importar todo como un único JSON. Al importar: validar esquema (Zod) y preguntar si **reemplazar** o **combinar**.

## 12. Requisitos no funcionales

- Respetar límites de servicios gratuitos: debounce en búsqueda, una consulta Overpass por análisis, cola con throttling para Nominatim (1 req/s).
- Incluir atribución visible: "© OpenStreetMap contributors" y la de los tiles.
- Funcionar en Chrome, Firefox, Safari (desktop y móvil).
- Ninguna API key debe quedar en el repositorio (`.env` en `.gitignore`, incluir `.env.example`). Aclarar que las keys `VITE_*` son visibles en el navegador: usar una key restringida.
- Sin telemetría. Todos los datos quedan en el navegador.

## 13. Plan de implementación por fases

**Fase 0 – Base**
Vite + React + TS + Tailwind, componentes `ui/`, layout con mapa y panel, tipos y stores con persistencia.

**Fase 1 – Ubicación y lugares fijos**
`GeocodingProvider` (Photon/Nominatim), `AddressSearch`, clic en mapa, parser de coordenadas/links, **`useCurrentLocation` y botón "Usar mi ubicación actual"**, CRUD de lugares fijos. Configurar HTTPS local para probar en el celular.

**Fase 2 – Distancias a lugares fijos**
`RoutingProvider` (ORS) con fallback estimado, `TransitProvider`, tarjetas de lugares fijos y rutas en el mapa.

**Fase 3 – Lugares cercanos**
`PlacesProvider` (Overpass), categorías por defecto, top-3 con tiempos reales, densidad de restaurantes, caché.

**Fase 4 – Candidatos y comparación**
Lista de candidatos, notas, comparar 2–4, resaltado del mejor valor, **`lib/scoring.ts` con tests, `useCandidateScore`, puntuación total y desglose, pesos y umbrales en Ajustes**.

**Fase 5 – Móvil, ajustes y pulido**
Bottom sheet y diseño táctil, flujo rápido "Analizar aquí", PWA opcional, editor de categorías, exportar/importar, estados de error, accesibilidad, pruebas.

## 14. Criterios de aceptación del MVP

- [ ] Puedo definir al menos 2 lugares fijos y editarlos/borrarlos.
- [ ] Puedo poner una ubicación por dirección, clic en mapa y coordenadas/link.
- [ ] Veo tiempo y distancia a cada lugar fijo a pie, en bici, en carro y en transporte público (o aviso claro si un modo no está disponible).
- [ ] Veo el más cercano de cada categoría activa con distancia y tiempo reales, y puedo ver su ruta en el mapa.
- [ ] Veo la densidad de restaurantes de la zona.
- [ ] Puedo guardar varios candidatos, ponerles notas y compararlos en una tabla.
- [ ] Cada candidato tiene una puntuación 0–100 con desglose, y al cambiar pesos o umbrales se recalcula al instante sin nuevas consultas.
- [ ] Desde el celular (HTTPS) puedo usar mi ubicación actual, ver su precisión, ajustar el pin y analizar el lugar en un solo flujo.
- [ ] Al recargar la página, mis datos siguen ahí.
- [ ] Toda la interfaz (incluido el mapa) está en escala de grises.
- [ ] Cambiar de OSM a otro proveedor solo requiere implementar las interfaces de `providers/`, sin tocar `components/` ni `hooks/`.

## 15. Supuestos y decisiones abiertas

- Idioma de la UI: español.
- Transporte público solo con cobertura de Berlín-Brandenburg vía VBB; para otras ciudades habría que añadir otro `TransitProvider`.
- La API key de OpenRouteService es necesaria para tiempos reales (gratuita). Sin ella, la app funciona con estimaciones.
- "Zona de restaurantes" se mide por conteo dentro de 600 m; el umbral bajo/medio/alto es configurable (por defecto: <5 / 5–20 / >20).
- Los horarios de apertura de los lugares no se consideran en el MVP.
- Sin hijos: no hay categorías de colegios/Kitas por defecto (se pueden crear como categoría propia).
- La puntuación es una guía relativa basada en tiempos y conteos, no una medida objetiva de calidad de vida.

---

## Anexo A. Consulta Overpass de ejemplo

```
[out:json][timeout:25];
(
  nwr(around:2000,52.3906,13.0645)["shop"="supermarket"];
  nwr(around:2500,52.3906,13.0645)["leisure"="park"];
  nwr(around:3000,52.3906,13.0645)["leisure"="fitness_centre"];
  nwr(around:1000,52.3906,13.0645)["highway"="bus_stop"];
);
out center tags;
```

Cada categoría genera su bloque con su propio radio; en el cliente se clasifica cada elemento según los filtros de la categoría.

## Anexo B. Prompt sugerido para Claude Code / Copilot en VS Code

> Lee `spec-app-ubicacion-vivienda.md` y ejecuta la **Fase 0**. Respeta los principios de la sección 3 (separación gráfico/funcional, componentes reutilizables en `components/ui/`, providers detrás de interfaces) y la paleta solo en escala de grises. Al terminar, resume qué quedó hecho y qué sigue en la Fase 1.
