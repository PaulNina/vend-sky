import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Store, Shirt, MapPin, Phone, Mail } from "lucide-react";

interface VendorData {
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string;
  store_name: string | null;
  talla_polera: string | null;
  is_active: boolean;
  pending_approval: boolean;
}

interface StoreHistory {
  id: string;
  previous_store: string | null;
  new_store: string | null;
  changed_at: string;
  observation: string | null;
}

export default function VendorProfilePage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [history, setHistory] = useState<StoreHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: v } = await supabase
        .from("vendors")
        .select("full_name, email, phone, city, store_name, talla_polera, is_active, pending_approval, id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (v) {
        setVendor(v);
        const { data: h } = await supabase
          .from("vendor_store_history")
          .select("id, previous_store, new_store, changed_at, observation")
          .eq("vendor_id", v.id)
          .order("changed_at", { ascending: false });
        setHistory(h || []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vendor) {
    return <p className="text-muted-foreground text-center py-12">No se encontró información de vendedor.</p>;
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });

  const infoItems = [
    { icon: User, label: "Nombre", value: vendor.full_name },
    { icon: Mail, label: "Email", value: vendor.email || "—" },
    { icon: Phone, label: "Teléfono", value: vendor.phone || "—" },
    { icon: MapPin, label: "Ciudad", value: vendor.city },
    { icon: Store, label: "Tienda", value: vendor.store_name || "Sin tienda" },
    { icon: Shirt, label: "Talla Polera", value: vendor.talla_polera || "No asignada" },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground">Datos personales y kardex (solo lectura)</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Datos del Vendedor</CardTitle>
            <Badge variant={vendor.is_active ? "default" : "secondary"}>
              {vendor.pending_approval ? "Pendiente" : vendor.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historial de Cambios de Tienda</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Sin cambios registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tienda Anterior</TableHead>
                  <TableHead>Tienda Nueva</TableHead>
                  <TableHead>Observación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-sm">{formatDate(h.changed_at)}</TableCell>
                    <TableCell className="text-sm">{h.previous_store || "—"}</TableCell>
                    <TableCell className="text-sm">{h.new_store || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{h.observation || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
