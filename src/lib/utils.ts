import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Standardizes formatting to always use Bolivia (UTC-4) timezone.
 */
export function formatDateBolivia(dateString?: string | null) {
  if (!dateString) return "—";

  // Si viene como "YYYY-MM-DD" directamente desde el backend, lo devolvemos en formato local "DD/MM/YYYY"
  // Esto evita problemas de que JS interprete la fecha como UTC Midnight y la atrase un dia al convertirla a UTC-4
  const trimmed = dateString.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${d}/${m}/${y}`;
  }

  // Fallback si viene con tiempo u otro formato
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("es-BO", {
    timeZone: "America/La_Paz",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Returns a relative time string if under 24 hours, else returns the standardized date.
 */
export function formatTimeAgoBolivia(dateString?: string | null) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;

  const h = Math.floor(diffMin / 60);
  if (h < 24) return `hace ${h}h`;

  return formatDateBolivia(dateString);
}

/**
 * Standardizes formatting to always use Bolivia (UTC-4) timezone and includes the time.
 */
export function formatDateTimeBolivia(dateString?: string | null) {
  if (!dateString) return "—";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleString("es-BO", {
    timeZone: "America/La_Paz",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
