export interface MentorStatusRow {
  mentor: string;
  allocated: number;
  higherStudies: number;
  removed: number;
  placed: number;
  yetToBePlaced: number;
  notEligible: number;
}

export type MentorStatusTotals = Omit<MentorStatusRow, "mentor">;

interface StudentLike {
  mentor: string;
  category: string;
  placed: string;
}

export const MENTOR_STATUS_HEADERS = [
  "S.No",
  "MENTOR",
  "No.of Students Allocated",
  "Higher Studies",
  "Removed From Placement",
  "No of Students Placed",
  "Yet to be placed",
  "Not Eligible",
];

const KNOWN_PLACED_VALUES = ["YES", "NO", "NE", "NA"];

const MONTH_NAMES = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

// "2026-09" (an <input type="month"> value) -> "SEPTEMBER 2026"
export function monthTitle(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return "";
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// Same columns/logic as the professor's sheet: Yet to be placed = Allocated - Higher Studies
// - Removed - Placed (so it includes Not Eligible students; Not Eligible is informational).
// Mentors keep first-appearance order from the sheet, then sort by Placed descending —
// Array.sort is stable, so ties stay in sheet order, matching her sample.
export function buildMentorStatus(students: StudentLike[]): {
  rows: MentorStatusRow[];
  totals: MentorStatusTotals;
} {
  const byMentor = new Map<string, MentorStatusRow>();

  for (const s of students) {
    const mentor = (s.mentor || "").trim();
    if (!mentor) continue;

    let row = byMentor.get(mentor);
    if (!row) {
      row = { mentor, allocated: 0, higherStudies: 0, removed: 0, placed: 0, yetToBePlaced: 0, notEligible: 0 };
      byMentor.set(mentor, row);
    }

    const category = (s.category || "").trim().toUpperCase();
    const placed = (s.placed || "").trim().toUpperCase();

    row.allocated++;
    if (category === "HS") row.higherStudies++;
    if (placed === "YES") row.placed++;
    if (placed === "NE") row.notEligible++;
    if (category === "RF PLACEMENT" || (placed && !KNOWN_PLACED_VALUES.includes(placed))) row.removed++;
  }

  const rows = [...byMentor.values()];
  rows.forEach((r) => {
    r.yetToBePlaced = r.allocated - r.higherStudies - r.removed - r.placed;
  });
  rows.sort((a, b) => b.placed - a.placed);

  const totals: MentorStatusTotals = {
    allocated: 0, higherStudies: 0, removed: 0, placed: 0, yetToBePlaced: 0, notEligible: 0,
  };
  rows.forEach((r) => {
    totals.allocated += r.allocated;
    totals.higherStudies += r.higherStudies;
    totals.removed += r.removed;
    totals.placed += r.placed;
    totals.yetToBePlaced += r.yetToBePlaced;
    totals.notEligible += r.notEligible;
  });

  return { rows, totals };
}

const numbers = (r: MentorStatusTotals) => [
  r.allocated, r.higherStudies, r.removed, r.placed, r.yetToBePlaced, r.notEligible,
].map(String);

export async function createMentorStatusPdf(
  rows: MentorStatusRow[],
  totals: MentorStatusTotals,
  monthLabel: string
) {
  const { default: jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const cx = pageWidth / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SRM INSTITUTE OF SCIENCE AND TECHNOLOGY, RAMAPURAM", cx, 12, { align: "center" });
  doc.setFontSize(10);
  doc.text("FACULTY OF ENGINEERING AND TECHNOLOGY", cx, 17.5, { align: "center" });
  doc.text("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", cx, 23, { align: "center" });
  doc.setFontSize(9.5);
  doc.text(`BATCH 2027 - MENTOR MENTEE MONTHLY STATUS - ${monthLabel}`, cx, 31, { align: "center" });

  const totalCellStyle = { fontStyle: "bold" as const, fillColor: [230, 234, 240] as [number, number, number] };
  const body = [
    ...rows.map((r, i) => [String(i + 1), r.mentor, ...numbers(r)]),
    [
      { content: "TOTAL", colSpan: 2, styles: { ...totalCellStyle, halign: "center" as const } },
      ...numbers(totals).map((n) => ({ content: n, styles: totalCellStyle })),
    ],
  ];

  const margin = 12;
  const numWidth = (pageWidth - margin * 2 - 10 - 58) / 6;

  autoTable(doc, {
    startY: 35,
    margin: { left: margin, right: margin },
    head: [MENTOR_STATUS_HEADERS],
    body,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 0.6, lineColor: [120, 120, 120], lineWidth: 0.15, valign: "middle", textColor: 20 },
    headStyles: { fillColor: [21, 101, 192], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 6.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 58 },
      2: { cellWidth: numWidth, halign: "center" },
      3: { cellWidth: numWidth, halign: "center" },
      4: { cellWidth: numWidth, halign: "center" },
      5: { cellWidth: numWidth, halign: "center" },
      6: { cellWidth: numWidth, halign: "center" },
      7: { cellWidth: numWidth, halign: "center" },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  let sigY = finalY + 22;
  if (sigY > pageHeight - 14) {
    doc.addPage();
    sigY = 40;
  }

  doc.setDrawColor(80);
  doc.setLineWidth(0.3);
  doc.setFontSize(9);
  const lineLen = 60;
  const leftX = margin + 6;
  const rightX = pageWidth - margin - 6 - lineLen;
  [
    { x: leftX, label: "PLACEMENT COORDINATOR" },
    { x: rightX, label: "HOD / CSE" },
  ].forEach(({ x, label }) => {
    doc.line(x, sigY, x + lineLen, sigY);
    doc.text(label, x + lineLen / 2, sigY + 5.5, { align: "center" });
  });

  return doc;
}

export async function createMentorStatusDocxBlob(
  rows: MentorStatusRow[],
  totals: MentorStatusTotals,
  monthLabel: string
): Promise<Blob> {
  const {
    Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun,
    WidthType, AlignmentType, TableLayoutType, VerticalAlign, Tab, TabStopType,
  } = await import("docx");

  const COL_WIDTHS = [600, 3300, 1094, 1094, 1094, 1094, 1094, 1094];
  const TABLE_WIDTH = COL_WIDTHS.reduce((a, b) => a + b, 0);
  const noSpacing = { before: 0, after: 0 };

  const centered = (text: string, size: number, after = 0) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after },
      children: [new TextRun({ text, bold: true, size })],
    });

  const cell = (
    text: string,
    colIdx: number,
    opts: { header?: boolean; total?: boolean; span?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}
  ) => {
    const width = opts.span ? COL_WIDTHS[colIdx] + COL_WIDTHS[colIdx + 1] : COL_WIDTHS[colIdx];
    return new TableCell({
      width: { size: width, type: WidthType.DXA },
      columnSpan: opts.span,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 10, bottom: 10, left: 60, right: 60 },
      shading: opts.header ? { fill: "1565C0" } : opts.total ? { fill: "E6EAF0" } : undefined,
      children: [
        new Paragraph({
          alignment: opts.align ?? (colIdx === 1 ? AlignmentType.LEFT : AlignmentType.CENTER),
          spacing: noSpacing,
          children: [
            new TextRun({
              text,
              size: opts.header ? 13 : 15,
              bold: opts.header || opts.total,
              color: opts.header ? "FFFFFF" : undefined,
            }),
          ],
        }),
      ],
    });
  };

  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: MENTOR_STATUS_HEADERS.map((h, i) => cell(h, i, { header: true, align: AlignmentType.CENTER })),
    }),
    ...rows.map(
      (r, i) =>
        new TableRow({
          cantSplit: true,
          children: [String(i + 1), r.mentor, ...numbers(r)].map((t, c) => cell(t, c)),
        })
    ),
    new TableRow({
      cantSplit: true,
      children: [
        cell("TOTAL", 0, { total: true, span: 2, align: AlignmentType.CENTER }),
        ...numbers(totals).map((t, c) => cell(t, c + 2, { total: true })),
      ],
    }),
  ];

  const sigLine = "_".repeat(30);
  const sigTabs = [{ type: TabStopType.RIGHT, position: TABLE_WIDTH }];

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: [
          centered("SRM INSTITUTE OF SCIENCE AND TECHNOLOGY, RAMAPURAM", 22),
          centered("FACULTY OF ENGINEERING AND TECHNOLOGY", 20),
          centered("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", 20, 160),
          centered(`BATCH 2027 - MENTOR MENTEE MONTHLY STATUS - ${monthLabel}`, 19, 120),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: COL_WIDTHS,
            layout: TableLayoutType.FIXED,
            rows: tableRows,
          }),
          new Paragraph({
            spacing: { before: 900, after: 0 },
            tabStops: sigTabs,
            children: [new TextRun({ text: sigLine, size: 20 }), new TextRun({ children: [new Tab(), sigLine], size: 20 })],
          }),
          new Paragraph({
            spacing: { before: 40, after: 0 },
            tabStops: sigTabs,
            children: [
              new TextRun({ text: "PLACEMENT COORDINATOR", bold: true, size: 18 }),
              new TextRun({ children: [new Tab(), "HOD / CSE"], bold: true, size: 18 }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
