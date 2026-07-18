import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, PageBreak, ImageRun,
} from "docx";
import { buildExperienceTimeline } from "./experience";
import { formatDotDate, formatExactDuration } from "./date-format";

function cell(text: string, opts: { bold?: boolean; width?: number } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text, bold: opts.bold })] })],
  });
}

function headerRow(labels: string[]) {
  return new TableRow({ children: labels.map((l) => cell(l, { bold: true })) });
}

function p(text: string, opts: { bold?: boolean; size?: number; alignment?: any; spacing?: number } = {}) {
  return new Paragraph({
    alignment: opts.alignment,
    spacing: { after: opts.spacing ?? 120 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size })],
  });
}

const DEGREE_LABELS: Record<string, string> = {
  "BDS/UG": "B.D.S.",
  "MDS/PG": "M.D.S.",
  Other: "Any Other",
};

function currentFinancialYear(date: Date) {
  // Indian FY: April - March
  const y = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return `FY ${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export async function generateAffidavitDocx(data: {
  profile: any;
  qualifications: any[];
  history: any[];
  publications: any[];
  photoBuffer?: Buffer | null;
  photoType?: "jpg" | "png" | "gif" | "bmp";
  currentSegmentStart?: string | null;
  salaryRecords?: { month: string; salary_amount: number | null; tds_amount: number | null }[];
}) {
  const {
    profile, qualifications, history, publications, photoBuffer, photoType = "jpg",
    currentSegmentStart, salaryRecords = [],
  } = data;

  const { entries, totalYears: totalExperienceYears } = buildExperienceTimeline(
    (history ?? []) as any,
    profile.present_designation,
    currentSegmentStart ?? profile.doj_hids,
    profile.relieving_date ?? null
  );

  const qualRows = (qualifications ?? []).map((q: any) =>
    new TableRow({
      children: [
        cell(q.degree_type === "Other" ? (q.degree_name || "Other") : DEGREE_LABELS[q.degree_type] ?? q.degree_type),
        cell(q.college_name ?? ""),
        cell(q.university_name ?? ""),
        cell(q.year_month_passing ?? ""),
        cell(q.speciality ?? ""),
        cell(profile.state_dental_council ?? ""),
        cell(profile.sdc_reg_no ?? ""),
      ],
    })
  );
  if (qualRows.length === 0) {
    qualRows.push(new TableRow({ children: ["", "", "", "", "", "", ""].map((t) => cell(t)) }));
  }

  const experienceRows = entries.length > 0
    ? entries.map((e) =>
        new TableRow({
          children: [
            cell(e.position),
            cell(e.institution_name),
            cell(formatDotDate(e.from_date)),
            cell(e.to_date ? formatDotDate(e.to_date) : "Till date"),
            cell(formatExactDuration(e.from_date, e.to_date)),
          ],
        })
      )
    : [new TableRow({ children: ["", "", "", "", ""].map((t) => cell(t)) })];
  experienceRows.push(
    new TableRow({
      children: [
        cell(""), cell(""), cell(""),
        cell("Total Experience", { bold: true }),
        cell(`${totalExperienceYears.toFixed(1)} years (approx.)`, { bold: true }),
      ],
    })
  );

  // Last 6 calendar months of salary
  const now = new Date();
  const last6Months: { label: string; key: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6Months.push({ label: d.toLocaleString("en-US", { month: "long", year: "numeric" }), key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` });
  }
  const salaryByMonth = new Map((salaryRecords ?? []).map((r) => [r.month.slice(0, 7), r]));
  const salaryRows = last6Months.map(({ label, key }) => {
    const rec = salaryByMonth.get(key);
    return new TableRow({
      children: [cell(label), cell(rec?.salary_amount != null ? String(rec.salary_amount) : "—")],
    });
  });
  const salaryTotal = last6Months.reduce((sum, { key }) => sum + (salaryByMonth.get(key)?.salary_amount ?? 0), 0);

  // TDS grouped by Indian financial year, last 3 FYs
  const fyLabels: string[] = [];
  for (let i = 2; i >= 0; i--) {
    fyLabels.push(currentFinancialYear(new Date(now.getFullYear(), now.getMonth() - i * 12, 1)));
  }
  const uniqueFys = Array.from(new Set(fyLabels));
  const tdsByFy = new Map<string, number>();
  (salaryRecords ?? []).forEach((r) => {
    const fy = currentFinancialYear(new Date(r.month));
    tdsByFy.set(fy, (tdsByFy.get(fy) ?? 0) + (r.tds_amount ?? 0));
  });
  const tdsRows = uniqueFys.map((fy) => new TableRow({ children: [cell(fy), cell(String(tdsByFy.get(fy) ?? 0))] }));

  const pubRows = (publications ?? [])
    .filter((pub: any) => pub.status === "verified")
    .map((pub: any, i: number) =>
      new TableRow({
        children: [
          cell(String(i + 1)),
          cell(pub.title ?? ""),
          cell(pub.journal_name ?? ""),
          cell(pub.category ?? ""),
          cell(String(pub.verified_points ?? "")),
        ],
      })
    );
  if (pubRows.length === 0) {
    pubRows.push(new TableRow({ children: ["1.", "", "", "", ""].map((t) => cell(t)) }));
  }

  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
  };

  const doc = new Document({
    sections: [
      {
        children: [
          p("(Appendix – 1)", { alignment: AlignmentType.RIGHT, size: 20 }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 60 },
            children: [new TextRun({ text: "AFFIDAVIT", bold: true })],
          }),
          p("(On Non-Judicial Stamp Paper)", { alignment: AlignmentType.CENTER, size: 20, spacing: 240 }),

          ...(photoBuffer
            ? [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new ImageRun({
                      data: photoBuffer,
                      transformation: { width: 110, height: 140 },
                      type: photoType,
                    }),
                  ],
                }),
              ]
            : []),

          p(`1.  I, Dr. ${profile.full_name ?? "_______________________________"}`),
          p(`     S/o, D/o, W/o ${profile.father_name || profile.husband_name || "_______________________________"}`),
          p(`2.  Date of Birth (DD/MM/YYYY): ${profile.date_of_birth ?? "________________"}`),
          p("3.  Residential Address of Faculty:"),
          p(`     (a) Present: ${[profile.present_address_line1, profile.present_address_line2, profile.present_district, profile.present_state, profile.present_pincode].filter(Boolean).join(", ") || "_______________________________"}`),
          p(`     (b) Permanent: ${[profile.permanent_address_line1, profile.permanent_address_line2, profile.permanent_district, profile.permanent_state, profile.permanent_pincode].filter(Boolean).join(", ") || "_______________________________"}`),
          p(`4.  Contact Details: Mobile No. ${profile.mobile_no ?? "________________"}   Email: ${profile.email ?? "________________"}`),
          p(`6.  PAN Card No. ${profile.pan_no ?? "________________"}  (Certified copy to be enclosed)`),
          p(`7.  Aadhaar Card No. ${profile.aadhaar_no ?? "________________"}  (Certified copy to be enclosed)`),
          p("8.  Qualifications:", { spacing: 60 }),

          new Table({
            borders: tableBorders,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(["Degree", "Institution", "University", "Year/Month of Passing", "Speciality", "State Dental Council", "Registration No."]),
              ...qualRows,
            ],
          }),
          p("", { spacing: 120 }),

          p(`9.   Present Designation: ${profile.present_designation ?? "________________"}`),
          p("10.  Name and Postal Address of Institution: Himachal Institute of Dental Sciences, Paonta Sahib, District Sirmour, Himachal Pradesh"),
          p(`11.  Present Institute Appointment Order No. ${profile.present_appt_order_no ?? "________________"}  Date: ${profile.present_appt_order_date ?? "________________"}`),

          p("", { spacing: 400 }),
          p("(Signature of Faculty)" + "\t".repeat(6) + "(Signature of Dean/Principal)"),

          new Paragraph({ children: [new PageBreak()] }),

          p(`12.  Before joining present institution I was working at ${profile.last_college_name ?? "________________"}`),
          p(`      as ${profile.last_college_designation ?? "________________"} and relieved on ${profile.last_college_relieving_date ?? "________________"}.`),
          p(`      (i) Appointment Order No. ${profile.previous_appt_order_no ?? "________________"} & Date ${profile.previous_appt_order_date ?? "________________"}`),
          p(`      (ii) Relieving Order No. ${profile.previous_relieving_order_no ?? "________________"} & Date ${profile.previous_relieving_order_date ?? "________________"}`),

          p("13.  TEACHING EXPERIENCE (less than one year not considered)", { spacing: 60 }),
          new Table({
            borders: tableBorders,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow(["Position", "Name of Institution", "From", "To", "Duration"]), ...experienceRows],
          }),
          p("", { spacing: 120 }),

          p("14.  TOTAL SALARY DRAWN FROM THE COLLEGE IN THE LAST SIX (6) MONTHS", { spacing: 60 }),
          new Table({
            borders: tableBorders,
            width: { size: 60, type: WidthType.PERCENTAGE },
            rows: [headerRow(["Month", "Salary Drawn"]), ...salaryRows, new TableRow({ children: [cell("Total", { bold: true }), cell(String(salaryTotal), { bold: true })] })],
          }),
          p("(Certified copy of Bank Statement/Pass Book to be attached)", { size: 16, spacing: 240 }),

          p("15.  TDS FOR THE LAST THREE FINANCIAL YEARS", { spacing: 60 }),
          new Table({
            borders: tableBorders,
            width: { size: 60, type: WidthType.PERCENTAGE },
            rows: [headerRow(["Financial Year", "TDS Deducted"]), ...tdsRows],
          }),
          p("(Copy of Form 16 from TRACES to be attached)", { size: 16, spacing: 240 }),

          p("16.  DETAILS OF PUBLICATIONS (verified only):", { spacing: 60 }),
          new Table({
            borders: tableBorders,
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow(["S.No.", "Title of the Article", "Journal Details", "Category", "Points"]), ...pubRows],
          }),

          p("", { spacing: 400 }),
          p("(Signature of Faculty)" + "\t".repeat(6) + "(Signature of Dean/Principal)"),

          new Paragraph({ children: [new PageBreak()] }),

          p("DECLARATION", { bold: true, alignment: AlignmentType.CENTER, spacing: 240 }),
          p(`1.  I, Dr. ${profile.full_name ?? "_______________"}, do hereby give an undertaking that I am working as a full time salaried employee designated as ${profile.present_designation ?? "________"} at Himachal Institute of Dental Sciences, Paonta Sahib on all working days.`),
          p("2.  I am working as a Full Time/Part Time* faculty. (*As per Rule 16 of DCI, MDS Course Regulations, 2017)"),
          p("3.  I have not presented myself to any other Institution as a faculty in the current academic year for the purpose of DCI Inspection."),
          p("4.  I am not having private practice anywhere OR I am practicing at ________________________________ in the city of ________________________________."),
          p("5.  I hereby declare that the above information and documents provided by me are true, correct and authentic to the best of my knowledge."),
          p("", { spacing: 400 }),
          p("Date: ________________" + "\t".repeat(6) + "(Signature of the Deponent)"),

          p("", { spacing: 400 }),
          p("This is to certify that the information given by the above deponent is correct and nothing has been concealed."),
          p("", { spacing: 400 }),
          p("Signature of Principal" + "\t".repeat(8) + "Signature of Chairman of the Trust"),
          p("with seal and date" + "\t".repeat(9) + "with seal and date"),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
