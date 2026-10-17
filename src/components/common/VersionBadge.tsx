import React, { useState } from "react";
import { APP_VERSION, BUILD_TIME, clearAppCacheAndReload } from "@/lib/versionManager";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionBadgeProps {
  className?: string;
  compact?: boolean;
  showBuildTime?: boolean;
}

export const VersionBadge: React.FC<VersionBadgeProps> = ({
  className,
  compact = false,
  showBuildTime = true,
}) => {
  const [clearing, setClearing] = useState(false);

  const handleClearCache = async () => {
    setClearing(true);
    await clearAppCacheAndReload(true);
  };

  if (compact) {
    return (
      <div className={cn("inline-flex items-center gap-1.5", className)}>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
          title={`Versión desplegada: v${APP_VERSION} (${BUILD_TIME})`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          v{APP_VERSION}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={clearing}
          onClick={handleClearCache}
          className="h-6 w-6 p-0 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-md"
          title="Limpiar caché y recargar versión más reciente"
        >
          <RefreshCw className={cn("w-3 h-3", clearing && "animate-spin text-cyan-400")} />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-2.5 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col gap-2 text-xs",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
          <span className="font-bold text-white tracking-wider text-[11px]">
            v{APP_VERSION}
          </span>
          <span className="text-[10px] text-cyan-400/80 font-medium">Oficial</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          disabled={clearing}
          onClick={handleClearCache}
          className="h-7 px-2 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 border border-white/10 rounded-lg gap-1 transition-all"
          title="Borra la memoria caché del navegador y recarga la versión más reciente"
        >
          <RefreshCw className={cn("w-3 h-3", clearing && "animate-spin text-cyan-400")} />
          <span>{clearing ? "Purgando..." : "Limpiar caché"}</span>
        </Button>
      </div>

      {showBuildTime && (
        <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
          <span>Despliegue:</span>
          <span className="text-slate-300 font-mono">{BUILD_TIME}</span>
        </div>
      )}
    </div>
  );
};
