const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number) {
  if (n >= 11 && n <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** Formats "2026-06-01" as "1st June 2026" */
export function formatOrdinalDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "________________";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Formats "2026-06-01" as "01.06.2026" (DD.MM.YYYY, used in experience tables) */
export function formatDotDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "________";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export function yearsBetween(from: string, to: string | null) {
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
}

/** Exact calendar year/month/day breakdown between two dates (not an approximation). */
export function preciseDuration(from: string, to: string | null) {
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years: Math.max(years, 0), months: Math.max(months, 0), days: Math.max(days, 0) };
}

export function formatDuration({ years, months, days }: { years: number; months: number; days: number }) {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? "s" : ""}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  return parts.join(", ");
}

/** Exact "till date" duration for a single from/to range, as "X years, Y months, Z days". */
export function formatExactDuration(from: string, to: string | null) {
  return formatDuration(preciseDuration(from, to));
}

/** Approximate y/m/d breakdown for an aggregated total (sum of several ranges,
 *  where there's no single from/to pair to diff exactly). */
export function formatYears(decimalYears: number) {
  const totalDays = Math.round(decimalYears * 365.25);
  const years = Math.floor(totalDays / 365.25);
  const afterYears = totalDays - Math.round(years * 365.25);
  const months = Math.floor(afterYears / 30.44);
  const days = Math.round(afterYears - months * 30.44);
  return formatDuration({ years, months, days: Math.max(days, 0) });
}
