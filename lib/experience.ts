import { yearsBetween, formatExactDuration } from "./date-format";
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
    buckets[bucket].institutions.push(`${h.institution_name} (${h.from_date} to ${h.to_date ?? "present"}, ${formatExactDuration(h.from_date, h.to_date)})`);
    buckets[bucket].totalYears += years;
  });

  if (currentSegmentStart && currentDesignation) {
    const bucket = bucketFor(currentDesignation);
    const years = yearsBetween(currentSegmentStart, endDate);
    buckets[bucket].institutions.push(`${HIDS_INSTITUTION_NAME} (${currentSegmentStart} to ${endDate ?? "present"}, ${formatExactDuration(currentSegmentStart, endDate)})`);
    buckets[bucket].totalYears += years;
  }

  const totalYears = Object.values(buckets).reduce((sum, b) => sum + b.totalYears, 0);

  return {
    buckets: EXPERIENCE_BUCKETS.map((b) => ({ label: b.label, ...buckets[b.key] })),
    totalYears,
  };
}

/**
 * Flat, chronologically-sorted list of every institution/position segment
 * (previous colleges + auto-recorded HIDS designations + the current open
 * segment), each with an exact from/to/duration — used for the affidavit's
 * "Name of Institution / From / To" experience table.
 */
export function buildExperienceTimeline(
  history: HistoryRow[],
  currentDesignation: string | null,
  currentSegmentStart: string | null,
  endDate: string | null
) {
  const entries: { position: string; institution_name: string; from_date: string; to_date: string | null }[] =
    history.map((h) => ({ position: h.position, institution_name: h.institution_name, from_date: h.from_date, to_date: h.to_date }));

  if (currentSegmentStart && currentDesignation) {
    entries.push({
      position: currentDesignation, institution_name: HIDS_INSTITUTION_NAME,
      from_date: currentSegmentStart, to_date: endDate,
    });
  }

  entries.sort((a, b) => new Date(a.from_date).getTime() - new Date(b.from_date).getTime());

  const totalYears = entries.reduce((sum, e) => sum + yearsBetween(e.from_date, e.to_date), 0);

  return { entries, totalYears };
}
