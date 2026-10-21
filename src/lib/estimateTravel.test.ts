import { describe, expect, it } from 'vitest';
import { DETOUR_FACTOR, estimateTravel, estimateTravelFromKm } from './estimateTravel';

describe('estimateTravelFromKm', () => {
  it('aplica el factor de rodeo de la spec', () => {
    expect(estimateTravelFromKm(1, 'foot').distanceKm).toBe(DETOUR_FACTOR);
  });

  it('usa 5 km/h a pie: 1 km recto => 1,3 km => 15,6 min', () => {
    expect(estimateTravelFromKm(1, 'foot').durationMin).toBeCloseTo(15.6, 1);
  });

  it('usa 15 km/h en bici y 30 km/h en carro', () => {
    expect(estimateTravelFromKm(1, 'bike').durationMin).toBeCloseTo(5.2, 1);
    expect(estimateTravelFromKm(1, 'car').durationMin).toBeCloseTo(2.6, 1);
  });

  it('siempre marca el resultado como estimado', () => {
    for (const mode of ['foot', 'bike', 'car'] as const) {
      expect(estimateTravelFromKm(2, mode).estimated).toBe(true);
    }
  });

  it('es más rápido cuanto más rápido es el modo', () => {
    const foot = estimateTravelFromKm(5, 'foot').durationMin;
    const bike = estimateTravelFromKm(5, 'bike').durationMin;
    const car = estimateTravelFromKm(5, 'car').durationMin;
    expect(foot).toBeGreaterThan(bike);
    expect(bike).toBeGreaterThan(car);
  });

  it('da 0 min para distancia 0', () => {
    expect(estimateTravelFromKm(0, 'foot').durationMin).toBe(0);
  });
});

describe('estimateTravel', () => {
  it('calcula desde dos posiciones', () => {
    const result = estimateTravel({ lat: 52.3915, lng: 13.0669 }, { lat: 52.4004, lng: 13.0384 }, 'bike');
    // 2,17 km rectos × 1,3 = 2,82 km a 15 km/h => ~11,3 min
    expect(result.distanceKm).toBeCloseTo(2.82, 1);
    expect(result.durationMin).toBeCloseTo(11.3, 0);
    expect(result.mode).toBe('bike');
  });
});
