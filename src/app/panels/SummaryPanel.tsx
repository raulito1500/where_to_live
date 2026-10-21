import { ExternalLink, MapPin, RefreshCw, TriangleAlert } from 'lucide-react';
import { CategoryCard, FixedPlaceCard, ScoreBreakdown } from '@/components/candidate';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Spinner,
  Textarea,
} from '@/components/ui';
import type { AnalysisBlocks, AnalysisSnapshot, BlockState } from '@/lib/analysis';
import { formatCoords, formatDateTime } from '@/lib/format';
import type { AnalyzeStatus } from '@/hooks';
import type {
  Candidate,
  CandidateScore,
  FixedPlace,
  NearbyPlace,
  PlaceCategory,
  TravelMode,
} from '@/types';

export interface SummaryPanelProps {
  candidate: Candidate | null;
  fixedPlaces: FixedPlace[];
  primaryMode: TravelMode;
  categories: PlaceCategory[];
  densityThresholds: { low: number; high: number };
  score: CandidateScore | null;
  analysisStatus: AnalyzeStatus;
  /** Resultados en vivo mientras corre el análisis. */
  partialResults: AnalysisSnapshot | null;
  blocks: AnalysisBlocks | null;
  analysisError: string | null;
  onAnalyze: () => void;
  onCancelAnalyze: () => void;
  onAddCandidate: () => void;
  onAddFixedPlace: () => void;
  onChangeNotes: (notes: string) => void;
  onShowRoute: (place: FixedPlace) => void;
  onShowPlaceRoute: (place: NearbyPlace, category: PlaceCategory) => void;
  routePlaceId: string | null;
  routeOsmId: string | null;
  routeAvailable: boolean;
}

/** Aviso de un bloque que falló o cayó al modo estimado (sección 7, errores). */
function BlockNotice({ block }: { block: BlockState }) {
  if (block.status === 'ok' || block.status === 'skipped' || !block.message) return null;
  return (
    <p className="flex items-start gap-2 rounded-lg border-2 border-dashed border-gray-400 bg-gray-50 px-3 py-2 text-xs text-gray-800">
      <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
      {block.message}
    </p>
  );
}

/** Pestaña "Resumen" (sección 8.2). Las categorías cercanas llegan en la Fase 3. */
export function SummaryPanel({
  candidate,
  fixedPlaces,
  categories,
  densityThresholds,
  score,
  primaryMode,
  analysisStatus,
  partialResults,
  blocks,
  analysisError,
  onAnalyze,
  onCancelAnalyze,
  onAddCandidate,
  onAddFixedPlace,
  onChangeNotes,
  onShowRoute,
  onShowPlaceRoute,
  routePlaceId,
  routeOsmId,
  routeAvailable,
}: SummaryPanelProps) {
  if (!candidate) {
    return (
      <EmptyState
        icon={<MapPin size={22} />}
        title="Todavía no hay un candidato"
        description="Agrega una ubicación por GPS, dirección, clic en el mapa o pegando coordenadas para ver qué tan bien ubicada está."
        action={
          <Button variant="primary" onClick={onAddCandidate}>
            Agregar ubicación
          </Button>
        }
      />
    );
  }

  const running = analysisStatus === 'running';
  // Mientras corre se pintan los parciales; si no, lo guardado en el candidato.
  const results = partialResults?.fixed ?? candidate.analysis?.fixed ?? null;
  const categoryResults = partialResults?.categories ?? candidate.analysis?.categories ?? null;
  const analyzed = candidate.analysis !== undefined;

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader
          title={candidate.name}
          subtitle={candidate.address || formatCoords(candidate.position)}
          actions={
            candidate.stale ? (
              <Badge variant="warning" title="Cambió un lugar fijo desde el último análisis">
                Desactualizado
              </Badge>
            ) : null
          }
        />
        <CardBody className="flex flex-col gap-3">
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-gray-500">Coordenadas</dt>
              <dd className="font-medium text-gray-900 tabular-nums">
                {formatCoords(candidate.position)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Analizado</dt>
              <dd className="font-medium text-gray-900">
                {formatDateTime(candidate.analysis?.computedAt)}
              </dd>
            </div>
          </dl>

          {candidate.listingUrl ? (
            <a
              href={candidate.listingUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-900 underline"
            >
              <ExternalLink size={13} aria-hidden />
              Ver el anuncio
            </a>
          ) : null}

          <ScoreBreakdown score={score} />

          <Textarea
            label="Notas"
            placeholder="Tercer piso sin ascensor, patio interior…"
            value={candidate.notes ?? ''}
            onChange={(event) => onChangeNotes(event.target.value)}
            rows={2}
          />

          <div className="flex items-center gap-2">
            {running ? (
              <>
                <Spinner size={15} label="Analizando…" />
                <Button size="sm" onClick={onCancelAnalyze} className="ml-auto">
                  Cancelar
                </Button>
              </>
            ) : (
              <Button
                variant={analyzed ? 'secondary' : 'primary'}
                leadingIcon={analyzed ? <RefreshCw size={15} /> : undefined}
                onClick={onAnalyze}
                disabled={fixedPlaces.length === 0}
              >
                {analyzed ? 'Recalcular' : 'Analizar'}
              </Button>
            )}
          </div>

          {analysisError ? (
            <p className="rounded-lg border-2 border-dashed border-gray-400 px-3 py-2 text-xs text-gray-800">
              El análisis falló: {analysisError}
            </p>
          ) : null}
        </CardBody>
      </Card>

      {blocks ? (
        <div className="flex flex-col gap-2">
          <BlockNotice block={blocks.routing} />
          <BlockNotice block={blocks.transit} />
        </div>
      ) : null}

      {fixedPlaces.length === 0 ? (
        <EmptyState
          title="Faltan lugares fijos"
          description="Sin lugares fijos no hay nada contra qué medir este candidato. Agrega al menos uno (la universidad, el trabajo…)."
          action={
            <Button variant="primary" onClick={onAddFixedPlace}>
              Agregar lugar fijo
            </Button>
          }
        />
      ) : (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
            Lugares fijos
          </h2>
          {fixedPlaces.map((place) => (
            <FixedPlaceCard
              key={place.id}
              place={place}
              result={results?.find((result) => result.fixedPlaceId === place.id)}
              primaryMode={primaryMode}
              loading={running}
              onShowRoute={onShowRoute}
              routeShown={routePlaceId === place.id}
              routeAvailable={routeAvailable}
            />
          ))}
        </section>
      )}

      {!analyzed && !running && fixedPlaces.length > 0 ? (
        <EmptyState
          title="Sin analizar todavía"
          description="Pulsa Analizar para calcular los tiempos a tus lugares fijos y ver qué hay cerca."
        />
      ) : null}

      {categoryResults !== null && categories.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
            Qué hay cerca
          </h2>
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              result={categoryResults.find((result) => result.categoryId === category.id)}
              densityThresholds={densityThresholds}
              loading={running}
              {...(routeAvailable ? { onShowRoute: onShowPlaceRoute } : {})}
              routeOsmId={routeOsmId}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}
