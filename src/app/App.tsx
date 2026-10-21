import { useCallback, useEffect, useMemo, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { CandidateMarker, MapView, PlaceMarker, RadiusCircle, RouteLayer } from '@/components/map';
import { Button, Icon, TabPanel, Tabs } from '@/components/ui';
import {
  useActiveCandidate,
  useAnalyzeCandidate,
  useCandidates,
  useCandidateScore,
  useCandidateScores,
  useCandidatesActions,
  useCompareSelection,
  useCurrentLocation,
  useEnabledCategories,
  useFixedPlaces,
  useFixedPlacesActions,
  useMapPicker,
  useRoute,
  useSettings,
  useSortedCandidates,
  type CandidateSort,
} from '@/hooks';
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, FOCUS_ZOOM } from '@/lib/constants';
import { providers } from '@/providers';
import { useCandidatesStore, useFixedPlacesStore, useSettingsStore } from '@/store';
import type {
  Candidate,
  FixedPlace,
  LatLng,
  NearbyPlace,
  PlaceCategory,
  RoutableMode,
  TravelMode,
} from '@/types';
import { AddLocationModal } from './AddLocationModal';
import { FixedPlaceModal } from './FixedPlaceModal';
import { queryClient } from './queryClient';
import { PANEL_TABS, type PanelTabId, type ViewId } from './routes';
import { TopBar } from './TopBar';
import { WorkspaceLayout } from './WorkspaceLayout';
import { CandidatesPanel } from './panels/CandidatesPanel';
import { CompareView } from './panels/CompareView';
import { FixedPlacesPanel } from './panels/FixedPlacesPanel';
import { SettingsView } from './panels/SettingsView';
import { SummaryPanel } from './panels/SummaryPanel';

/**
 * Contenedor de la app: conecta stores, hooks y providers con componentes
 * presentacionales. Aquí no hay lógica de dominio ni llamadas de red directas.
 */
