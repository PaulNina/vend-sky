import * as XLSX from "xlsx";

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = "Datos") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Si el nombre termina en .csv, exportar como CSV (más ligero)
  if (filename.toLowerCase().endsWith(".csv")) {
    XLSX.writeFile(wb, filename, { bookType: "csv" });
  } else {
    XLSX.writeFile(wb, `${filename}.xlsx`, { compression: true });
  }
}
