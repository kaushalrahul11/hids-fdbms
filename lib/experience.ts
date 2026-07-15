import { yearsBetween } from "./date-format";
import { HIDS_INSTITUTION_NAME } from "./constants";

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
 * Builds a designation-wise experience breakdown from employment history
 * (previous colleges + auto-recorded past HIDS designations) plus the
 * faculty's current, still-open HIDS designation.
 */
export function buildDesignationBreakdown(
  history: HistoryRow[],
  currentDesignation: string | null,
  currentSegmentStart: string | null, // doj_hids, or the date of their most recent promotion
  endDate: string | null // relieving_date, or null if still active (defaults to today)
) {
  const buckets: Record<string, { institutions: string[]; totalYears: number }> = {};
  EXPERIENCE_BUCKETS.forEach((b) => (buckets[b.key] = { institutions: [], totalYears: 0 }));

  history.forEach((h) => {
    const bucket = bucketFor(h.position);
    const years = yearsBetween(h.from_date, h.to_date);
    buckets[bucket].institutions.push(`${h.institution_name} (${h.from_date} to ${h.to_date ?? "present"}, ${years.toFixed(1)}y)`);
    buckets[bucket].totalYears += years;
  });

  if (currentSegmentStart && currentDesignation) {
    const bucket = bucketFor(currentDesignation);
    const years = yearsBetween(currentSegmentStart, endDate);
    buckets[bucket].institutions.push(`${HIDS_INSTITUTION_NAME} (${currentSegmentStart} to ${endDate ?? "present"}, ${years.toFixed(1)}y)`);
    buckets[bucket].totalYears += years;
  }

  const totalYears = Object.values(buckets).reduce((sum, b) => sum + b.totalYears, 0);

  return {
    buckets: EXPERIENCE_BUCKETS.map((b) => ({ label: b.label, ...buckets[b.key] })),
    totalYears,
  };
}
