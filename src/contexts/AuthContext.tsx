import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "vendedor" | "revisor_ciudad" | "supervisor" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  roles: [],
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      return data ? data.map((r) => r.role) : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    // Safety timeout - never stay loading forever
    const timeout = setTimeout(() => {
      if (!initialized.current) {
        initialized.current = true;
        setLoading(false);
      }
    }, 5000);

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const userRoles = await fetchRoles(newSession.user.id);
          setRoles(userRoles);
        } else {
          setRoles([]);
        }
        if (!initialized.current) {
          initialized.current = true;
        }
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (!initialized.current) {
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        if (existingSession?.user) {
          const userRoles = await fetchRoles(existingSession.user.id);
          setRoles(userRoles);
        }
        initialized.current = true;
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
