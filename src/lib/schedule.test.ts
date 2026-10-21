import { describe, expect, it } from 'vitest';
import { isWeekday, nextWeekdayDeparture, parseTimeOfDay } from './schedule';

// 2026-09-28 es lunes.
const lunes0700 = new Date(2026, 8, 28, 7, 0, 0);
const lunes0900 = new Date(2026, 8, 28, 9, 0, 0);
const viernes0900 = new Date(2026, 9, 2, 9, 0, 0);
const sabado1200 = new Date(2026, 9, 3, 12, 0, 0);

describe('parseTimeOfDay', () => {
  it('lee HH:MM', () => {
    expect(parseTimeOfDay('08:00')).toEqual({ hours: 8, minutes: 0 });
    expect(parseTimeOfDay('7:45')).toEqual({ hours: 7, minutes: 45 });
  });

  it('rechaza horas imposibles y basura', () => {
    expect(parseTimeOfDay('25:00')).toBeNull();
    expect(parseTimeOfDay('08:73')).toBeNull();
    expect(parseTimeOfDay('mañana')).toBeNull();
  });
});

describe('isWeekday', () => {
  it('distingue fin de semana', () => {
    expect(isWeekday(lunes0700)).toBe(true);
    expect(isWeekday(sabado1200)).toBe(false);
    expect(isWeekday(new Date(2026, 9, 4))).toBe(false); // domingo
  });
});

describe('nextWeekdayDeparture', () => {
  it('usa hoy si es laboral y la hora no ha pasado', () => {
    const result = nextWeekdayDeparture('08:00', lunes0700);
    expect(result.getDate()).toBe(28);
    expect(result.getHours()).toBe(8);
    expect(result.getMinutes()).toBe(0);
  });

  it('pasa a mañana si la hora ya pasó', () => {
    const result = nextWeekdayDeparture('08:00', lunes0900);
    expect(result.getDate()).toBe(29);
    expect(result.getHours()).toBe(8);
  });

  it('salta el fin de semana: viernes por la tarde => lunes', () => {
    const result = nextWeekdayDeparture('08:00', viernes0900);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(5);
  });

  it('desde sábado va al lunes', () => {
    const result = nextWeekdayDeparture('08:00', sabado1200);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(5);
  });

  it('siempre devuelve un momento futuro y laboral', () => {
    for (const from of [lunes0700, lunes0900, viernes0900, sabado1200]) {
      const result = nextWeekdayDeparture('08:00', from);
      expect(result.getTime()).toBeGreaterThan(from.getTime());
      expect(isWeekday(result)).toBe(true);
    }
  });

  it('cae a las 08:00 si la hora configurada es inválida', () => {
    expect(nextWeekdayDeparture('99:99', lunes0700).getHours()).toBe(8);
  });
});
