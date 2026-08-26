import { NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const COMPANIES_RANGE = "Companies!A:H";
const CACHE_TTL = 5 * 60 * 1000;

// GDS company names that don't exactly match their entry in the Companies tab
// (confirmed 2026-08-12: both are typed slightly differently but same category)
const COMPANY_ALIASES: Record<string, string> = {
  "INFOSYS HACK": "INFOSYS HACKWITHINFY",
  "THINK EDGES": "THINK EDGES (BDA)",
  "UBS": "UBS BUSINESS SOLUTIONS",
};

type RawRow = string[];

let cache: { rows: RawRow[]; companyCategoryMap: Map<string, string>; ts: number } | null = null;

function normalizeOfferCategory(raw: string): string | null {
  const c = (raw || "").trim().toUpperCase();
  if (c === "SD" || c === "SUPER DREAM") return "Super Dream";
  if (c === "MARQUEE") return "Marquee";
  if (c === "DREAM") return "Dream";
  if (c === "NORMAL") return "Normal";
  return null;
}

async function fetchCompanyCategoryMap(
  sheets: ReturnType<typeof google.sheets>
): Promise<Map<string, string>> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: COMPANIES_RANGE,
  });
  const rows = response.data.values;
  const map = new Map<string, string>();
  if (!rows || rows.length < 2) return map;

  const [, ...dataRows] = rows;
  dataRows.forEach((row) => {
    const name = (row[0] || "").trim().toUpperCase();
    const category = normalizeOfferCategory(row[7] || "");
    if (name && category && !map.has(name)) map.set(name, category);
  });
  return map;
}

interface MentorStat {
  mentor: string;
  allocated: number;
  placed: number;
  higherStudies: number;
  totalOffers: number;
  Normal: number;
  Dream: number;
  "Super Dream": number;
  Marquee: number;
}

function getDept(cls: string): string {
  const parts = cls.trim().split(/\s+/);
  return parts.length <= 1 ? cls.trim() : parts.slice(0, -1).join(" ");
}

async function fetchAll(): Promise<{ rows: RawRow[]; companyCategoryMap: Map<string, string> }> {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const [res, companyCategoryMap] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "GDS!A:AC",
    }),
    fetchCompanyCategoryMap(sheets),
  ]);
  const rows = res.data.values;
  if (!rows || rows.length < 2) return { rows: [], companyCategoryMap };
  const [, ...data] = rows;
  return { rows: data.filter((row) => row[1] || row[16] || row[17]), companyCategoryMap };
}

function buildMentorStats(
  rows: RawRow[],
  companyCategoryMap: Map<string, string>
): { mentorStats: MentorStat[]; mentors: string[] } {
  const map = new Map<string, MentorStat>();

  for (const row of rows) {
    const mentor = row[14]?.trim() || "";
    if (!mentor) continue;

    if (!map.has(mentor)) {
      map.set(mentor, { mentor, allocated: 0, placed: 0, higherStudies: 0, totalOffers: 0, Normal: 0, Dream: 0, "Super Dream": 0, Marquee: 0 });
    }
    const s = map.get(mentor)!;
    s.allocated++;
    if (row[18] === "YES") s.placed++;
    if ((row[1] || "").trim().toUpperCase() === "HS") s.higherStudies++;

    const offerCompanies = [row[21], row[22], row[23], row[24], row[25], row[26]].filter(Boolean);
    s.totalOffers += offerCompanies.length;

    offerCompanies.forEach((company) => {
      const key = company.trim().toUpperCase();
      const category =
        companyCategoryMap.get(key) ??
        (COMPANY_ALIASES[key] ? companyCategoryMap.get(COMPANY_ALIASES[key]) : undefined);
      if (category === "Normal") s.Normal++;
      else if (category === "Dream") s.Dream++;
      else if (category === "Super Dream") s["Super Dream"]++;
      else if (category === "Marquee") s.Marquee++;
    });
  }

  const mentorStats = Array.from(map.values());
  const mentors = mentorStats.map((m) => m.mentor).sort();
  return { mentorStats, mentors };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mentorFilter = searchParams.get("mentor") || "";
  const deptFilter = searchParams.get("dept") || "";

  try {
    if (!cache || Date.now() - cache.ts > CACHE_TTL) {
      const { rows, companyCategoryMap } = await fetchAll();
      cache = { rows, companyCategoryMap, ts: Date.now() };
    }

    const allRows = cache.rows;

    const departments = [
      ...new Set(allRows.map((r) => getDept(r[15] || "")).filter(Boolean)),
    ].sort();

    const filteredRows = deptFilter
      ? allRows.filter((r) => getDept(r[15] || "") === deptFilter)
      : allRows;

    const { mentorStats, mentors } = buildMentorStats(filteredRows, cache.companyCategoryMap);

    if (mentorFilter) {
      const found = mentorStats.find((m) => m.mentor === mentorFilter);
      return NextResponse.json({ mentors, departments, stat: found || null });
    }

    const agg: MentorStat = {
      mentor: "All",
      allocated: mentorStats.reduce((s, m) => s + m.allocated, 0),
      placed: mentorStats.reduce((s, m) => s + m.placed, 0),
      higherStudies: mentorStats.reduce((s, m) => s + m.higherStudies, 0),
      totalOffers: mentorStats.reduce((s, m) => s + m.totalOffers, 0),
      Normal: mentorStats.reduce((s, m) => s + m.Normal, 0),
      Dream: mentorStats.reduce((s, m) => s + m.Dream, 0),
      "Super Dream": mentorStats.reduce((s, m) => s + m["Super Dream"], 0),
      Marquee: mentorStats.reduce((s, m) => s + m.Marquee, 0),
    };

    return NextResponse.json({ mentors, departments, stat: agg });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
