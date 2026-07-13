import { Document, Packer, Paragraph, TextRun } from "docx";
import { formatOrdinalDate } from "./date-format";
import { HIDS_PRINCIPAL_NAME } from "./constants";

function p(text: string, opts: { bold?: boolean; spacing?: number } = {}) {
  return new Paragraph({
    spacing: { after: opts.spacing ?? 200 },
    children: [new TextRun({ text, bold: opts.bold })],
  });
}

export async function generatePromotionLetterDocx(data: {
  facultyName: string;
  toDesignation: string;
  department: string;
  promotionDate: string;
  refNo?: string;
}) {
  const { facultyName, toDesignation, department, promotionDate, refNo } = data;
  const today = new Date().toISOString().slice(0, 10);

  const doc = new Document({
    sections: [
      {
        children: [
          p(`Ref. No. ${refNo ?? "HIDS/PAO/"}\t\t\t\t\t\t\t\tDate: ${formatOrdinalDate(today)}`, { spacing: 400 }),

          p(`Dr. ${facultyName}`, { spacing: 0 }),
          p(toDesignation, { spacing: 0 }),
          p(`Dept. of ${department}`, { spacing: 0 }),
          p("Himachal Institute of Dental Sciences", { spacing: 0 }),
          p("Paonta Sahib (H.P.)", { spacing: 300 }),

          p(`Sub:  Promotion Letter as ${toDesignation}.`, { bold: true, spacing: 300 }),

          p(`Dear Dr. ${facultyName},`, { spacing: 200 }),

          p(
            `It is my pleasure to inform you that you have been promoted to the position of ${toDesignation}, in the Department of ${department} w.e.f. ${formatOrdinalDate(promotionDate)}. Other terms and conditions mentioned in your appointment letter will remain the same.`,
            { spacing: 400 }
          ),

          p("", { spacing: 600 }),
          p(`(${HIDS_PRINCIPAL_NAME})`, { spacing: 0 }),
          p("Principal", { spacing: 0 }),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
