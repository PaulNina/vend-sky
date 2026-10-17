/**
 * Gestor de Versión y Purgado de Caché del Frontend SKYWORTH
 */

export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.2.0";
export const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "Desconocido";
export const BUILD_ID = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";

export interface VersionInfo {
  version: string;
  buildTime: string;
  buildId: string;
}

/**
 * Consulta la versión actualmente desplegada en el servidor sin pasar por la caché.
 */
export async function checkServerVersion(): Promise<{
  hasUpdate: boolean;
  serverVersion?: VersionInfo;
  error?: string;
}> {
  try {
    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });

    if (!res.ok) {
      return { hasUpdate: false };
    }

    const data: VersionInfo = await res.json();
    const hasUpdate = Boolean(data.buildId && data.buildId !== BUILD_ID);

    return {
      hasUpdate,
      serverVersion: data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { hasUpdate: false, error: msg };
  }
}

/**
 * Purga agresivamente toda la caché del navegador:
 * 1. Desregistra todos los Service Workers instalados
 * 2. Borra todos los caches de CacheStorage (Workbox, runtime, assets)
 * 3. Limpia sessionStorage y temporales
 * 4. Recarga la página forzando bypass de caché HTTP con timestamp
 */
export async function clearAppCacheAndReload(preserveAuth: boolean = true): Promise<void> {
  console.info("[VersionManager] Iniciando purgado de caché y recarga forzada...");

  try {
    // 1. Desregistrar Service Workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        try {
          await registration.unregister();
          console.debug("[VersionManager] Service Worker desregistrado:", registration.scope);
        } catch (e) {
          console.warn("[VersionManager] Error al desregistrar SW:", e);
        }
      }
    }

    // 2. Eliminar todas las instancias de CacheStorage
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        try {
          await caches.delete(name);
          console.debug("[VersionManager] Caché eliminada:", name);
        } catch (e) {
          console.warn("[VersionManager] Error al borrar caché:", name, e);
        }
      }
    }

    // 3. Limpiar sessionStorage
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn("[VersionManager] Error al limpiar sessionStorage:", e);
    }

    // 4. Si no se preserva sesión, limpiar localStorage
    if (!preserveAuth) {
      try {
        localStorage.clear();
      } catch (e) {
        console.warn("[VersionManager] Error al limpiar localStorage:", e);
      }
    }
  } catch (err) {
    console.error("[VersionManager] Error durante la limpieza:", err);
  } finally {
    // 5. Recarga forzada con parámetro cache-buster
    const url = new URL(window.location.href);
    url.searchParams.set("_v", Date.now().toString());
    window.location.replace(url.toString());
  }
}
