import { NextResponse } from "next/server";
import { google } from "googleapis";
import { HavlocRow } from "@/types";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const HAVLOC_RANGE = "HAVELOC DATA!A:T";
const GDS_RANGE = "GDS!A:AC";
const CACHE_TTL = 5 * 60 * 1000;

type RawRow = string[];

let havlocCache: { rows: HavlocRow[]; ts: number } | null = null;
let gdsCache: { rows: RawRow[]; ts: number } | null = null;

function getDept(cls: string): string {
  const parts = cls.trim().split(/\s+/);
  return parts.length <= 1 ? cls.trim() : parts.slice(0, -1).join(" ");
}

function auth() {
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

async function fetchHavlocRows(): Promise<HavlocRow[]> {
  const sheets = google.sheets({ version: "v4", auth: auth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: HAVLOC_RANGE,
  });
  const rows = res.data.values;
  if (!rows || rows.length < 2) return [];
  const [, ...dataRows] = rows;

  return dataRows
    .filter((row) => row[1] || row[2])
    .map((row) => ({
      sno: row[0] || "",
      name: row[1] || "",
      rollNumber: (row[2] || "").trim(),
      absentCount: row[3] || "",
      appliedCount: row[4] || "",
      eligibleJobCount: row[5] || "",
      eligibleNotAppliedCount: row[6] || "",
      branch: row[7] || "",
      screening: row[8] || "",
      others: row[9] || "",
      technicalInterview: row[10] || "",
      groupDiscussion: row[11] || "",
      technicalHrInterview: row[12] || "",
      test: row[13] || "",
      applicationScreening: row[14] || "",
      prePlacementTalk: row[15] || "",
      managerInterview1: row[16] || "",
      hrInterview1: row[17] || "",
      managerInterview2: row[18] || "",
      hrInterview2: row[19] || "",
    }));
}

async function fetchGdsRows(): Promise<RawRow[]> {
  const sheets = google.sheets({ version: "v4", auth: auth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: GDS_RANGE,
  });
  const rows = res.data.values;
  if (!rows || rows.length < 2) return [];
  const [, ...dataRows] = rows;
  return dataRows.filter((row) => row[1] || row[16] || row[17]);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mentorFilter = searchParams.get("mentor") || "";
  const deptFilter = searchParams.get("dept") || "";

  try {
    if (!havlocCache || Date.now() - havlocCache.ts > CACHE_TTL) {
      havlocCache = { rows: await fetchHavlocRows(), ts: Date.now() };
    }
    if (!gdsCache || Date.now() - gdsCache.ts > CACHE_TTL) {
      gdsCache = { rows: await fetchGdsRows(), ts: Date.now() };
    }

    if (!mentorFilter) {
      return NextResponse.json({ rows: [] });
    }

    let gdsRows = gdsCache.rows.filter(
      (r) => (r[14] || "").trim().toLowerCase() === mentorFilter.toLowerCase()
    );
    if (deptFilter) {
      gdsRows = gdsRows.filter((r) => getDept(r[15] || "") === deptFilter);
    }

    const registerNumbers = new Set(
      gdsRows.map((r) => (r[16] || "").trim().toUpperCase()).filter(Boolean)
    );

    const rows = havlocCache.rows.filter((r) =>
      registerNumbers.has(r.rollNumber.toUpperCase())
    );

    return NextResponse.json({ rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch Havloc data" }, { status: 500 });
  }
}
