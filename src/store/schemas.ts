import { z } from 'zod';
import type { Candidate, FixedPlace, PlaceCategory, Settings } from '@/types';

/**
 * Esquemas de validación de lo que se lee de localStorage y de lo que se
 * importa como JSON (sección 11). Si un registro está corrupto se descarta en
 * vez de romper la app al arrancar.
 */

export const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const scoringRuleSchema = z.object({
  weight: z.number().min(0).max(5),
  idealMin: z.number().min(0),
  maxMin: z.number().min(0),
});

export const travelModeSchema = z.enum(['foot', 'bike', 'car', 'transit']);

export const fixedPlaceSchema: z.ZodType<FixedPlace> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  address: z.string(),
  position: latLngSchema,
  icon: z.string().optional(),
  scoring: scoringRuleSchema,
});

export const placeCategorySchema: z.ZodType<PlaceCategory> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  icon: z.string(),
  enabled: z.boolean(),
  kind: z.enum(['nearest', 'density']),
  radiusM: z.number().positive(),
  osmFilters: z.array(z.string()),
  scoring: scoringRuleSchema,
  scoringMode: travelModeSchema,
  custom: z.boolean().optional(),
  googleTypes: z.array(z.string()).optional(),
});

const travelInfoSchema = z.object({
  mode: travelModeSchema,
  durationMin: z.number(),
  distanceKm: z.number().optional(),
  estimated: z.boolean(),
  transfers: z.number().optional(),
});

const travelByModeSchema = z.record(travelModeSchema, travelInfoSchema);

const nearbyPlaceSchema = z.object({
  osmId: z.string(),
  name: z.string().optional(),
  position: latLngSchema,
  straightLineKm: z.number(),
  travel: travelByModeSchema.optional(),
});

const analysisSchema = z.object({
  computedAt: z.string(),
  fixed: z.array(
    z.object({
      fixedPlaceId: z.string(),
      straightLineKm: z.number(),
      travel: travelByModeSchema,
    }),
  ),
  categories: z.array(
    z.object({
      categoryId: z.string(),
      nearest: z.array(nearbyPlaceSchema),
      countInRadius: z.number().optional(),
      radiusM: z.number(),
    }),
  ),
  score: z
    .object({
      total: z.number(),
      breakdown: z.array(
        z.object({
          itemId: z.string(),
          label: z.string(),
          score: z.number(),
          weight: z.number(),
        }),
      ),
      partial: z.boolean().optional(),
    })
    .optional(),
});

export const candidateSchema: z.ZodType<Candidate> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string(),
  position: latLngSchema,
  notes: z.string().optional(),
  listingUrl: z.string().optional(),
  createdAt: z.string(),
  analysis: analysisSchema.optional(),
  stale: z.boolean().optional(),
});

export const settingsSchema: z.ZodType<Settings> = z.object({
  primaryMode: travelModeSchema,
  transitDepartureTime: z.string().regex(/^\d{2}:\d{2}$/),
  categories: z.array(placeCategorySchema),
  densityThresholds: z.object({ low: z.number().min(0), high: z.number().min(0) }),
});

/** Conserva sólo los elementos válidos de una lista persistida. */
export function keepValid<T>(schema: z.ZodType<T>, value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  const result: T[] = [];
  for (const item of value) {
    const parsed = schema.safeParse(item);
    if (parsed.success) result.push(parsed.data);
  }
  return result;
}
