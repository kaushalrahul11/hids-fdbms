import { yearsBetween, formatExactDuration } from "./date-format";

export type HistoryRow = { position: string; institution_name: string; from_date: string; to_date: string | null; source?: string };

export const EXPERIENCE_BUCKETS = [
  { key: "Tutor", label: "Tutor" },
  { key: "Lecturer", label: "Lecturer/Asst. Professor" },
  { key: "Reader", label: "Reader/Associate Professor" },
  { key: "Professor", label: "Professor" },
  { key: "Principal", label: "Dean/Principal" },
];

function bucketFor(position: string) {
  if (position === "Professor & Head") return "Professor";
  if (EXPERIENCE_BUCKETS.some((b) => b.key === position)) return position;
  return "Professor";
}

/**
 * Builds a designation-wise experience breakdown purely from
 * faculty_employment_history. Every faculty member should have one "open"
 * row (to_date = null) representing their current, ongoing designation —
 * previous colleges and past HIDS designations are all closed rows. This
 * function does NOT do any separate "current segment" calculation; the open
 * row already covers that. Summing every row exactly once is what avoids
 * double-counting.
 */
export function buildDesignationBreakdown(history: HistoryRow[]) {
  const buckets: Record<string, { institutions: string[]; totalYears: number }> = {};
  EXPERIENCE_BUCKETS.forEach((b) => (buckets[b.key] = { institutions: [], totalYears: 0 }));

  history.forEach((h) => {
    const bucket = bucketFor(h.position);
    const years = yearsBetween(h.from_date, h.to_date);
    buckets[bucket].institutions.push(`${h.institution_name} (${h.from_date} to ${h.to_date ?? "present"}, ${formatExactDuration(h.from_date, h.to_date)})`);
    buckets[bucket].totalYears += years;
  });

  const totalYears = Object.values(buckets).reduce((sum, b) => sum + b.totalYears, 0);

  return {
    buckets: EXPERIENCE_BUCKETS.map((b) => ({ label: b.label, ...buckets[b.key] })),
    totalYears,
  };
}

/**
 * Flat, chronologically-sorted list of every institution/position segment
 * (previous colleges + auto-recorded HIDS designations, including the
 * still-open current one), each with an exact from/to/duration — used for
 * the affidavit's "Name of Institution / From / To" experience table and
 * the experience certificate.
 */
export function buildExperienceTimeline(history: HistoryRow[]) {
  const entries = history
    .map((h) => ({ position: h.position, institution_name: h.institution_name, from_date: h.from_date, to_date: h.to_date }))
    .sort((a, b) => new Date(a.from_date).getTime() - new Date(b.from_date).getTime());

  const totalYears = entries.reduce((sum, e) => sum + yearsBetween(e.from_date, e.to_date), 0);

  return { entries, totalYears };
}
