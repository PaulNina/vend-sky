import { useState, useEffect, useCallback } from "react";
import { apiGet, apiPut, apiPatch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Loader2, Pencil, Download, Check, ChevronsUpDown, Search } from "lucide-react";
import { exportToExcel } from "@/lib/exportExcel";
import { cn, formatDateBolivia } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Tienda {
  id: number;
  nombre: string;
  ciudad: {
    id: number;
    nombre: string;
    departamento?: string;
  };
}

interface Vendor {
  id: number;
  nombreCompleto: string;
  email: string;
  telefono?: string;
  tienda?: Tienda | null;
  activo: boolean;
  createdAt?: string;
  ci?: string;
}

interface Ciudad {
  id: number;
  nombre: string;
  departamento?: string;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [editForm, setEditForm] = useState({ 
    nombreCompleto: "", 
    email: "", 
    telefono: "", 
    ci: "", 
    ciudadId: "", 
    tiendaId: "" 
  });
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [allCities, setAllCities] = useState<Ciudad[]>([]);
  const [saving, setSaving] = useState(false);
  const [citySelectorOpen, setCitySelectorOpen] = useState(false);
  const [shopSelectorOpen, setShopSelectorOpen] = useState(false);
  const isMobile = useIsMobile();

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cityFilter !== "all") params.set("city", cityFilter);
    if (search) params.set("search", search);
    const data = await apiGet<Vendor[]>(`/vendors?${params}`).catch(() => [] as Vendor[]);
    setVendors(data);
    const uniqueCities = [...new Set(data.map((v) => v.tienda?.ciudad?.nombre).filter(Boolean).map(String))];
    setCities(uniqueCities);
    setLoading(false);
  }, [cityFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openEdit = async (v: Vendor) => {
    setEditVendor(v);
    setEditForm({
      nombreCompleto: v.nombreCompleto || "",
      email: v.email || "",
      telefono: v.telefono || "",
      ci: v.ci || "",
      ciudadId: v.tienda?.ciudad?.id ? String(v.tienda.ciudad.id) : "",
      tiendaId: v.tienda ? String(v.tienda.id) : ""
    });

    // Load cities if not already loaded
    if (allCities.length === 0) {
      const cityData = await apiGet<Ciudad[]>("/cities/active").catch(() => [] as Ciudad[]);
      setAllCities(cityData);
    }

    if (v.tienda?.ciudad?.nombre) {
      const data = await apiGet<Tienda[]>(`/tiendas?city=${encodeURIComponent(v.tienda.ciudad.nombre)}`).catch(() => [] as Tienda[]);
      setTiendas(data);
    } else {
      setTiendas([]);
    }
  };

  const handleCityChange = async (cityId: string) => {
    const cityName = allCities.find(c => String(c.id) === cityId)?.nombre || "";
    setEditForm(prev => ({ ...prev, ciudadId: cityId, tiendaId: "" }));
    if (cityId && cityId !== "none") {
      const data = await apiGet<Tienda[]>(`/tiendas?city=${encodeURIComponent(cityName)}`).catch(() => [] as Tienda[]);
      setTiendas(data);
    } else {
      setTiendas([]);
    }
  };

  const saveVendor = async () => {
    if (!editVendor) return;
    setSaving(true);
    try {
      const updatedVendor = {
        ...editVendor,
        nombreCompleto: editForm.nombreCompleto,
        email: editForm.email,
        telefono: editForm.telefono,
        ci: editForm.ci,
        tienda: editForm.tiendaId && editForm.tiendaId !== "" && editForm.tiendaId !== "none" 
          ? { id: Number(editForm.tiendaId) } 
          : null
      };
      
      await apiPut(`/vendors/${editVendor.id}`, updatedVendor);
      
      toast({ title: "Vendedor actualizado" });
      setEditVendor(null);
      load();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleActive = async (v: Vendor) => {
    try {
      await apiPatch(`/vendors/${v.id}/toggle`);
      toast({ title: v.activo ? "Vendedor desactivado" : "Vendedor activado" });
      load();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleExport = () => {
    exportToExcel(vendors.map((v) => ({
      Nombre: v.nombreCompleto, Email: v.email || "", Teléfono: v.telefono || "",
      Ciudad: v.tienda?.ciudad?.nombre || "—", Tienda: v.tienda?.nombre || "", Activo: v.activo ? "Sí" : "No",
    })), "vendedores");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight">Vendedores (Kardex)</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{vendors.length} vendedores · {vendors.filter(v => v.activo).length} activos</p>
        </div>
        <Button variant="outline" onClick={handleExport} size={isMobile ? "sm" : "default"} className="w-fit">
          <Download className="h-4 w-4 mr-1.5" />Exportar Excel
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input 
          placeholder="Buscar vdor, CI, tel..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="flex-1 sm:max-w-xs h-10" 
        />
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : isMobile ? (
            <div className="divide-y divide-border">
              {vendors.map((v) => (
                <div key={v.id} className="p-3 flex items-start gap-4 hover:bg-muted/30 transition-colors" onClick={() => openEdit(v)}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold truncate pr-2">{v.nombreCompleto}</p>
                      {v.activo ? (
                        <Badge className="h-5 text-[9px] px-1.5" onClick={(e) => { e.stopPropagation(); toggleActive(v); }}>Activo</Badge>
                      ) : (
                        <Badge variant="destructive" className="h-5 text-[9px] px-1.5" onClick={(e) => { e.stopPropagation(); toggleActive(v); }}>Inactivo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{v.tienda?.nombre || "Sin tienda"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] h-5">{v.tienda?.ciudad?.nombre || "—"}</Badge>
                      <p className="text-[10px] text-muted-foreground">{v.telefono || v.email || ""}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 mt-2">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {vendors.length === 0 && (
                <p className="text-center text-muted-foreground py-12 text-sm">No se encontraron vendedores</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Teléfono</TableHead>
                <TableHead>Ciudad</TableHead><TableHead>Depto</TableHead><TableHead>Tienda</TableHead><TableHead>Estado</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.nombreCompleto}</TableCell>
                    <TableCell className="text-sm">{v.email || "—"}</TableCell>
                    <TableCell className="text-sm">{v.telefono || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{v.tienda?.ciudad?.nombre || "—"}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="bg-muted text-muted-foreground">{v.tienda?.ciudad?.departamento || "—"}</Badge></TableCell>
                    <TableCell className="text-sm">{v.tienda?.nombre || "—"}</TableCell>
                    <TableCell>
                      {v.activo ? (
                        <Badge className="cursor-pointer" onClick={() => toggleActive(v)}>Activo</Badge>
                      ) : (
                        <Badge variant="destructive" className="cursor-pointer" onClick={() => toggleActive(v)}>Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {vendors.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin vendedores</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editVendor} onOpenChange={(open) => !open && setEditVendor(null)}>
        <DialogContent className="w-full sm:max-w-lg">
          <DialogHeader className="mb-4">
            <DialogTitle>Kardex: {editVendor?.nombreCompleto}</DialogTitle>
          </DialogHeader>
          {editVendor && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input value={editForm.nombreCompleto} onChange={(e) => setEditForm({ ...editForm, nombreCompleto: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={editForm.telefono} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>CI</Label>
                  <Input value={editForm.ci} onChange={(e) => setEditForm({ ...editForm, ci: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Popover open={citySelectorOpen} onOpenChange={setCitySelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={citySelectorOpen} className="w-full justify-between font-normal">
                        {editForm.ciudadId 
                          ? allCities.find((c) => String(c.id) === editForm.ciudadId)?.nombre 
                          : "Seleccionar ciudad..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar ciudad..." />
                        <CommandList>
                          <CommandEmpty>Ciudad no encontrada.</CommandEmpty>
                          <CommandGroup>
                            {allCities.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={c.nombre}
                                onSelect={() => {
                                  handleCityChange(String(c.id));
                                  setCitySelectorOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", editForm.ciudadId === String(c.id) ? "opacity-100" : "opacity-0")} />
                                {c.nombre}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tienda</Label>
                  <Popover open={shopSelectorOpen} onOpenChange={setShopSelectorOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={shopSelectorOpen} className="w-full justify-between font-normal" disabled={!editForm.ciudadId}>
                        {editForm.tiendaId 
                          ? tiendas.find((t) => String(t.id) === editForm.tiendaId)?.nombre 
                          : "Seleccionar tienda..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar tienda..." />
                        <CommandList>
                          <CommandEmpty>{tiendas.length === 0 ? "Primero selecciona una ciudad." : "Tienda no encontrada."}</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                setEditForm({ ...editForm, tiendaId: "none" });
                                setShopSelectorOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", editForm.tiendaId === "none" ? "opacity-100" : "opacity-0")} />
                              Sin tienda
                            </CommandItem>
                            {tiendas.map((t) => (
                              <CommandItem
                                key={t.id}
                                value={t.nombre}
                                onSelect={() => {
                                  setEditForm({ ...editForm, tiendaId: String(t.id) });
                                  setShopSelectorOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", editForm.tiendaId === String(t.id) ? "opacity-100" : "opacity-0")} />
                                {t.nombre}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {!editForm.ciudadId && <p className="text-[10px] text-muted-foreground mt-1">Selecciona una ciudad para ver sus tiendas.</p>}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setEditVendor(null)}>Cancelar</Button>
            <Button onClick={saveVendor} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
