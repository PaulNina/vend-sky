import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Filter, X, RotateCcw, Calendar, Building2, MapPin, Tag, Tv, Layers } from "lucide-react";

export interface UniversalFilterProps {
  campaigns?: { id: number; nombre: string }[];
  cities?: { id?: number; nombre: string }[];
  stores?: { id: number; nombre: string; ciudad?: string }[];
  models?: string[];
  statuses?: { value: string; label: string }[];

  selectedCampaign?: string;
  selectedCity?: string;
  selectedStore?: string;
  selectedModel?: string;
  selectedStatus?: string;
  startDate?: string;
  endDate?: string;

  onCampaignChange?: (val: string) => void;
  onCityChange?: (val: string) => void;
  onStoreChange?: (val: string) => void;
  onModelChange?: (val: string) => void;
  onStatusChange?: (val: string) => void;
  onStartDateChange?: (val: string) => void;
  onEndDateChange?: (val: string) => void;
  onReset?: () => void;

  totalResults?: number;
  className?: string;
}

export const UniversalFilterBar: React.FC<UniversalFilterProps> = ({
  campaigns = [],
  cities = [],
  stores = [],
  models = [],
  statuses = [
    { value: "TODOS", label: "Todos los estados" },
    { value: "APROBADA", label: "Aprobada" },
    { value: "PENDIENTE", label: "Pendiente" },
    { value: "OBSERVADA", label: "Observada" },
    { value: "RECHAZADA", label: "Rechazada" },
    { value: "ANULADA", label: "Anulada" },
  ],

  selectedCampaign,
  selectedCity = "all",
  selectedStore = "all",
  selectedModel = "all",
  selectedStatus = "TODOS",
  startDate = "",
  endDate = "",

  onCampaignChange,
  onCityChange,
  onStoreChange,
  onModelChange,
  onStatusChange,
  onStartDateChange,
  onEndDateChange,
  onReset,

  totalResults,
  className = "",
}) => {
  // Cascading: filter stores by selected city if any
  const filteredStores = React.useMemo(() => {
    if (!selectedCity || selectedCity === "all") return stores;
    return stores.filter(
      (s) => s.ciudad && s.ciudad.toLowerCase() === selectedCity.toLowerCase()
    );
  }, [stores, selectedCity]);

  // Count active non-default filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (selectedCampaign && selectedCampaign !== "all") count++;
    if (selectedCity && selectedCity !== "all") count++;
    if (selectedStore && selectedStore !== "all") count++;
    if (selectedModel && selectedModel !== "all") count++;
    if (selectedStatus && selectedStatus !== "TODOS") count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [
    selectedCampaign,
    selectedCity,
    selectedStore,
    selectedModel,
    selectedStatus,
    startDate,
    endDate,
  ]);

  return (
    <div className={`space-y-3 p-4 rounded-2xl glass-card border-white/5 bg-slate-900/60 shadow-xl ${className}`}>
      {/* Top Filter Bar Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* Campaign Filter */}
        {campaigns.length > 0 && onCampaignChange && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Layers className="h-3 w-3 text-primary" /> Campaña
            </Label>
            <Select value={selectedCampaign} onValueChange={onCampaignChange}>
              <SelectTrigger className="glass-card border-white/10 text-xs text-white h-9 rounded-lg">
                <SelectValue placeholder="Campaña" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                <SelectItem value="all">Todas las campañas</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* City Filter */}
        {cities.length > 0 && onCityChange && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" /> Ciudad
            </Label>
            <Select
              value={selectedCity}
              onValueChange={(val) => {
                onCityChange(val);
                // Reset store if city changes
                if (onStoreChange) onStoreChange("all");
              }}
            >
              <SelectTrigger className="glass-card border-white/10 text-xs text-white h-9 rounded-lg">
                <SelectValue placeholder="Ciudad" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                <SelectItem value="all">Todas las ciudades</SelectItem>
                {cities.map((c, idx) => (
                  <SelectItem key={c.id || idx} value={c.nombre}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Store Filter (Cascading) */}
        {stores.length > 0 && onStoreChange && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3 text-primary" /> Tienda
            </Label>
            <Select value={selectedStore} onValueChange={onStoreChange}>
              <SelectTrigger className="glass-card border-white/10 text-xs text-white h-9 rounded-lg">
                <SelectValue placeholder="Tienda" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                <SelectItem value="all">Todas las tiendas</SelectItem>
                {filteredStores.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Product Model Filter */}
        {models.length > 0 && onModelChange && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Tv className="h-3 w-3 text-primary" /> Modelo TV
            </Label>
            <Select value={selectedModel} onValueChange={onModelChange}>
              <SelectTrigger className="glass-card border-white/10 text-xs text-white h-9 rounded-lg">
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                <SelectItem value="all">Todos los modelos</SelectItem>
                {models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status Filter */}
        {onStatusChange && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3 text-primary" /> Estado
            </Label>
            <Select value={selectedStatus} onValueChange={onStatusChange}>
              <SelectTrigger className="glass-card border-white/10 text-xs text-white h-9 rounded-lg">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white text-xs">
                {statuses.map((st) => (
                  <SelectItem key={st.value} value={st.value}>
                    {st.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Start Date */}
        {onStartDateChange && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3 text-primary" /> Desde
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="glass-card border-white/10 text-xs h-9 text-white [color-scheme:dark] rounded-lg"
            />
          </div>
        )}

        {/* End Date */}
        {onEndDateChange && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3 text-primary" /> Hasta
            </Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="glass-card border-white/10 text-xs h-9 text-white [color-scheme:dark] rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Active Badges & Summary Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3 text-primary" /> Filtros activos:
          </span>

          {activeFiltersCount === 0 ? (
            <span className="text-[11px] text-slate-500 italic">Ninguno (mostrando global)</span>
          ) : (
            <>
              {selectedCampaign && selectedCampaign !== "all" && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 gap-1 pr-1">
                  Campaña #{selectedCampaign}
                  <button onClick={() => onCampaignChange && onCampaignChange("all")} className="hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCity && selectedCity !== "all" && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 gap-1 pr-1">
                  {selectedCity}
                  <button onClick={() => onCityChange && onCityChange("all")} className="hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedStore && selectedStore !== "all" && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 gap-1 pr-1">
                  Tienda #{selectedStore}
                  <button onClick={() => onStoreChange && onStoreChange("all")} className="hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedModel && selectedModel !== "all" && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 gap-1 pr-1">
                  {selectedModel}
                  <button onClick={() => onModelChange && onModelChange("all")} className="hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedStatus && selectedStatus !== "TODOS" && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 gap-1 pr-1">
                  {selectedStatus}
                  <button onClick={() => onStatusChange && onStatusChange("TODOS")} className="hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {startDate && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 gap-1 pr-1">
                  Desde {startDate}
                  <button onClick={() => onStartDateChange && onStartDateChange("")} className="hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {endDate && (
                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 gap-1 pr-1">
                  Hasta {endDate}
                  <button onClick={() => onEndDateChange && onEndDateChange("")} className="hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {totalResults !== undefined && (
            <span className="text-[11px] font-semibold text-slate-300">
              Coincidencias: <span className="font-bold text-emerald-400 font-mono">{totalResults.toLocaleString()}</span>
            </span>
          )}

          {activeFiltersCount > 0 && onReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Limpiar ({activeFiltersCount})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
