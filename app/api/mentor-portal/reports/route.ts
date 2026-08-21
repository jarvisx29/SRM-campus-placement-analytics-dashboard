import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const REPORT_PASSWORD = process.env.REPORT_PASSWORD || "";
const REPORTS_RANGE = "Mentor Reports!A:H";

export interface MentorReportRow {
  timestamp: string;
  mentorName: string;
  meetingDate: string;
  meetingLink: string;
  minutes: string;
  presentRegNos: string;
  absentRegNos: string;
  reportLink: string;
}

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  if (!REPORT_PASSWORD || authorization !== `Bearer ${REPORT_PASSWORD}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: REPORTS_RANGE,
    });
    const rows = res.data.values;
    if (!rows || rows.length < 2) return NextResponse.json({ reports: [] });

    const [, ...dataRows] = rows;
    const reports: MentorReportRow[] = dataRows
      .filter((row) => row[1])
      .map((row) => ({
        timestamp: row[0] || "",
        mentorName: row[1] || "",
        meetingDate: row[2] || "",
        meetingLink: row[3] || "",
        minutes: row[4] || "",
        presentRegNos: row[5] || "",
        absentRegNos: row[6] || "",
        reportLink: row[7] || "",
      }));

    return NextResponse.json({ reports });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
