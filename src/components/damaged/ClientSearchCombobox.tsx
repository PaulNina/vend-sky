import React, { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Search, X, PlusCircle, Check, ChevronDown } from "lucide-react";
import { CatalogoClienteItem } from "./AddClientDialog";

interface ClientSearchComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelectClient?: (client: CatalogoClienteItem) => void;
  onOpenAddModal?: (typedName: string) => void;
  clients: CatalogoClienteItem[];
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

// Normalizer for accent-insensitive search
const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

export default function ClientSearchCombobox({
  value,
  onChange,
  onSelectClient,
  onOpenAddModal,
  clients,
  disabled = false,
  placeholder = "Buscar cliente o escribir nombre...",
  required = false,
}: ClientSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered clients (optimized for 1000+ items with limit on rendered items for 60fps performance)
  const filteredClients = useMemo(() => {
    if (!value || !value.trim()) {
      return clients.slice(0, 50); // Show top 50 alphabetically when empty
    }
    const query = normalizeText(value.trim());
    const queryTokens = query.split(/\s+/).filter(Boolean);

    const matches = clients.filter((c) => {
      const normalizedName = normalizeText(c.nombre);
      const normalizedCity = c.ciudad ? normalizeText(c.ciudad) : "";
      return queryTokens.every((token) => normalizedName.includes(token) || normalizedCity.includes(token));
    });

    return matches;
  }, [clients, value]);

  // Keep active index in bounds
  useEffect(() => {
    setActiveIndex(-1);
  }, [filteredClients.length, value]);

  // Auto scroll to active item
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const handleSelect = (client: CatalogoClienteItem) => {
    onChange(client.nombre);
    if (onSelectClient) {
      onSelectClient(client);
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setActiveIndex((prev) => (prev < Math.min(filteredClients.length, 50) - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : Math.min(filteredClients.length, 50) - 1));
      }
    } else if (e.key === "Enter") {
      if (isOpen && activeIndex >= 0 && filteredClients[activeIndex]) {
        e.preventDefault();
        handleSelect(filteredClients[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    const regex = new RegExp(`(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          tokens.some((t) => t.toUpperCase() === part.toUpperCase()) ? (
            <span key={i} className="text-primary font-extrabold underline underline-offset-2">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const exactMatch = clients.some(
    (c) => normalizeText(c.nombre) === normalizeText(value || "")
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="h-4 w-4" />
        </div>

        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value.toUpperCase());
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="bg-black/20 border-white/10 text-white uppercase focus:border-primary font-semibold pl-9 pr-16 h-10 transition-all"
        />

        <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              title="Borrar texto"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
            title="Mostrar lista de clientes"
          >
            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl bg-slate-900/95 backdrop-blur-md border border-white/15 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header indicator */}
          <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {value.trim() ? (
                <>
                  <strong className="text-white">{filteredClients.length}</strong> coincidencia(s) encontrada(s)
                </>
              ) : (
                <>
                  Catálogo con <strong className="text-white">{clients.length}</strong> clientes disponibles
                </>
              )}
            </span>
            {onOpenAddModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAddModal(value);
                }}
                className="text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <PlusCircle className="h-3 w-3" /> + Nuevo cliente
              </button>
            )}
          </div>

          {/* List items */}
          <ul
            ref={listRef}
            className="max-h-60 overflow-y-auto divide-y divide-white/5 py-1 text-xs"
            role="listbox"
          >
            {filteredClients.slice(0, 50).map((client, idx) => {
              const isSelected = normalizeText(client.nombre) === normalizeText(value);
              const isActive = idx === activeIndex;

              return (
                <li
                  key={client.id || `${client.nombre}-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(client)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`px-3 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                    isActive
                      ? "bg-primary/20 text-white"
                      : isSelected
                      ? "bg-white/10 text-white"
                      : "text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold uppercase truncate">
                      {highlightMatch(client.nombre, value)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {client.ciudad && (
                      <Badge
                        variant="outline"
                        className="border-white/10 bg-black/40 text-[10px] text-slate-300 font-normal px-1.5 py-0"
                      >
                        {client.ciudad}
                      </Badge>
                    )}
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </li>
              );
            })}

            {filteredClients.length > 50 && (
              <li className="px-3 py-2 text-[11px] text-center text-slate-400 bg-white/5 italic">
                Mostrando las primeras 50 coincidencias. Sigue escribiendo para refinar...
              </li>
            )}

            {filteredClients.length === 0 && (
              <li className="px-4 py-6 text-center text-slate-400 space-y-3">
                <p className="text-xs">
                  No se encontró ningún cliente con el nombre <strong>"{value}"</strong>
                </p>
                {onOpenAddModal && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenAddModal(value);
                    }}
                    className="bg-primary hover:bg-primary/95 text-white text-xs h-8"
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1" /> Registrar "{value.trim()}" como nuevo cliente
                  </Button>
                )}
              </li>
            )}
          </ul>

          {/* Bottom Quick Action if typed name isn't exact match */}
          {value.trim() && !exactMatch && onOpenAddModal && filteredClients.length > 0 && (
            <div className="p-2 border-t border-white/10 bg-black/40 flex justify-between items-center text-xs">
              <span className="text-slate-400 truncate max-w-[220px]">
                ¿No es ninguno de la lista?
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAddModal(value);
                }}
                className="text-primary hover:underline font-semibold text-xs flex items-center gap-1 shrink-0"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Agregar "{value.trim().slice(0, 20)}..."
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
