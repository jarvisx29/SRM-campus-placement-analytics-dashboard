import { NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const SHEET_RANGE = "GDS!A:AC";
const COMPANIES_RANGE = "Companies!A:H";
const STATS_TABLE_RANGE = "STATISTICS!A146:J155";
// Wide scan range covering every per-department offer-type mini-table on STATISTICS
// (see fetchOfferTypeStatsMap — 2026-08-26, E27). Not a hardcoded row list on purpose:
// faculty have shifted rows/columns on this sheet before (see E13), so this locates each
// department's block at read time instead of trusting fixed coordinates.
const OFFER_TYPE_SCAN_RANGE = "STATISTICS!A1:P140";

let cache: {
  data: Student[];
  deptStatsMap: Map<string, DeptStats>;
  offerStatsMap: Map<string, OfferTypeStats>;
  ts: number;
} | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// GDS company names that don't exactly match their entry in the Companies tab
// (confirmed 2026-08-12: both are typed slightly differently but same category)
// Still used as a fallback for mentor/category-filtered views, which have no
// equivalent per-mentor breakdown on STATISTICS — see E27.
const COMPANY_ALIASES: Record<string, string> = {
  "INFOSYS HACK": "INFOSYS HACKWITHINFY",
  "THINK EDGES": "THINK EDGES (BDA)",
  "UBS": "UBS BUSINESS SOLUTIONS",
};

interface DeptStats {
  totalStudents: number;
  placementCount: number;
  higherStudies: number;
  placed: number;
  notPlaced: number;
  notEligible: number;
  totalOffers: number;
}

interface OfferTypeStats {
  normal: number;
  dream: number;
  superDream: number;
  marquee: number;
}

// STATISTICS has each of these labels duplicated per department block: one broken
// "global" copy in column B (same COUNTIF-over-the-whole-Companies-tab value repeated
// identically on every single department block — verified 2026-08-26, E27) and one real
// per-department value, always immediately preceded by its salary-range label. Only the
// LPA-range-preceded cell is the real per-department figure.
const LPA_RANGE_LABELS = new Set(["< 5 LPA", "5.0 - 9.9", "10 - 19.9", ">= 20"]);
const OFFER_TYPE_ROW_LABELS: Record<string, keyof OfferTypeStats> = {
  Normal: "normal",
  Dream: "dream",
  SD: "superDream",
  Marquee: "marquee",
};

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
  offerCategories: string[];
}

function normalizeOfferCategory(raw: string): string | null {
  const c = (raw || "").trim().toUpperCase();
  if (c === "SD" || c === "SUPER DREAM") return "Super Dream";
  if (c === "MARQUEE") return "Marquee";
  if (c === "DREAM") return "Dream";
  if (c === "NORMAL") return "Normal";
  return null; // e.g. "Day Sharing", blank, or unrecognized — not one of the 4 tracked categories
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
    if (!name || !category) return;
    const existing = map.get(name);
    if (existing && existing !== category) {
      console.warn(
        `Company "${name}" has conflicting categories in the Companies tab: "${existing}" vs "${category}" — keeping "${existing}"`
      );
      return;
    }
    map.set(name, category);
  });
  return map;
}

// Reads the pre-computed per-department summary table on the STATISTICS tab
// (header row + one row per dept + a TOTAL row, all formula-driven straight off GDS —
// see CLAUDE.md E24 for why this table specifically is trustworthy while the
// Dream/Super Dream/Marquee/Normal breakdown elsewhere on that sheet is not).
async function fetchDeptStatsMap(
  sheets: ReturnType<typeof google.sheets>
): Promise<Map<string, DeptStats>> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: STATS_TABLE_RANGE,
  });
  const rows = response.data.values;
  const map = new Map<string, DeptStats>();
  if (!rows || rows.length < 2) return map;

  const [, ...dataRows] = rows;
  dataRows.forEach((row) => {
    const name = (row[0] || "").trim().toUpperCase();
    if (!name) return;
    map.set(name, {
      totalStudents: Number(row[1]) || 0,
      placementCount: Number(row[2]) || 0,
      higherStudies: Number(row[3]) || 0,
      placed: Number(row[4]) || 0,
      notPlaced: Number(row[5]) || 0,
      notEligible: Number(row[6]) || 0,
      totalOffers: Number(row[8]) || 0,
    });
  });
  return map;
}

