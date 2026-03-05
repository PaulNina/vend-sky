import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AppRole = "vendedor" | "revisor_ciudad" | "supervisor" | "admin";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  roles: [],
  loading: true,
  signOut: async () => {},
  refreshRoles: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const processingRef = useRef(false);

  const fetchRoles = useCallback(async (userId: string): Promise<AppRole[]> => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      return data ? data.map((r) => r.role) : [];
    } catch {
      return [];
    }
  }, []);

  const handleSession = useCallback(async (newSession: Session | null) => {
    // Prevent concurrent processing
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      if (newSession?.user) {
        const userRoles = await fetchRoles(newSession.user.id);
        // Set all state atomically before setting loading to false
        setSession(newSession);
        setUser(newSession.user);
        setRoles(userRoles);
      } else {
        setSession(null);
        setUser(null);
        setRoles([]);
      }
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }, [fetchRoles]);

  useEffect(() => {
    // Safety timeout
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      handleSession(existingSession);
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        // For token refreshes, just update session/user without re-fetching roles
      if (_event === 'TOKEN_REFRESHED' && newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          return;
        }
        if (_event === 'SIGNED_OUT') {
          handleSession(newSession);
        }
        // Defer SIGNED_IN to allow registration code to finish inserting roles
        if (_event === 'SIGNED_IN') {
          setTimeout(() => handleSession(newSession), 500);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const refreshRoles = useCallback(async () => {
    if (user) {
      const userRoles = await fetchRoles(user.id);
      setRoles(userRoles);
    }
  }, [user, fetchRoles]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, signOut, refreshRoles }}>
      {children}
    </AuthContext.Provider>
  );
}