function AppShell() {
  const [view, setView] = useState<ViewId>('workspace');
  const [tab, setTab] = useState<PanelTabId>('summary');
  const [sort, setSort] = useState<CandidateSort>('score');
  const [focus, setFocus] = useState<(LatLng & { zoom?: number }) | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [draftPosition, setDraftPosition] = useState<LatLng | null>(null);
  const [fixedPlaceModal, setFixedPlaceModal] = useState<{ open: boolean; editing: FixedPlace | null }>(
    { open: false, editing: null },
  );
  // Ruta dibujada: un lugar fijo o un POI de categoría, nunca los dos a la vez.
  const [routeTarget, setRouteTarget] = useState<
    { kind: 'fixed'; id: string; position: LatLng } | { kind: 'place'; id: string; position: LatLng } | null
  >(null);
  const [compareMode, setCompareMode] = useState<TravelMode>('foot');
  // Categoría cuyos lugares se muestran en el mapa, con su círculo de radio.
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const candidates = useCandidates();
  const scores = useCandidateScores();
  const sortedCandidates = useSortedCandidates(sort, scores);
  const activeCandidate = useActiveCandidate();
  const activeScore = useCandidateScore(activeCandidate);
  const compareSelection = useCompareSelection();
  const {
    add: addCandidate,
    update: updateCandidate,
    remove: removeCandidate,
    setActive,
    toggleCompare,
    duplicate: duplicateCandidate,
  } = useCandidatesActions();
  const fixedPlaces = useFixedPlaces();
  const { addPlace, updatePlace, removePlace } = useFixedPlacesActions();
  const settings = useSettings();
  const categories = useEnabledCategories();
  const primaryMode = settings.primaryMode;

  const currentLocation = useCurrentLocation();
  const analysis = useAnalyzeCandidate();

  // Modo "colocar pin": al tocar el mapa vuelve a abrirse el modal con el punto.
  const picker = useMapPicker(
    useCallback((position: LatLng) => {
      setDraftPosition(position);
      setAddOpen(true);
    }, []),
  );

  const mapCenter = activeCandidate?.position ?? fixedPlaces[0]?.position ?? DEFAULT_MAP_CENTER;

  // Al obtener la ubicación actual se centra el mapa (sección 8.8).
  useEffect(() => {
    if (currentLocation.position) {
      setFocus({ ...currentLocation.position, zoom: FOCUS_ZOOM });
    }
  }, [currentLocation.position]);

  const routeMode: RoutableMode = primaryMode === 'transit' ? 'foot' : primaryMode;
  const route = useRoute(
    activeCandidate && routeTarget
      ? { origin: activeCandidate.position, destination: routeTarget.position, mode: routeMode }
      : null,
  );

  const runAnalysis = useCallback(
    (candidate: Candidate) => {
      setTab('summary');
      void analysis.run(candidate);
    },
    [analysis],
  );

  const onSelectCandidate = useCallback(
    (id: string) => {
      setActive(id);
      const candidate = candidates.find((item) => item.id === id);
      if (candidate) setFocus({ ...candidate.position, zoom: FOCUS_ZOOM });
      setRouteTarget(null);
      setTab('summary');
    },
    [candidates, setActive],
  );

  const onSelectFixedPlace = useCallback(
    (id: string) => {
      const place = fixedPlaces.find((item) => item.id === id);
      if (place) setFocus({ ...place.position, zoom: FOCUS_ZOOM });
    },
    [fixedPlaces],
  );

  const onAddCandidate = useCallback(() => {
    setDraftPosition(null);
    currentLocation.reset();
    setAddOpen(true);
  }, [currentLocation]);

  const onSubmitLocation = useCallback(
    ({ name, address, position }: { name: string; address: string; position: LatLng }) => {
      const id = addCandidate({ name, address, position });
      setAddOpen(false);
      setDraftPosition(null);
      currentLocation.reset();
      setFocus({ ...position, zoom: FOCUS_ZOOM });
      // Flujo rápido de la sección 8.8: ubicación -> analizar, sin pasos extra.
      const created = useCandidatesStore.getState().items.find((item) => item.id === id);
      if (created && fixedPlaces.length > 0) runAnalysis(created);
      else setTab('summary');
    },
    [addCandidate, currentLocation, fixedPlaces.length, runAnalysis],
  );

  const onRequestMapPick = useCallback(() => {
    setAddOpen(false);
    picker.start();
  }, [picker]);

  const onShowRoute = useCallback((place: FixedPlace) => {
    setRouteTarget((current) =>
      current?.id === place.id ? null : { kind: 'fixed', id: place.id, position: place.position },
    );
    setFocus({ ...place.position, zoom: FOCUS_ZOOM });
  }, []);

  const onShowPlaceRoute = useCallback((place: NearbyPlace, category: PlaceCategory) => {
    setSelectedCategoryId(category.id);
    setRouteTarget((current) =>
      current?.id === place.osmId
        ? null
        : { kind: 'place', id: place.osmId, position: place.position },
    );
    setFocus({ ...place.position, zoom: FOCUS_ZOOM });
  }, []);

  const clearAllData = useCallback(() => {
    useCandidatesStore.getState().clear();
    useFixedPlacesStore.getState().clear();
    useSettingsStore.getState().resetAll();
    setView('workspace');
    setRouteTarget(null);
  }, []);

  const panelTabs = useMemo(
    () =>
      PANEL_TABS.map((item) =>
        item.id === 'candidates'
          ? { ...item, count: candidates.length }
          : item.id === 'fixedPlaces'
            ? { ...item, count: fixedPlaces.length }
            : item,
      ),
    [candidates.length, fixedPlaces.length],
  );

  const shownAnalysis = analysis.partial ?? activeCandidate?.analysis ?? null;
  const selectedCategory = categories.find((item) => item.id === selectedCategoryId) ?? null;
  const selectedCategoryPlaces =
    shownAnalysis?.categories.find((result) => result.categoryId === selectedCategoryId)?.nearest ??
    [];

  const map = (
    <MapView
      tiles={providers.tiles}
      center={mapCenter}
      zoom={DEFAULT_MAP_ZOOM}
      focus={focus}
      picking={picker.picking}
      onMapClick={picker.picking ? picker.pick : undefined}
      className="h-full"
    >
      <RouteLayer points={route.points} />

      {fixedPlaces.map((place) => (
        <PlaceMarker
          key={place.id}
          position={place.position}
          iconName={place.icon}
          label={place.label}
          kind="fixed"
          onClick={() => onSelectFixedPlace(place.id)}
        />
      ))}

      {candidates.map((candidate) => (
        <CandidateMarker
          key={candidate.id}
          position={candidate.position}
          label={candidate.name}
          active={candidate.id === activeCandidate?.id}
          onClick={() => onSelectCandidate(candidate.id)}
        />
      ))}

      {/* Pin en edición: arrastrable para ajustarlo antes de guardar (8.8). */}
      {draftPosition ? (
        <CandidateMarker
          position={draftPosition}
          label="Ubicación nueva"
          draggable
          onDragEnd={(position) => {
            setDraftPosition(position);
            picker.move(position);
          }}
        />
      ) : null}

      {/* Lugares de la categoría elegida, con su radio (sección 8.1). */}
      {selectedCategory && activeCandidate ? (
        <RadiusCircle
          center={activeCandidate.position}
          radiusM={selectedCategory.radiusM}
          variant="category"
        />
      ) : null}

      {selectedCategory
        ? selectedCategoryPlaces.map((place) => (
            <PlaceMarker
              key={place.osmId}
              position={place.position}
              iconName={selectedCategory.icon}
              label={place.name ?? selectedCategory.label}
              kind="nearby"
              onClick={() => onShowPlaceRoute(place, selectedCategory)}
            />
          ))
        : null}

      {currentLocation.position && currentLocation.accuracyM ? (
        <RadiusCircle
          center={currentLocation.position}
          radiusM={currentLocation.accuracyM}
          variant="accuracy"
        />
      ) : null}
    </MapView>
  );

  /* Chips de filtro sobre el mapa: una capa de categoría a la vez (8.1). */
  const categoryChips =
    activeCandidate && shownAnalysis && shownAnalysis.categories.length > 0 ? (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex gap-1.5 overflow-x-auto px-2 py-2">
        {categories
          .filter((category) => category.kind === 'nearest')
          .map((category) => {
            const found = shownAnalysis.categories.find(
              (result) => result.categoryId === category.id,
            );
            if (!found || found.nearest.length === 0) return null;
            const active = category.id === selectedCategoryId;
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedCategoryId(active ? null : category.id);
                  setRouteTarget(null);
                }}
                className={
                  active
                    ? 'pointer-events-auto inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-gray-900 bg-gray-900 px-2.5 text-xs font-medium text-white shadow-sm'
                    : 'pointer-events-auto inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-gray-300 bg-white/95 px-2.5 text-xs text-gray-800 shadow-sm hover:bg-gray-50'
                }
              >
                <Icon name={category.icon} size={12} />
                {category.label}
              </button>
            );
          })}
      </div>
    ) : null;

  const mapWithChips = (
    <div className="relative h-full w-full">
      {map}
      {categoryChips}
    </div>
  );

  const panel = (
    <div className="flex min-h-0 flex-col">
      <Tabs items={panelTabs} value={tab} onChange={setTab} label="Secciones del panel" />
      <div className="min-h-0 flex-1 p-3">
        <TabPanel id="summary" active={tab === 'summary'}>
          <SummaryPanel
            candidate={activeCandidate}
            fixedPlaces={fixedPlaces}
            categories={categories}
            densityThresholds={settings.densityThresholds}
            score={activeScore}
            primaryMode={primaryMode}
            analysisStatus={analysis.status}
            partialResults={analysis.partial}
            blocks={analysis.blocks}
            analysisError={analysis.error}
            onAnalyze={() => activeCandidate && runAnalysis(activeCandidate)}
            onCancelAnalyze={analysis.cancel}
            onAddCandidate={onAddCandidate}
            onAddFixedPlace={() => setFixedPlaceModal({ open: true, editing: null })}
            onChangeNotes={(notes) =>
              activeCandidate && updateCandidate(activeCandidate.id, { notes })
            }
            onShowRoute={onShowRoute}
            onShowPlaceRoute={onShowPlaceRoute}
            routePlaceId={routeTarget?.kind === 'fixed' ? routeTarget.id : null}
            routeOsmId={routeTarget?.kind === 'place' ? routeTarget.id : null}
            routeAvailable={route.available}
          />
        </TabPanel>

        <TabPanel id="candidates" active={tab === 'candidates'}>
          <CandidatesPanel
            candidates={sortedCandidates}
            activeId={activeCandidate?.id ?? null}
            scores={scores}
            compareIds={compareSelection.map((candidate) => candidate.id)}
            sort={sort}
            onChangeSort={setSort}
            onSelect={onSelectCandidate}
            onAddCandidate={onAddCandidate}
            onRemove={removeCandidate}
            onDuplicate={duplicateCandidate}
            onToggleCompare={toggleCompare}
            onOpenCompare={() => setView('compare')}
            onAnalyze={(id) => {
              const candidate = candidates.find((item) => item.id === id);
              if (candidate) {
                setActive(id);
                runAnalysis(candidate);
              }
            }}
          />
        </TabPanel>

        <TabPanel id="fixedPlaces" active={tab === 'fixedPlaces'}>
          <FixedPlacesPanel
            places={fixedPlaces}
            onAddPlace={() => setFixedPlaceModal({ open: true, editing: null })}
            onEditPlace={(id) => {
              const place = fixedPlaces.find((item) => item.id === id);
              if (place) setFixedPlaceModal({ open: true, editing: place });
            }}
            onRemovePlace={removePlace}
            onSelectPlace={onSelectFixedPlace}
          />
        </TabPanel>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-white">
      <TopBar
        view={view}
        onChangeView={setView}
        onNewCandidate={onAddCandidate}
        candidateCount={candidates.length}
      />

      {picker.picking ? (
        <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-gray-900 bg-gray-50 px-3 py-2">
          <p className="text-sm font-medium text-gray-900">
            Toca el punto exacto en el mapa.
          </p>
          <Button size="sm" leadingIcon={<X size={14} />} onClick={picker.cancel}>
            Cancelar
          </Button>
        </div>
      ) : null}

      {view === 'workspace' ? <WorkspaceLayout map={mapWithChips} panel={panel} /> : null}
      {view === 'compare' ? (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <CompareView
            candidates={candidates}
            selected={compareSelection}
            scores={scores}
            fixedPlaces={fixedPlaces}
            categories={settings.categories}
            mode={compareMode}
            onChangeMode={setCompareMode}
            onToggle={toggleCompare}
            onBack={() => setView('workspace')}
          />
        </main>
      ) : null}
      {view === 'settings' ? (
        <main className="min-h-0 flex-1 overflow-y-auto">
          <SettingsView onClearAllData={clearAllData} />
        </main>
      ) : null}

      <AddLocationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        position={draftPosition}
        onChangePosition={setDraftPosition}
        onRequestMapPick={onRequestMapPick}
        onSubmit={onSubmitLocation}
        currentLocation={currentLocation}
        searchBias={mapCenter}
      />

      <FixedPlaceModal
        open={fixedPlaceModal.open}
        editing={fixedPlaceModal.editing}
        onClose={() => setFixedPlaceModal({ open: false, editing: null })}
        searchBias={mapCenter}
        onSubmit={(draft) => {
          if (fixedPlaceModal.editing) {
            updatePlace(fixedPlaceModal.editing.id, {
              label: draft.label,
              icon: draft.icon,
              position: draft.position,
              address: draft.address,
            });
          } else {
            addPlace({
              label: draft.label,
              icon: draft.icon,
              position: draft.position,
              address: draft.address,
            });
          }
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
