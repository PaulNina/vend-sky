import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function RequireAuth({ children, allowedRoles }: Props) {
  const { user, loading, roles } = useAuth();

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

  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowed = allowedRoles.some((r) => roles.includes(r as any));
    if (!hasAllowed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">No autorizado</h2>
            <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
