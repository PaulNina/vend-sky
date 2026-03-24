import { useState, useEffect } from "react";
import { apiGet, uploadUrl, getToken } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, DollarSign, QrCode, Upload, Download, Search, AlertTriangle } from "lucide-react";

const getErrorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : "Error desconocido";

interface Campaign {
  id: number;
  nombre: string;
}

interface Ciudad {
  id: number;
  nombre: string;
}

interface CommissionReport {
  vendedorId: number;
  vendedorNombre: string;
  ciudad: string;
  tienda: string;
  fotoQr: string | null;
  tallaPolera: string | null;
  cantidadVentas: number;
  montoTotal: number;
  estado: string; // "Pendiente" | "Pagado"
}

export default function PaymentsAdminPage() {
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  
  // Data
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ciudades, setCiudades] = useState<Ciudad[]>([]);
  const [reports, setReports] = useState<CommissionReport[]>([]);
  
  // Filters
  const [fCampana, setFCampana] = useState<string>("todas");
  const [fCiudad, setFCiudad] = useState<string>("todas");
  const [fStartDate, setFStartDate] = useState<string>("");
  const [fEndDate, setFEndDate] = useState<string>("");
  const [fEstado, setFEstado] = useState<string>("Todos");
  const [fMostrarCon0, setFMostrarCon0] = useState(false);
  const [fDesgloseSemanal, setFDesgloseSemanal] = useState(false); // UI toggle, unimplemented logically yet 

  // Modal State
  const [selectedVendor, setSelectedVendor] = useState<CommissionReport | null>(null);
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [camps, cities] = await Promise.all([
        apiGet<Campaign[]>("/campaigns"),
        apiGet<Ciudad[]>("/cities/active"),
      ]);
      setCampaigns(camps || []);
      setCiudades(cities || []);
      // Load unfiltered report
      await handleSearch();
    } catch (e: unknown) {
      toast({ title: "Error", description: "No se pudieron cargar los datos iniciales.", variant: "destructive" });
    }
    setInitLoading(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fCampana !== "todas") params.append("campanaId", fCampana);
      if (fCiudad !== "todas") params.append("ciudad", fCiudad);
      if (fStartDate) params.append("startDate", fStartDate);
      if (fEndDate) params.append("endDate", fEndDate);
      if (fEstado !== "Todos") params.append("estadoPago", fEstado);

      const data = await apiGet<CommissionReport[]>(`/payments/commissions?${params.toString()}`);
      setReports(data || []);
    } catch (e: unknown) {
      toast({ title: "Error de Búsqueda", description: getErrorMessage(e), variant: "destructive" });
    }
    setLoading(false);
  };

  const handleConfirmPay = async () => {
    if (!selectedVendor || !voucherFile) {
      toast({ title: "Atención", description: "Debe seleccionar un comprobante de depósito.", variant: "destructive" });
      return;
    }
    
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("fotoComprobante", voucherFile);

      // Attach global filters to the pay action so only the filtered ones get paid
      let url = uploadUrl(`/payments/pay/${selectedVendor.vendedorId}?`);
      if (fCampana !== "todas") url += `campanaId=${fCampana}&`;
      if (fCiudad !== "todas") url += `ciudad=${fCiudad}&`;
      if (fStartDate) url += `startDate=${fStartDate}&`;
      if (fEndDate) url += `endDate=${fEndDate}&`;

      const token = getToken();
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) throw new Error("Fallo al registrar el pago.");
      
      toast({ title: "Pago Registrado", description: `Se ha marcado el pago para ${selectedVendor.vendedorNombre}.` });
      setSelectedVendor(null);
      handleSearch();
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
    }
    setSubmitting(false);
  };

  const handleExportExcel = async (withQr: boolean) => {
    try {
      const params = new URLSearchParams();
      if (fCampana !== "todas") {
        params.append("campanaId", fCampana);
        const camp = campaigns.find(c => c.id.toString() === fCampana);
        if (camp) params.append("campanaNombre", camp.nombre);
      }
      if (fCiudad !== "todas") params.append("ciudad", fCiudad);
      if (fStartDate) params.append("startDate", fStartDate);
      if (fEndDate) params.append("endDate", fEndDate);
      if (fEstado !== "Todos") params.append("estadoPago", fEstado);
      params.append("withQr", String(withQr));

      const url = uploadUrl(`/payments/export-excel?${params.toString()}`);
      
      const token = getToken();
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Fallo al descargar el reporte en Excel");
      
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = withQr ? "Liquidacion_Comisiones_QR.xlsx" : "Reporte_Comisiones.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e: unknown) {
      toast({ title: "Error", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  // Metrics Logic
  const filteredReports = reports.filter(r => fMostrarCon0 ? true : r.montoTotal > 0);
  const totalVendors = filteredReports.length;
  const totalUnits = filteredReports.reduce((acc, curr) => acc + curr.cantidadVentas, 0);
  const totalMonto = filteredReports.reduce((acc, curr) => acc + curr.montoTotal, 0);

  if (initLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* HEADER TÍTULO */}
      <div className="flex items-center gap-3">
        <div className="bg-yellow-500/10 p-2 rounded-lg">
          <DollarSign className="h-6 w-6 text-yellow-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-white">Comisiones / Pagos</h1>
          <p className="text-sm text-muted-foreground">Liquidación y seguimiento de pagos a vendedores</p>
        </div>
      </div>

      {/* PANEL DE FILTROS */}
      <Card className="bg-[#12141c] border-primary/20 text-white shadow-xl shadow-black/20">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Campaña *</Label>
              <Select value={fCampana} onValueChange={setFCampana}>
                <SelectTrigger className="bg-[#1a1d27] border-white/10 text-sm">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las campañas</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Periodo</Label>
              <Select defaultValue="personalizado">
                <SelectTrigger className="bg-[#1a1d27] border-white/10 text-sm">
                  <SelectValue placeholder="Rango personalizado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personalizado">Rango personalizado</SelectItem>
                  <SelectItem value="mes">Este Mes</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ciudad</Label>
              <Select value={fCiudad} onValueChange={setFCiudad}>
                <SelectTrigger className="bg-[#1a1d27] border-white/10 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {ciudades.map(c => (
                    <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input 
                type="date" 
                className="bg-[#1a1d27] border-white/10 text-sm [color-scheme:dark]" 
                value={fStartDate} onChange={(e) => setFStartDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input 
                type="date" 
                className="bg-[#1a1d27] border-white/10 text-sm [color-scheme:dark]" 
                value={fEndDate} onChange={(e) => setFEndDate(e.target.value)} 
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="space-y-2 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Estado pago</Label>
              <Select value={fEstado} onValueChange={setFEstado}>
                <SelectTrigger className="bg-[#1a1d27] border-white/10 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Pendiente">Pendientes</SelectItem>
                  <SelectItem value="Pagado">Pagados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <Switch id="mostrar-0" checked={fMostrarCon0} onCheckedChange={setFMostrarCon0} />
              <Label htmlFor="mostrar-0" className="text-sm font-medium">Mostrar con 0</Label>
            </div>

            <div className="flex items-center space-x-2 mt-4 md:mt-0">
              <Switch id="desglose" checked={fDesgloseSemanal} onCheckedChange={setFDesgloseSemanal} />
              <Label htmlFor="desglose" className="text-sm font-medium">Desglose semanal</Label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold" onClick={() => handleExportExcel(true)}>
              Generar Liquidación
            </Button>
            <Button variant="outline" className="border-white/10 hover:bg-white/5 bg-transparent" onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Consultar
            </Button>
            <Button variant="outline" className="border-white/10 hover:bg-white/5 bg-transparent" onClick={() => handleExportExcel(false)}>
              <Download className="h-4 w-4 mr-2" /> Excel
            </Button>
          </div>

          <div className="pt-2 text-yellow-500 text-xs flex items-center gap-1.5 opacity-80">
            <AlertTriangle className="h-3.5 w-3.5" /> El periodo excede el rango de campaña (opcional)
          </div>
        </CardContent>
      </Card>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#12141c] border-primary/20 flex flex-col items-center justify-center p-6 shadow-lg shadow-black/20">
          <p className="text-muted-foreground text-sm mb-1">Vendedores</p>
          <p className="text-3xl font-bold text-white">{totalVendors}</p>
        </Card>
        <Card className="bg-[#12141c] border-primary/20 flex flex-col items-center justify-center p-6 shadow-lg shadow-black/20">
          <p className="text-muted-foreground text-sm mb-1">Unidades</p>
          <p className="text-3xl font-bold text-white">{totalUnits}</p>
        </Card>
        <Card className="bg-[#12141c] border-primary/20 flex flex-col items-center justify-center p-6 shadow-lg shadow-black/20">
          <p className="text-muted-foreground text-sm mb-1">Total Bs</p>
          <p className="text-3xl font-bold text-yellow-500">Bs {totalMonto}</p>
        </Card>
      </div>

      {/* DATA TABLE */}
      <Card className="bg-[#12141c] border-primary/20 shadow-xl shadow-black/20 pb-4 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-muted-foreground">Vendedor</TableHead>
              <TableHead className="text-muted-foreground">Ciudad</TableHead>
              <TableHead className="text-muted-foreground">Tienda</TableHead>
              <TableHead className="text-muted-foreground text-center">Uds</TableHead>
              <TableHead className="text-muted-foreground text-right w-32">Comisión Bs</TableHead>
              <TableHead className="text-muted-foreground">Estado</TableHead>
              <TableHead className="text-muted-foreground text-center">QR</TableHead>
              <TableHead className="text-muted-foreground text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No hay comisiones para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((p) => (
                <TableRow key={p.vendedorId} className="border-b border-white/5 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{p.vendedorNombre}</TableCell>
                  <TableCell className="text-slate-300">{p.ciudad}</TableCell>
                  <TableCell className="text-slate-300">{p.tienda || '--'}</TableCell>
                  <TableCell className="text-center text-slate-300">{p.cantidadVentas}</TableCell>
                  <TableCell className="font-bold text-right text-white">Bs {p.montoTotal}</TableCell>
                  <TableCell>
                     {p.estado === 'Pendiente' ? (
                       <span className="text-xs font-medium text-slate-400">Pendiente</span>
                     ) : (
                       <span className="text-xs font-medium text-green-500">Pagado</span>
                     )}
                  </TableCell>
                  <TableCell className="text-center">
                     {p.fotoQr ? (
                        <div className="flex justify-center"><QrCode className="h-4 w-4 text-slate-400" /></div>
                     ) : (
                        <span className="text-slate-600">--</span>
                     )}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.estado === 'Pendiente' && p.montoTotal > 0 && (
                      <Button size="sm" variant="outline" className="border-white/10 hover:bg-yellow-500 hover:text-black bg-transparent text-xs py-0 h-7" onClick={() => {
                        setSelectedVendor(p);
                        setVoucherFile(null);
                      }}>
                        Pagar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* DIÁLOGO DE PAGO */}
      <Dialog open={selectedVendor !== null} onOpenChange={(open) => !open && setSelectedVendor(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Depósito</DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-6 py-4">
              <div className="rounded-lg bg-muted/30 p-4 border flex items-start gap-4">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{selectedVendor.vendedorNombre}</p>
                  <p className="text-xs text-muted-foreground">Monto a liquidar: <span className="font-bold text-green-600 dark:text-green-400">Bs {selectedVendor.montoTotal}</span></p>
                  <p className="text-xs text-muted-foreground">Esta acción marcará las ventas filtradas como Pagadas.</p>
                </div>
              </div>

              {selectedVendor.fotoQr ? (
                <div className="space-y-3">
                  <Label className="text-xs flex items-center gap-1"><QrCode className="h-3 w-3" /> QR del Vendedor</Label>
                  <img 
                    src={uploadUrl(selectedVendor.fotoQr)} 
                    alt="QR" 
                    className="max-h-[220px] mx-auto object-contain border rounded shadow-sm"
                  />
                </div>
              ) : (
                <div className="text-center p-4 border border-dashed rounded bg-yellow-50/50 dark:bg-yellow-900/10">
                  <p className="text-xs text-yellow-600 dark:text-yellow-500 font-medium">Este vendedor no ha subido su QR.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Deberá contactarlo para coordinar el depósito a cuenta bancaria.</p>
                </div>
              )}

              <div className="space-y-3 pt-2 border-t">
                <Label className="text-xs flex items-center gap-1"><Upload className="h-3 w-3" /> Subir Comprobante (Voucher)</Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setVoucherFile(e.target.files[0]);
                    }
                  }} 
                />
              </div>

            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedVendor(null)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleConfirmPay} disabled={submitting || !voucherFile} className="bg-yellow-500 hover:bg-yellow-600 text-black">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
