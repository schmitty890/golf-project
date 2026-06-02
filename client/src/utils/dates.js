// Local-time date helpers. We deal in 'YYYY-MM-DD' strings and build Date objects from
// parts (never toISOString) to avoid UTC day-shift bugs.

const pad = (n) => String(n).padStart(2, '0');

// Date parts -> 'YYYY-MM-DD'. Accepts a Date or (year, monthIndex, day).
export function toDateStr(y, m, d) {
  if (y instanceof Date) return `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

// Today as 'YYYY-MM-DD' in local time.
export function todayStr() {
  return toDateStr(new Date());
}

// 'YYYY-MM-DD' -> local Date at midnight.
export function parseDateStr(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Add days to a 'YYYY-MM-DD' string, returning a new 'YYYY-MM-DD'.
export function addDays(s, n) {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// Inclusive list of 'YYYY-MM-DD' strings from `start` to `end` (swaps if reversed).
export function dateRange(start, end) {
  let a = start;
  let b = end;
  if (a > b) [a, b] = [b, a];
  const out = [];
  for (let cur = a; cur <= b; cur = addDays(cur, 1)) out.push(cur);
  return out;
}

// 'Sat, Jun 6'
export function formatDayLabel(s) {
  return parseDateStr(s).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

// 'June 2026'
export function formatMonthLabel(year, monthIndex) {
  return new Date(year, monthIndex, 1).toLocaleDateString(undefined, {
    month: 'long', year: 'numeric',
  });
}

// Build a calendar grid (weeks of 7) for a month. Leading/trailing slots are null.
// Week starts Sunday to match the WEEKDAYS ordering used elsewhere.
export function monthGrid(year, monthIndex) {
  const firstWeekday = new Date(year, monthIndex, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(toDateStr(year, monthIndex, day));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
