import * as XLSX from "xlsx";
import { ExcelRow } from "./types";

export interface SheetSummary {
  name: string;
  rows: ExcelRow[];
}

export function parseExcel(buffer: ArrayBuffer): SheetSummary[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const results: SheetSummary[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
    }) as unknown[][];

    if (raw.length < 2) continue;

    const rows: ExcelRow[] = [];
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i] as unknown[];
      const tcId = String(row[0] ?? "").trim();
      const testCase = String(row[1] ?? "").trim();
      const steps = String(row[2] ?? "").trim();
      const expected = String(row[3] ?? "").trim();

      // Skip empty rows and category header rows (tcId looks like a category name, no testCase)
      if (!testCase && !steps && !expected) continue;
      if (tcId && !testCase && !steps && !expected) continue;

      rows.push({
        tcId: tcId || `ROW-${i}`,
        testCase,
        stepsToExecute: steps,
        expectedResult: expected,
        sheet: sheetName,
        rowIndex: i,
      });
    }

    if (rows.length > 0) {
      results.push({ name: sheetName, rows });
    }
  }

  return results;
}
