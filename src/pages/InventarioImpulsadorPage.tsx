import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, PackageCheck, AlertCircle, RefreshCw, Layers, Undo2, CheckCircle2, Store } from "lucide-react";

interface InventarioItem {
  id: number;
  premioRuleta: {
    id: number;
    nombre: string;
    descripcion: string;
    colorHex: string;
  };
  tiendaNombre?: string;
  cantidadAsignada: number;
  cantidadEntregada: number;
  cantidadDevuelta: number;
  saldo: number;
  estadoConciliacion?: string;
  observaciones?: string;
  updatedAt: string;
}

export default function InventarioImpulsadorPage() {
  const { user } = useAuth();
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarInventario = async () => {
    try {
      setLoading(true);
      const res = await apiGet<InventarioItem[]>("/bandeo/mi-inventario");
      setInventario(res || []);
    } catch (err) {
      console.error("Error al cargar inventario:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  const totalAsignado = inventario.reduce((sum, item) => sum + (item.cantidadAsignada || 0), 0);
  const totalEntregado = inventario.reduce((sum, item) => sum + (item.cantidadEntregada || 0), 0);
  const totalDevuelto = inventario.reduce((sum, item) => sum + (item.cantidadDevuelta || 0), 0);
  const totalSaldo = inventario.reduce((sum, item) => sum + (item.saldo || 0), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/10 via-slate-900 to-slate-900 border border-white/10 p-6 rounded-3xl backdrop-blur-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5" /> Control de Bandeos
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Mi Inventario de Premios & Saldo
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Operador: <span className="text-slate-200 font-semibold">{user?.name}</span> · Conciliación: Asignado = Entregado + Devuelto
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={cargarInventario}
          className="border-white/10 hover:bg-white/5 text-slate-300 rounded-xl"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Asignados</p>
              <h3 className="text-xl sm:text-2xl font-black text-white mt-1">{totalAsignado} u.</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Gift className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Entregados Ruleta</p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">{totalEntregado} u.</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <PackageCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Devueltos Almacén</p>
              <h3 className="text-xl sm:text-2xl font-black text-cyan-400 mt-1">{totalDevuelto} u.</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
              <Undo2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Saldo en Mano</p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-400 mt-1">{totalSaldo} u.</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla Detallada */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg text-white">Desglose por Tipo de Insumo / Premio</CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Los premios con saldo en 0 son omitidos de la ruleta automáticamente hasta que administración asigne más stock.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-white/5 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950/80">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Insumo / Premio</TableHead>
                  <TableHead className="text-slate-400 text-xs">Punto Asignado</TableHead>
                  <TableHead className="text-center text-slate-400 text-xs">Asignado</TableHead>
                  <TableHead className="text-center text-slate-400 text-xs">Entregado</TableHead>
                  <TableHead className="text-center text-slate-400 text-xs">Devuelto</TableHead>
                  <TableHead className="text-center text-slate-400 text-xs">Saldo en Mano</TableHead>
                  <TableHead className="text-right text-slate-400 text-xs">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventario.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                      No se han asignado premios a su usuario aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventario.map((item) => (
                    <TableRow key={item.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: item.premioRuleta?.colorHex || "#3b82f6" }}
                          />
                          <div>
                            <p className="font-semibold text-sm text-white">{item.premioRuleta?.nombre}</p>
                            <p className="text-[11px] text-slate-400">{item.premioRuleta?.descripcion}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-300 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-blue-400" />
                          {item.tiendaNombre || "Punto General"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono font-medium text-slate-300">
                        {item.cantidadAsignada}
                      </TableCell>
                      <TableCell className="text-center font-mono font-medium text-emerald-400">
                        {item.cantidadEntregada}
                      </TableCell>
                      <TableCell className="text-center font-mono font-medium text-cyan-400">
                        {item.cantidadDevuelta || 0}
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-amber-400 text-base">
                        {item.saldo}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.saldo === 0 ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Conciliado
                          </Badge>
                        ) : item.saldo > 0 ? (
                          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
                            En Juego ({item.saldo})
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px]">
                            Agotado
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
