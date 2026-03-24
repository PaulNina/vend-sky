import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getToken, setToken, removeToken } from "@/lib/api";

type AppRole = "vendedor" | "revisor_ciudad" | "supervisor" | "admin";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  vendorId?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (token: string, role: string, name: string, userId: number, vendorId?: number) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  roles: [],
  loading: true,
  signIn: () => {},
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

function mapRole(role: string): AppRole {
  const map: Record<string, AppRole> = {
    VENDOR: "vendedor",
    ADMIN: "admin",
    REVIEWER: "revisor_ciudad",
    SUPERVISOR: "supervisor",
  };
  return map[role?.toUpperCase()] ?? "vendedor";
}

// JWT claim key is 'role' (English, as set by JwtUtil.java)
function decodeJwt(token: string): { sub?: string; role?: string; userId?: number; vendorId?: number } | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getToken();
    if (stored) {
      const payload = decodeJwt(stored);
      if (payload) {
        // JWT claim is 'role' (English) as set by JwtUtil.java
        const rawRole = payload.role ?? "";
        const appRole = mapRole(rawRole);
        setUser({
          id: payload.userId ?? 0,
          name: "",
          email: payload.sub ?? "",
          role: rawRole,
          vendorId: payload.vendorId,
        });
        setRoles([appRole]);
        setTokenState(stored);
      }
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(
    (jwtToken: string, role: string, name: string, userId: number, vendorId?: number) => {
      setToken(jwtToken);
      setTokenState(jwtToken);
      const appRole = mapRole(role);
      const payload = decodeJwt(jwtToken);
      setUser({
        id: userId,
        name,
        email: payload?.sub ?? "",
        role,
        vendorId,
      });
      setRoles([appRole]);
    },
    []
  );

  const signOut = useCallback(() => {
    removeToken();
    setTokenState(null);
    setUser(null);
    setRoles([]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, roles, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
