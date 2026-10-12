import { useState } from "react";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { SkyworthLogo } from "@/components/brand/SkyworthLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiPost("/auth/forgot-password", { email });
      setSent(true);
      toast({ title: "Correo enviado", description: "Revisa tu bandeja de entrada o spam para continuar." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo solicitar la recuperación.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="login-stage relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="login-grid pointer-events-none absolute inset-0" />
      <Card className="admin-panel relative w-full max-w-md rounded-[22px] shadow-2xl">
        <CardHeader className="space-y-1 pb-4">
          <div className="mb-5 flex justify-center">
            <SkyworthLogo tone="white" className="w-44" />
          </div>
          <CardTitle className="text-2xl text-center font-display font-bold">Recuperar Contraseña</CardTitle>
          <CardDescription className="text-center">
            {sent ? "Hemos enviado las instrucciones a tu correo." : "Ingresa tu correo para recibir un enlace de recuperación."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="ejemplo@correo.com"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Enviando..." : "Enviar enlace de recuperación"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="p-4 bg-success/10 text-success border border-success/20 rounded-lg text-sm text-center">
                Se ha enviado un correo a <strong>{email}</strong> con las instrucciones correspondientes.
                Por favor, revisa también la carpeta de Spam.
              </div>
            </div>
          )}
          
          <div className="mt-6 flex justify-center">
             <Link to="/login" className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
               <ArrowLeft className="h-4 w-4 mr-1" />
               Volver a Iniciar Sesión
             </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
