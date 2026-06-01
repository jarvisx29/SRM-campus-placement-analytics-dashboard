import { NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const CACHE_TTL = 5 * 60 * 1000;

type RawRow = string[];

let cache: { rows: RawRow[]; ts: number } | null = null;

interface MentorStat {
  mentor: string;
  mentorId: string;
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

async function fetchAll(): Promise<RawRow[]> {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "GDS!A:AD",
  });
  const rows = res.data.values;
  if (!rows || rows.length < 2) return [];
  const [, ...data] = rows;
  return data.filter((row) => row[1] || row[17] || row[18]);
}

function buildMentorStats(rows: RawRow[]): { mentorStats: MentorStat[]; mentors: string[] } {
  const map = new Map<string, MentorStat>();

  for (const row of rows) {
    const mentor = row[15]?.trim() || "";
    const mentorId = row[14]?.trim() || "";
    if (!mentor) continue;

    if (!map.has(mentor)) {
      map.set(mentor, { mentor, mentorId, allocated: 0, placed: 0, higherStudies: 0, totalOffers: 0, Normal: 0, Dream: 0, "Super Dream": 0, Marquee: 0 });
    }
    const s = map.get(mentor)!;
    s.allocated++;
    if (row[19] === "YES") s.placed++;
    if ((row[1] || "").trim().toUpperCase() === "HS") s.higherStudies++;

    const offerType = row[21]?.trim();
    const offers = [row[22], row[23], row[24], row[25], row[26], row[27]].filter(Boolean).length;
    s.totalOffers += offers;

    if (offerType === "Normal") s.Normal++;
    else if (offerType === "Dream") s.Dream++;
    else if (offerType === "Super Dream") s["Super Dream"]++;
    else if (offerType === "Marquee") s.Marquee++;
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
      const rows = await fetchAll();
      cache = { rows, ts: Date.now() };
    }

    const allRows = cache.rows;

    const departments = [
      ...new Set(allRows.map((r) => getDept(r[16] || "")).filter(Boolean)),
    ].sort();

    const filteredRows = deptFilter
      ? allRows.filter((r) => getDept(r[16] || "") === deptFilter)
      : allRows;

    const { mentorStats, mentors } = buildMentorStats(filteredRows);

    if (mentorFilter) {
      const found = mentorStats.find((m) => m.mentor === mentorFilter);
      return NextResponse.json({ mentors, departments, stat: found || null });
    }

    const agg: MentorStat = {
      mentor: "All",
      mentorId: "",
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
