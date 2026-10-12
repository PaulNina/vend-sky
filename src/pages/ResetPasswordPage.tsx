import { useState } from "react";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SkyworthLogo } from "@/components/brand/SkyworthLogo";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (!token) {
      toast({ title: "Error", description: "No se proporcionó un token válido en la URL.", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      await apiPost("/auth/reset-password", { token, newPassword: password });
      toast({ title: "Contraseña actualizada", description: "Ya puedes iniciar sesión con tu nueva contraseña." });
      navigate("/login");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la contraseña.";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="login-stage relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="login-grid pointer-events-none absolute inset-0" />
      <Card className="admin-panel relative w-full max-w-md rounded-[22px] shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-5 flex justify-center">
            <SkyworthLogo tone="white" className="w-44" />
          </div>
          <CardTitle className="text-2xl font-display font-bold">Nueva Contraseña</CardTitle>
          <CardDescription>Ingresa tu nueva contraseña</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar contraseña</Label>
              <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Actualizar contraseña
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
