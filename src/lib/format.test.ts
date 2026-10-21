import { describe, expect, it } from 'vitest';
import { formatDistanceKm, formatDuration, formatMeters, formatScore } from './format';

describe('formatDuration', () => {
  it('muestra minutos por debajo de una hora', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(7.4)).toBe('7 min');
    expect(formatDuration(59)).toBe('59 min');
  });

  it('muestra horas y minutos por encima', () => {
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(65)).toBe('1 h 05 min');
    expect(formatDuration(125)).toBe('2 h 05 min');
  });

  it('usa guion cuando no hay dato', () => {
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(Number.NaN)).toBe('—');
  });
});

describe('formatDistanceKm', () => {
  it('usa metros por debajo de 1 km', () => {
    expect(formatDistanceKm(0.45)).toBe('450 m');
  });

  it('usa km con coma decimal por encima', () => {
    expect(formatDistanceKm(2.34)).toBe('2,3 km');
  });

  it('usa guion cuando no hay dato', () => {
    expect(formatDistanceKm(undefined)).toBe('—');
  });
});

describe('formatMeters', () => {
  it('cambia de unidad en 1000 m', () => {
    expect(formatMeters(600)).toBe('600 m');
    expect(formatMeters(2000)).toBe('2,0 km');
  });
});

describe('formatScore', () => {
  it('redondea a entero', () => {
    expect(formatScore(72.6)).toBe('73');
  });

  it('usa guion sin puntuación', () => {
    expect(formatScore(undefined)).toBe('—');
  });
});
