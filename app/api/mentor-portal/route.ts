import { NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const AUTH_RANGE = "Mentor Auth!A:B";
const REPORTS_RANGE = "Mentor Reports!A:H";
const CACHE_TTL = 5 * 60 * 1000;

let authCache: { map: Map<string, string>; names: string[]; ts: number } | null = null;

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function fetchMentorAuth(
  sheets: ReturnType<typeof google.sheets>
): Promise<{ map: Map<string, string>; names: string[] }> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: AUTH_RANGE,
  });
  const rows = res.data.values;
  const map = new Map<string, string>();
  const names: string[] = [];
  if (!rows || rows.length < 2) return { map, names };

  const [, ...dataRows] = rows;
  dataRows.forEach((row) => {
    const name = (row[0] || "").trim();
    const facultyId = (row[1] || "").trim();
    if (!name) return;
    names.push(name);
    if (facultyId) map.set(name, facultyId);
  });
  return { map, names };
}

async function getAuthCache(sheets: ReturnType<typeof google.sheets>) {
  if (!authCache || Date.now() - authCache.ts > CACHE_TTL) {
    const { map, names } = await fetchMentorAuth(sheets);
    authCache = { map, names, ts: Date.now() };
  }
  return authCache;
}

export async function GET() {
  try {
    const sheets = getSheetsClient();
    const cache = await getAuthCache(sheets);
    return NextResponse.json({ mentors: cache.names });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch mentor list" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const mentorName = (body.mentorName || "").trim();
    const facultyId = (body.facultyId || "").trim();
    const meetingDate = (body.meetingDate || "").trim();
    const meetingLink = (body.meetingLink || "").trim();
    const minutes = (body.minutes || "").trim();
    const presentRegNos = (body.presentRegNos || "").trim();
    const absentRegNos = (body.absentRegNos || "").trim();
    const reportLink = (body.reportLink || "").trim();

    if (!mentorName || !facultyId || !meetingDate) {
      return NextResponse.json(
        { error: "Mentor name, Faculty ID, and Meeting Date are required" },
        { status: 400 }
      );
    }

    const sheets = getSheetsClient();
    const cache = await getAuthCache(sheets);
    const expectedId = cache.map.get(mentorName);

    if (!expectedId || expectedId !== facultyId) {
      return NextResponse.json(
        { error: "Incorrect Faculty ID for the selected mentor" },
        { status: 401 }
      );
    }

    // Additive only — appends one row after the last used row in Mentor Reports.
    // Never touches any other tab.
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: REPORTS_RANGE,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            new Date().toISOString(),
            mentorName,
            meetingDate,
            meetingLink,
            minutes,
            presentRegNos,
            absentRegNos,
            reportLink,
          ],
        ],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
