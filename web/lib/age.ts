/** True when someone born on this date is 18 or over today. */
export function isAdult(dob: string, now = new Date()) {
  const [y, m, d] = dob.split("-").map(Number)
  if (!y || !m || !d) return false
  const eighteenth = new Date(y + 18, m - 1, d)
  return eighteenth <= now
}
