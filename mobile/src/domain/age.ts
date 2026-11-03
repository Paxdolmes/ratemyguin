/** True when someone born on this day is 18 or over on `now`. */
export function isAdult(year: number, month: number, day: number, now = new Date()) {
  if (!year || !month || !day || month > 12 || day > 31 || year < 1900) return false;
  const born = new Date(year, month - 1, day);
  if (born.getMonth() !== month - 1) return false; // e.g. 31 February
  return new Date(year + 18, month - 1, day) <= now;
}
