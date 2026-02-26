import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function getRoleRedirect(roles: string[]): string {
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("supervisor")) return "/admin/auditoria";
  if (roles.includes("revisor_ciudad")) return "/admin/revisiones";
  if (roles.includes("vendedor")) return "/v";
  return "";
}

export default function RequireAuth({ children, allowedRoles }: Props) {
  const { user, loading, roles, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User has no roles at all — likely pending approval
  if (roles.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Clock className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-2xl font-bold font-display">Cuenta pendiente de aprobación</h2>
            <p className="text-muted-foreground">
              Tu registro está siendo revisado por un administrador. Te notificaremos cuando tu cuenta esté activa.
            </p>
            <Button variant="outline" onClick={() => signOut()}>
              Cerrar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowed = allowedRoles.some((r) => roles.includes(r as any));
    if (!hasAllowed) {
      const redirect = getRoleRedirect(roles);
      if (redirect) return <Navigate to={redirect} replace />;
      // No matching redirect — show pending screen
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
