import { describe, expect, it } from 'vitest';
import { boundsOf, haversineKm, isValidLatLng, roundCoord, samePosition } from './geo';

const potsdamHbf = { lat: 52.3915, lng: 13.0669 };
const sansSouci = { lat: 52.4004, lng: 13.0384 };

describe('haversineKm', () => {
  it('es 0 para el mismo punto', () => {
    expect(haversineKm(potsdamHbf, potsdamHbf)).toBe(0);
  });

  it('mide una distancia conocida', () => {
    // Potsdam Hbf -> Sanssouci: 0,0089° de lat (0,99 km) y 0,0285° de lng a
    // lat 52,4° (1,94 km) => 2,17 km en línea recta.
    expect(haversineKm(potsdamHbf, sansSouci)).toBeCloseTo(2.17, 2);
  });

  it('es simétrica', () => {
    expect(haversineKm(potsdamHbf, sansSouci)).toBeCloseTo(haversineKm(sansSouci, potsdamHbf), 10);
  });

  it('mide un grado de latitud en ~111 km', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
  });
});

describe('roundCoord', () => {
  it('redondea a 4 decimales por defecto (clave de caché)', () => {
    expect(roundCoord(52.390612)).toBe(52.3906);
    expect(roundCoord(13.06459)).toBe(13.0646);
  });

  it('acepta otra precisión', () => {
    expect(roundCoord(52.390612, 2)).toBe(52.39);
  });
});

describe('isValidLatLng', () => {
  it('acepta coordenadas válidas', () => {
    expect(isValidLatLng({ lat: 52.39, lng: 13.06 })).toBe(true);
  });

  it('rechaza fuera de rango, NaN y valores no numéricos', () => {
    expect(isValidLatLng({ lat: 91, lng: 0 })).toBe(false);
    expect(isValidLatLng({ lat: 0, lng: 181 })).toBe(false);
    expect(isValidLatLng({ lat: Number.NaN, lng: 0 })).toBe(false);
    expect(isValidLatLng({ lat: '52', lng: 13 })).toBe(false);
    expect(isValidLatLng(null)).toBe(false);
  });
});

describe('samePosition', () => {
  it('ignora diferencias por debajo de la precisión', () => {
    expect(samePosition({ lat: 52.390612, lng: 13.0646 }, { lat: 52.3906119, lng: 13.0646 })).toBe(true);
  });

  it('distingue posiciones diferentes', () => {
    expect(samePosition(potsdamHbf, sansSouci)).toBe(false);
  });
});

describe('boundsOf', () => {
  it('devuelve null sin posiciones', () => {
    expect(boundsOf([])).toBeNull();
  });

  it('encierra todas las posiciones', () => {
    expect(boundsOf([potsdamHbf, sansSouci])).toEqual({
      south: 52.3915,
      west: 13.0384,
      north: 52.4004,
      east: 13.0669,
    });
  });
});
