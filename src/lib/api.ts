/**
 * Centralized API service for the Spring Boot backend.
 * Reads VITE_API_URL from .env (default: http://localhost:8080)
 * Attaches Bearer JWT token automatically from localStorage.
 */

const BASE_URL =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:8080";

export const TOKEN_KEY = "bono_jwt";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  // 401: Unauthorized / Session Expired -> Redirect to login
  if (res.status === 401) {
    removeToken();
    window.location.href = "/login";
    throw new Error(
      "Su sesión ha expirado. Por favor, inicie sesión nuevamente.",
    );
  }

  // Handle other non-ok responses (including 403 Forbidden)
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = await res.json();
      message = data?.error || data?.message || message;
    } catch {
      // If 403 and body is empty, use a default message
      if (res.status === 403) {
        message = "No tiene permisos para realizar esta acción.";
      }
    }
    throw new Error(message);
  }

  // Handle 204 No Content or empty bodies
  if (res.status === 204) return undefined as unknown as T;

  const text = await res.text();
  if (!text) return undefined as unknown as T;

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON response:", text);
    throw e;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: authHeaders({ "Content-Type": "application/json" }),
    });
    return handleResponse<T>(res);
  } catch (error) {
    if (error instanceof Error && error.message.includes("fetch")) {
      throw new Error("Error de conexión con el servidor. Por favor, verifique su conexión a internet u observe si el servidor está activo.");
    }
    throw error;
  }
}

export async function apiGetBlob(path: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Error ${res.status}`);
  }
  return res.blob();
}

export async function apiGetPublic<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  } catch (error) {
    if (error instanceof Error && error.message.includes("fetch")) {
      throw new Error("Error de conexión con el servidor. Verifique su conexión.");
    }
    throw error;
  }
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(res);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handleResponse<void>(res);
}

/**
 * Multipart form upload (for sales with photos)
 */
export async function apiPostForm<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: authHeaders(), // NO Content-Type header — browser sets it with boundary
      body: formData,
    });
    return handleResponse<T>(res);
  } catch (error) {
    if (error instanceof Error && (error.message.includes("fetch") || error.name === "TypeError")) {
      throw new Error("Error de red o el servidor tardó demasiado en responder mientras se subían las fotos. Por favor, intente con fotos más pequeñas o una conexión más estable.");
    }
    throw error;
  }
}

/**
 * Get full URL for an uploaded file (/uploads/filename)
 */
export function uploadUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  // Handle absolute filesystem paths from imports (e.g. /var/www/.../uploads/vendedores/...)
  // We extract the part starting from 'uploads/'
  let cleanPath = path;
  if (path.includes("/uploads/")) {
    const parts = path.split("/uploads/");
    cleanPath = "uploads/" + parts[parts.length - 1];
  } else if (path.startsWith("/")) {
    cleanPath = path.slice(1);
  }

  return `${BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL}/${cleanPath}`;
}