// Finds the real (LPA-range-preceded) occurrence of `label` in `row`, closest to `nearCol`
// — closest-to-nearCol disambiguates left vs. right department on rows that hold two
// departments side by side (e.g. BDA + CC on the same row).
function findNearestLabelValue(row: string[], label: string, nearCol: number): number | undefined {
  let best: { col: number; value: number } | undefined;
  row.forEach((cell, j) => {
    if ((cell || "").toString().trim() !== label) return;
    const left = (row[j - 1] || "").toString().trim();
    if (!LPA_RANGE_LABELS.has(left)) return; // the broken global-duplicate column, skip it
    const value = Number((row[j + 1] || "").toString().replace(/,/g, "")) || 0;
    if (!best || Math.abs(j - nearCol) < Math.abs(best.col - nearCol)) {
      best = { col: j, value };
    }
  });
  return best?.value;
}

// Reads the real per-department Normal/Dream/SD/Marquee offer-type counts straight off
// STATISTICS (see E27, 2026-08-26) instead of computing them from GDS + the Companies tab.
// The GDS+Companies join is fragile to company-name typos across the two tabs — e.g. "UBS"
// vs "UBS BUSINESS SOLUTIONS" undercounted CSE Marquee by 1, and AIML's Super Dream was
// undercounted by 12 for the same reason. Locates each department's block by matching its
// "Placement Enrolled" figure against the already-verified PLACEMENT count from
// STATISTICS!A146:J155 (fetchDeptStatsMap), rather than trusting fixed row/column numbers.
async function fetchOfferTypeStatsMap(
  sheets: ReturnType<typeof google.sheets>,
  deptStatsMap: Map<string, DeptStats>
): Promise<Map<string, OfferTypeStats>> {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: OFFER_TYPE_SCAN_RANGE,
  });
  const rows = response.data.values || [];
  const map = new Map<string, OfferTypeStats>();

  const placementToDept = new Map<number, string>();
  deptStatsMap.forEach((stats, dept) => {
    if (dept !== "TOTAL") placementToDept.set(stats.placementCount, dept);
  });

  const blocks: { dept: string; col: number; startRow: number }[] = [];
  rows.forEach((row, i) => {
    row.forEach((cell, j) => {
      if ((cell || "").toString().trim() !== "Placement Enrolled") return;
      const value = Number((row[j + 1] || "").toString().replace(/,/g, ""));
      const dept = placementToDept.get(value);
      if (dept) blocks.push({ dept, col: j, startRow: i });
    });
  });

  blocks.forEach(({ dept, col, startRow }) => {
    const stats: OfferTypeStats = { normal: 0, dream: 0, superDream: 0, marquee: 0 };
    const resolved = new Set<string>();
    for (let r = startRow; r < Math.min(startRow + 20, rows.length) && resolved.size < 4; r++) {
      const row = rows[r] || [];
      for (const [label, key] of Object.entries(OFFER_TYPE_ROW_LABELS)) {
        if (resolved.has(key)) continue;
        const value = findNearestLabelValue(row, label, col);
        if (value !== undefined) {
          stats[key] = value;
          resolved.add(key);
        }
      }
    }
    map.set(dept, stats);
  });

  return map;
}

function fixPercent(val: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  const num = parseFloat(trimmed); // parseFloat ignores trailing "%"
  if (!isNaN(num) && num > 100) return (num / 100).toFixed(2);
  return trimmed.replace(/%/g, "").trim() || trimmed;
}

