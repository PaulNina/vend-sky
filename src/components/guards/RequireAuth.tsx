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
  return "/login";
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
      // Redirect to the correct section based on actual role
      const redirect = getRoleRedirect(roles);
      return <Navigate to={redirect} replace />;
    }
  }

  return <>{children}</>;
}
