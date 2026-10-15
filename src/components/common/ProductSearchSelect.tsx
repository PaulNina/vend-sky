import React, { useState, useMemo } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X, Check, ChevronsUpDown } from "lucide-react";

export interface ProductItem {
  id: number | string;
  nombre: string;
  modelo?: string | null;
  modeloCodigo?: string | null;
  tamanoPulgadas?: number | null;
  pulgadas?: number | null;
  tipoProducto?: { id?: number; nombre?: string } | null;
  categoria?: string | null;
}

export interface ProductSearchSelectProps {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  productos: ProductItem[];
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  align?: "start" | "center" | "end";
  accentColor?: "primary" | "amber";
}

export function ProductSearchSelect({
  value,
  onChange,
  productos,
  placeholder = "Buscar y seleccionar producto...",
  allowEmpty = true,
  emptyLabel = "-- Sin producto asignado --",
  className,
  disabled = false,
  align = "start",
  accentColor = "primary",
}: ProductSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const strValue = value !== null && value !== undefined ? String(value) : "";

  const selectedProduct = useMemo(() => {
    if (!strValue || strValue === "none" || strValue === "") return null;
    return productos.find((p) => String(p.id) === strValue) || null;
  }, [productos, strValue]);

  const filtered = useMemo(() => {
    if (!search.trim()) return productos;
    const q = search.toLowerCase().trim();
    return productos.filter((p) => {
      const name = (p.nombre || "").toLowerCase();
      const model = (p.modelo || p.modeloCodigo || "").toLowerCase();
      const inches = String(p.tamanoPulgadas ?? p.pulgadas ?? "");
      const cat = (p.tipoProducto?.nombre || p.categoria || "").toLowerCase();
      return name.includes(q) || model.includes(q) || inches.includes(q) || cat.includes(q);
    });
  }, [productos, search]);

  const isAmber = accentColor === "amber";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-white ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
            isAmber ? "focus:ring-amber-400 focus:border-amber-400/50" : "focus:ring-primary focus:border-primary/50",
            className
          )}
        >
          {selectedProduct ? (
            <div className="flex items-center gap-2 truncate text-left">
              <span className="font-semibold text-white truncate">{selectedProduct.nombre}</span>
              {(selectedProduct.modelo || selectedProduct.modeloCodigo) && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] py-0 px-1.5 shrink-0 font-mono",
                    isAmber
                      ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                      : "border-primary/40 bg-primary/10 text-primary"
                  )}
                >
                  {selectedProduct.modelo || selectedProduct.modeloCodigo}
                </Badge>
              )}
              {(selectedProduct.tamanoPulgadas || selectedProduct.pulgadas) && (
                <span className="text-[11px] text-slate-400 shrink-0">
                  ({selectedProduct.tamanoPulgadas || selectedProduct.pulgadas}&quot;)
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {selectedProduct && allowEmpty && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(allowEmpty ? "none" : "");
                }}
                className="h-4 w-4 rounded-full hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white"
                title="Quitar selección"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 text-slate-400 opacity-60" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className="z-[100] w-[var(--radix-popover-trigger-width)] min-w-[320px] sm:min-w-[460px] p-2 bg-slate-950 border border-white/15 text-white shadow-2xl rounded-2xl space-y-2"
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Escribe modelo, nombre o pulgadas (ej. Q6600, 65, TV)..."
            className={cn(
              "h-8 pl-8 pr-7 bg-black/40 border-white/10 text-xs text-white placeholder:text-slate-500 font-mono",
              isAmber ? "focus:border-amber-400" : "focus:border-primary"
            )}
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
          <span>{filtered.length} de {productos.length} productos disponibles</span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className={cn("hover:underline", isAmber ? "text-amber-400" : "text-primary")}
            >
              Limpiar filtro
            </button>
          )}
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {allowEmpty && (
            <button
              type="button"
              onClick={() => {
                onChange(allowEmpty ? "none" : "");
                setOpen(false);
                setSearch("");
              }}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors",
                !selectedProduct
                  ? "bg-white/10 text-white font-medium"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <span>{emptyLabel}</span>
              {!selectedProduct && (
                <Check className={cn("h-3.5 w-3.5", isAmber ? "text-amber-400" : "text-primary")} />
              )}
            </button>
          )}

          {filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No se encontraron productos coincidentes con &quot;{search}&quot;.
            </div>
          ) : (
            filtered.map((p) => {
              const isSelected = String(p.id) === strValue;
              const model = p.modelo || p.modeloCodigo;
              const inches = p.tamanoPulgadas ?? p.pulgadas;
              const cat = p.tipoProducto?.nombre || p.categoria;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(String(p.id));
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors",
                    isSelected
                      ? isAmber
                        ? "bg-amber-400/20 text-white border border-amber-400/40"
                        : "bg-primary/20 text-white border border-primary/40"
                      : "text-slate-200 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-medium text-white truncate">{p.nombre}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {model && (
                        <span
                          className={cn(
                            "font-mono text-[10px] px-1 rounded border",
                            isAmber
                              ? "text-amber-300 bg-amber-400/10 border-amber-400/30"
                              : "text-primary bg-primary/10 border-primary/20"
                          )}
                        >
                          {model}
                        </span>
                      )}
                      {inches && (
                        <span className="text-[10px] text-slate-400">
                          {inches}&quot;
                        </span>
                      )}
                      {cat && (
                        <span className="text-[9px] text-slate-500 uppercase">
                          · {cat}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check
                      className={cn("h-4 w-4 shrink-0 ml-2", isAmber ? "text-amber-400" : "text-primary")}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ProductSearchSelect;
