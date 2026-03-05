import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

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

  // User has no roles — redirect to login
  if (roles.length === 0) {
    return <Navigate to="/login" replace />;
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
