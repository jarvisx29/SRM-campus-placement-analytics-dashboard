import { NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const CACHE_TTL = 5 * 60 * 1000;

let cache: { data: MentorStat[]; mentors: string[]; ts: number } | null = null;

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

async function fetchAll() {
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
  if (!rows || rows.length < 2) return { mentorStats: [], mentors: [] };

  const [, ...data] = rows;

  const map = new Map<string, MentorStat>();

  for (const row of data) {
    const mentor = row[15]?.trim() || "";
    const mentorId = row[14]?.trim() || "";
    if (!mentor) continue;

    if (!map.has(mentor)) {
      map.set(mentor, { mentor, mentorId, allocated: 0, placed: 0, higherStudies: 0, totalOffers: 0, Normal: 0, Dream: 0, "Super Dream": 0, Marquee: 0 });
    }
    const s = map.get(mentor)!;
    s.allocated++;
    if (row[19] === "YES") s.placed++;
    if (row[1] === "HS") s.higherStudies++;

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

  try {
    if (!cache || Date.now() - cache.ts > CACHE_TTL) {
      const { mentorStats, mentors } = await fetchAll();
      cache = { data: mentorStats, mentors, ts: Date.now() };
    }

    const all = cache.data;
    const mentors = cache.mentors;

    if (mentorFilter) {
      const found = all.find((m) => m.mentor === mentorFilter);
      return NextResponse.json({ mentors, stat: found || null });
    }

    const agg: MentorStat = {
      mentor: "All",
      mentorId: "",
      allocated: all.reduce((s, m) => s + m.allocated, 0),
      placed: all.reduce((s, m) => s + m.placed, 0),
      higherStudies: all.reduce((s, m) => s + m.higherStudies, 0),
      totalOffers: all.reduce((s, m) => s + m.totalOffers, 0),
      Normal: all.reduce((s, m) => s + m.Normal, 0),
      Dream: all.reduce((s, m) => s + m.Dream, 0),
      "Super Dream": all.reduce((s, m) => s + m["Super Dream"], 0),
      Marquee: all.reduce((s, m) => s + m.Marquee, 0),
    };

    return NextResponse.json({ mentors, stat: agg });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
