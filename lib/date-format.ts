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

export function formatYears(years: number) {
  const y = Math.floor(years);
  const m = Math.round((years - y) * 12);
  if (m === 12) return `${y + 1} years`;
  return m > 0 ? `${y} years ${m} months` : `${y} years`;
}
