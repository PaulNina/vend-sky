import { useState, useEffect } from "react";
import { apiGet, apiPut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Mail, Loader2, Save } from "lucide-react";

interface SmtpConfig {
  host: string;
  port: string;
  username: string;
  password?: string;
}

export default function SmtpConfigurationSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SmtpConfig>({
    host: "",
    port: "587",
    username: "",
    password: "",
  });

  useEffect(() => {
    loadSmtpConfig();
  }, []);

  const loadSmtpConfig = async () => {
    try {
      const res = await apiGet<Record<string, string>>("/admin/config/global");
      setConfig({
        host: res["smtp.host"] || "",
        port: res["smtp.port"] || "587",
        username: res["smtp.username"] || "",
        password: res["smtp.password"] || "",
      });
    } catch (e: any) {
      toast({ title: "Error", description: "No se pudo cargar la configuración SMTP", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        "smtp.host": config.host,
        "smtp.port": config.port,
        "smtp.username": config.username,
        "smtp.password": config.password,
      };
      await apiPut("/admin/config/global", payload);
      toast({ title: "Actualizado", description: "Configuración SMTP guardada exitosamente" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo guardar la configuración SMTP", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex justify-center items-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />Configuración Servidor de Correos (SMTP)
        </CardTitle>
        <CardDescription>
          Credenciales para el envío de correos, como por ejemplo las recuperaciones de contraseña.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-host">Host SMTP</Label>
            <Input 
              id="smtp-host" 
              value={config.host} 
              onChange={e => setConfig({...config, host: e.target.value})} 
              placeholder="smtp.mailtrap.io" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-port">Puerto</Label>
            <Input 
              id="smtp-port" 
              value={config.port} 
              onChange={e => setConfig({...config, port: e.target.value})} 
              placeholder="587" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-user">Usuario / Correo</Label>
            <Input 
              id="smtp-user" 
              value={config.username} 
              onChange={e => setConfig({...config, username: e.target.value})} 
              placeholder="usuario@dominio.com" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-pass">Contraseña</Label>
            <Input 
              id="smtp-pass" 
              type="password"
              value={config.password} 
              onChange={e => setConfig({...config, password: e.target.value})} 
              placeholder="••••••••••••" 
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Guardando..." : "Guardar Servidor SMTP"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
