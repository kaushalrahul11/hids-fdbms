import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { formatOrdinalDate, formatDotDate } from "./date-format";
import { HIDS_PRINCIPAL_NAME } from "./constants";

function p(text: string, opts: { bold?: boolean; spacing?: number; center?: boolean } = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : undefined,
    spacing: { after: opts.spacing ?? 200 },
    children: [new TextRun({ text, bold: opts.bold })],
  });
}

export type PositionSegment = { label: string; from: string; to: string | null };

export async function generateExperienceCertificateDocx(data: {
  facultyName: string;
  qualificationLabel: string;
  department: string;
  segments: PositionSegment[];
  isRelieved: boolean;
  relievingDate?: string | null;
  relievingReason?: string | null;
  refNo?: string;
}) {
  const { facultyName, qualificationLabel, department, segments, isRelieved, relievingDate, relievingReason, refNo } = data;
  const today = new Date().toISOString().slice(0, 10);
  const title = isRelieved ? "EXPERIENCE CUM RELIEVING CERTIFICATE" : "EXPERIENCE CERTIFICATE";

  const segmentParagraphs = segments.map((s) =>
    p(`${s.label}\t\t:\t${formatDotDate(s.from)} to ${s.to ? formatDotDate(s.to) : "till date"}`, { spacing: 100 })
  );

  const closingParagraph = isRelieved
    ? p(
        `He/She has been relieved from his/her duties w.e.f. ${formatOrdinalDate(relievingDate)}${relievingReason ? ` on ${relievingReason}` : " on his/her own request"}. During the period his/her work and conduct was satisfactory.`,
        { spacing: 400 }
      )
    : p(
        `He/She is currently serving as a full time teaching faculty member at this Institute. During the period his/her work and conduct has been satisfactory.`,
        { spacing: 400 }
      );

  const doc = new Document({
    sections: [
      {
        children: [
          p(`Ref. No.: ${refNo ?? "HIDS/PAO/"}\t\t\t\t\t\t\t\tDated: ${formatOrdinalDate(today)}`, { spacing: 400 }),
          p(title, { bold: true, center: true, spacing: 400 }),
          p(
            `This is to certify that Dr. ${facultyName}, ${qualificationLabel} has worked in this Institute as teaching faculty in the department of ${department} as under:`,
            { spacing: 300 }
          ),
          ...segmentParagraphs,
          p("", { spacing: 300 }),
          closingParagraph,
          p("", { spacing: 600 }),
          p(`(${HIDS_PRINCIPAL_NAME})`, { spacing: 0 }),
          p("Principal", { spacing: 0 }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