async function fetchSheetData(): Promise<{
  students: Student[];
  deptStatsMap: Map<string, DeptStats>;
  offerStatsMap: Map<string, OfferTypeStats>;
}> {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const [response, companyCategoryMap, deptStatsMap] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    }),
    fetchCompanyCategoryMap(sheets),
    fetchDeptStatsMap(sheets),
  ]);
  // Needs deptStatsMap (for the "Placement Enrolled" -> dept lookup) before it can run.
  const offerStatsMap = await fetchOfferTypeStatsMap(sheets, deptStatsMap);

  const rows = response.data.values;
  if (!rows || rows.length < 2) return { students: [], deptStatsMap, offerStatsMap };

  const [, ...dataRows] = rows;

  const unmatchedCompanies = new Set<string>();

  const students = dataRows
    .filter((row) => row[1] || row[16] || row[17])
    .map((row) => {
      const offerCols = [row[21], row[22], row[23], row[24], row[25], row[26]];
      const offerCategories = offerCols
        .map((o) => (o || "").trim())
        .filter(Boolean)
        .map((company) => {
          const key = company.toUpperCase();
          const category =
            companyCategoryMap.get(key) ??
            (COMPANY_ALIASES[key] ? companyCategoryMap.get(COMPANY_ALIASES[key]) : undefined);
          if (!category) unmatchedCompanies.add(company);
          return category;
        })
        .filter((c): c is string => !!c);

      return {
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
      offerCategories,
      };
    });

  if (unmatchedCompanies.size > 0) {
    console.warn(
      `Offer companies with no category match in the Companies tab (not counted in offerTypeCounts): ${[...unmatchedCompanies].join(", ")}`
    );
  }

  return { students, deptStatsMap, offerStatsMap };
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
      const { students: data, deptStatsMap, offerStatsMap } = await fetchSheetData();
      cache = { data, deptStatsMap, offerStatsMap, ts: Date.now() };
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

    // rfPlacement isn't tracked anywhere on the STATISTICS tab, so it's always computed from GDS.
    const rfPlacement = students.filter(
      (s) => s.placed && !["YES", "NO", "NE", "NA"].includes(s.placed.trim())
    ).length;

    // STATISTICS!A146:J155 is a clean, formula-driven-off-GDS per-department summary table
    // (see CLAUDE.md E24) — use it whenever the request is a plain dept-only view, since that's
    // exactly what it covers. Mentor/category filters have no equivalent breakdown on that sheet,
    // so those requests keep computing straight from the (already-filtered) GDS rows below.
    const deptStats = !mentor && !category
      ? cache.deptStatsMap.get(dept ? dept.toUpperCase() : "TOTAL")
      : undefined;

    const totalStudents = deptStats?.totalStudents ?? students.length;
    const placed = deptStats?.placed ?? students.filter((s) => s.placed === "YES").length;
    const higherStudies = deptStats?.higherStudies ?? students.filter((s) => s.category === "HS").length;
    const placementCount = deptStats?.placementCount ?? students.filter((s) => s.category === "PLACEMENT").length;
    const notEligible = deptStats?.notEligible ?? students.filter((s) => s.placed === "NE").length;
    const notPlaced = deptStats?.notPlaced ?? students.filter((s) => s.placed === "NO").length;

    const totalOffers = deptStats?.totalOffers ?? students.reduce((acc, s) => {
      return (
        acc +
        [s.offer1, s.offer2, s.offer3, s.offer4, s.offer5, s.offer6].filter(
          (o) => o && o.trim() !== ""
        ).length
      );
    }, 0);

    // STATISTICS's own per-department Normal/Dream/SD/Marquee mini-tables (see E27) are used
    // whenever this is a plain dept-only (or sitewide) view, same condition as deptStats above —
    // mentor/category filters have no equivalent breakdown there and keep the GDS+Companies join.
    // Sitewide (no dept) sums across every real department, same as how the sheet's own TOTAL
    // row sums its other columns.
    const offerStats = !mentor && !category
      ? dept
        ? cache.offerStatsMap.get(dept.toUpperCase())
        : Array.from(cache.offerStatsMap.values()).reduce(
            (acc, s) => ({
              normal: acc.normal + s.normal,
              dream: acc.dream + s.dream,
              superDream: acc.superDream + s.superDream,
              marquee: acc.marquee + s.marquee,
            }),
            { normal: 0, dream: 0, superDream: 0, marquee: 0 }
          )
      : undefined;

    const offerTypeCounts = offerStats
      ? {
          Dream: offerStats.dream,
          "Super Dream": offerStats.superDream,
          Marquee: offerStats.marquee,
          Normal: offerStats.normal,
        }
      : (() => {
          const counts = { Dream: 0, "Super Dream": 0, Marquee: 0, Normal: 0 };
          students.forEach((s) => {
            s.offerCategories.forEach((ot) => {
              if (ot in counts) counts[ot as keyof typeof counts]++;
            });
          });
          return counts;
        })();

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
        gender: s.gender,
        dob: s.dob,
        resumeLink: s.resumeLink,
        officialMail: s.officialMail,
        personalMail: s.personalMail,
        phone: s.phone,
        offerCategories: s.offerCategories,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
