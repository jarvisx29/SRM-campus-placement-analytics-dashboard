import { NextRequest, NextResponse } from "next/server";

const REPORT_PASSWORD = process.env.REPORT_PASSWORD || "";

export async function GET(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  if (!REPORT_PASSWORD || authorization !== `Bearer ${REPORT_PASSWORD}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
