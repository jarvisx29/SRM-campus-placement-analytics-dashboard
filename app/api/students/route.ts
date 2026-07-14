import { NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const SHEET_RANGE = "GDS!A:AC";

let cache: { data: Student[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export interface Student {
  sno: string;
  category: string;
  eligible: string;
  enrolled: string;
  degree: string;
  gender: string;
  dob: string;
  tenth: string;
  twelfth: string;
  cgpa: string;
  backlogs: string;
  officialMail: string;
  personalMail: string;
  phone: string;
  mentor: string;
  class: string;
  registerNo: string;
  studentName: string;
  placed: string;
  offers: string;
  offerType: string;
  offer1: string;
  offer2: string;
  offer3: string;
  offer4: string;
  offer5: string;
  offer6: string;
  resumeLink: string;
  trainingCategory: string;
}

function fixPercent(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  const num = parseFloat(trimmed); // parseFloat ignores trailing "%"
  if (!isNaN(num) && num > 100) return (num / 100).toFixed(2);
  return trimmed.replace(/%/g, "").trim() || trimmed;
}

async function fetchSheetData(): Promise<Student[]> {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_RANGE,
  });

  const rows = response.data.values;
  if (!rows || rows.length < 2) return [];

  const [, ...dataRows] = rows;

  return dataRows
    .filter((row) => row[1] || row[16] || row[17])
    .map((row) => ({
      sno: row[0] || "",
      category: (row[1] || "").trim().toUpperCase(),
      eligible: row[2] || "",
      enrolled: row[3] || "",
      degree: row[4] || "",
      gender: row[5] || "",
      dob: row[6] || "",
      tenth: fixPercent(row[7] || ""),
      twelfth: fixPercent(row[8] || ""),
      cgpa: fixPercent(row[9] || ""),
      backlogs: row[10] || "",
      officialMail: row[11] || "",
      personalMail: row[12] || "",
      phone: row[13] || "",
      mentor: row[14] || "",
      class: row[15] || "",
      registerNo: row[16] || "",
      studentName: row[17] || "",
      placed: row[18] || "",
      offers: row[19] || "",
      offerType: row[20] || "",
      offer1: row[21] || "",
      offer2: row[22] || "",
      offer3: row[23] || "",
      offer4: row[24] || "",
      offer5: row[25] || "",
      offer6: row[26] || "",
      resumeLink: row[27] || "",
      trainingCategory: row[28] || "",
    }));
}

function getDept(cls: string): string {
  const parts = cls.trim().split(/\s+/);
  return parts.length <= 1 ? cls.trim() : parts.slice(0, -1).join(" ");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mentor = searchParams.get("mentor") || "";
  const category = searchParams.get("category") || "";
  const dept = searchParams.get("dept") || "";

  try {
    if (!cache || Date.now() - cache.ts > CACHE_TTL) {
      const data = await fetchSheetData();
      cache = { data, ts: Date.now() };
    }

    let students = cache.data;

    if (mentor) {
      students = students.filter(
        (s) => s.mentor.toLowerCase() === mentor.toLowerCase()
      );
    }
    if (category) {
      students = students.filter(
        (s) => s.category.toLowerCase() === category.toLowerCase()
      );
    }
    if (dept) {
      students = students.filter((s) => getDept(s.class) === dept);
    }

    const totalStudents = students.length;
    const placed = students.filter((s) => s.placed === "YES").length;
    const higherStudies = students.filter((s) => s.category === "HS").length;
    const placementCount = students.filter((s) => s.category === "PLACEMENT").length;
    const notEligible = students.filter((s) => s.placed === "NE").length;
    const notPlaced = students.filter((s) => s.placed === "NO").length;

    const rfPlacement = students.filter(
      (s) => s.placed && !["YES", "NO", "NE", "NA"].includes(s.placed.trim())
    ).length;

    const totalOffers = students.reduce((acc, s) => {
      return (
        acc +
        [s.offer1, s.offer2, s.offer3, s.offer4, s.offer5, s.offer6].filter(
          (o) => o && o.trim() !== ""
        ).length
      );
    }, 0);

    const offerTypeCounts = { Dream: 0, "Super Dream": 0, Marquee: 0, Normal: 0 };
    students.forEach((s) => {
      const ot = s.offerType?.trim();
      if (ot && ot in offerTypeCounts) {
        offerTypeCounts[ot as keyof typeof offerTypeCounts]++;
      }
    });

    const mentors = [
      ...new Set(cache.data.map((s) => s.mentor).filter(Boolean)),
    ].sort();
    const categories = [
      ...new Set(cache.data.map((s) => s.category).filter(Boolean)),
    ].sort();
    const departments = [
      ...new Set(cache.data.map((s) => getDept(s.class)).filter(Boolean)),
    ].sort();

    return NextResponse.json({
      summary: {
        totalStudents,
        placed,
        higherStudies,
        placementCount,
        notPlaced,
        notEligible,
        rfPlacement,
        totalOffers,
      },
      offerTypeCounts,
      mentors,
      categories,
      departments,
      students: students.map((s) => ({
        registerNo: s.registerNo,
        studentName: s.studentName,
        category: s.category,
        class: s.class,
        placed: s.placed,
        offerType: s.offerType,
        offer1: s.offer1,
        offer2: s.offer2,
        offer3: s.offer3,
        offer4: s.offer4,
        offer5: s.offer5,
        offer6: s.offer6,
        mentor: s.mentor,
        tenth: s.tenth,
        twelfth: s.twelfth,
        cgpa: s.cgpa,
        backlogs: s.backlogs,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
