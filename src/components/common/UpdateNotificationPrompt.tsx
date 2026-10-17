import React, { useState, useEffect } from "react";
import { checkServerVersion, clearAppCacheAndReload, VersionInfo } from "@/lib/versionManager";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const UpdateNotificationPrompt: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<VersionInfo | null>(null);
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const performCheck = async () => {
    if (dismissed) return;
    const res = await checkServerVersion();
    if (res.hasUpdate && res.serverVersion) {
      setNewVersion(res.serverVersion);
      setUpdateAvailable(true);
    }
  };

  useEffect(() => {
    // 1. Verificación inicial pasados 10 segundos
    const initialTimer = setTimeout(performCheck, 10000);

    // 2. Verificación periódica cada 3 minutos
    const interval = setInterval(performCheck, 3 * 60 * 1000);

    // 3. Verificación al enfocar o volver a la pestaña
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        performCheck();
      }
    };
    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [dismissed]);

  const handleUpdate = async () => {
    setUpdating(true);
    await clearAppCacheAndReload(true);
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Notificación de actualización del sistema"
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="fixed bottom-5 right-5 z-50 max-w-sm w-full p-4 rounded-2xl bg-slate-950/95 border border-cyan-500/40 shadow-[0_10px_40px_rgba(6,182,212,0.3)] backdrop-blur-xl text-white"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-wide">
                ¡Nueva versión disponible!
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Versión {newVersion?.version || "actualizada"} ({newVersion?.buildTime || "reciente"}).
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          Se han publicado mejoras en el sistema. Presione el botón para vaciar la caché y cargar los cambios de inmediato.
        </p>

        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="text-xs text-slate-400 hover:text-white h-8 px-2.5 rounded-xl"
          >
            Más tarde
          </Button>
          <Button
            size="sm"
            disabled={updating}
            onClick={handleUpdate}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs h-8 px-3.5 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${updating ? "animate-spin" : ""}`} />
            {updating ? "Actualizando..." : "Actualizar ahora"}
          </Button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
