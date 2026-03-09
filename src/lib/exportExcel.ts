import * as XLSX from "xlsx";

// ── Helpers ──────────────────────────────────────────────────────────

/** Auto-fit column widths based on content */
function autoFitColumns(ws: XLSX.WorkSheet, data: Record<string, any>[]) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  ws["!cols"] = keys.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => {
        const v = row[key];
        if (v == null) return 0;
        return String(v).length;
      })
    );
    return { wch: Math.min(Math.max(maxLen + 2, 8), 50) };
  });
}

/** Freeze the first row (header) */
function freezeHeader(ws: XLSX.WorkSheet) {
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  // SheetJS uses !freeze in some builds; for broader compat also set the pane
  if (!ws["!views"]) ws["!views"] = [{}];
  (ws["!views"] as any[])[0] = { state: "frozen", ySplit: 1 };
}

/** Create a sheet from data with auto-fit and frozen header */
function createSheet(data: Record<string, any>[]): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(data.length > 0 ? data : [{ "(vacío)": "" }]);
  if (data.length > 0) {
    autoFitColumns(ws, data);
    freezeHeader(ws);
  }
  return ws;
}

// ── Public API ───────────────────────────────────────────────────────

/** Simple single-sheet export (drop-in replacement) */
export function exportToExcel(
  data: Record<string, any>[],
  filename: string,
  sheetName = "Datos"
) {
  const ws = createSheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Multi-sheet export. Each entry = { name, data } */
export function exportMultiSheet(
  sheets: { name: string; data: Record<string, any>[] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = createSheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31));
  }
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/** Build a "cover" / summary row set used by gerencial reports */
export function buildSummaryRows(
  pairs: { label: string; value: string | number }[]
): Record<string, any>[] {
  return pairs.map((p) => ({ Concepto: p.label, Valor: p.value }));
}
