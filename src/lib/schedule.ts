/**
 * Hora de referencia del transporte público (sección 7): "el próximo día
 * laboral a las HH:MM". Función pura para poder fijar la fecha en los tests.
 */
const WEEKEND = new Set([0, 6]); // domingo y sábado

export function parseTimeOfDay(time: string): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match?.[1] || !match[2]) return null;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

export function isWeekday(date: Date): boolean {
  return !WEEKEND.has(date.getDay());
}

/**
 * Próximo día laboral a la hora dada, siempre en el futuro respecto a `from`.
 * Si hoy es laboral y la hora aún no pasó, es hoy.
 */
export function nextWeekdayDeparture(time: string, from: Date = new Date()): Date {
  const parsed = parseTimeOfDay(time) ?? { hours: 8, minutes: 0 };
  const candidate = new Date(from);
  candidate.setHours(parsed.hours, parsed.minutes, 0, 0);

  if (candidate <= from) candidate.setDate(candidate.getDate() + 1);
  // Como mucho se avanzan 2 días (sábado -> lunes).
  while (!isWeekday(candidate)) candidate.setDate(candidate.getDate() + 1);

  return candidate;
}
