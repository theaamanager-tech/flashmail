import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { getCurrentUserFn } from "@/lib/server-fns/auth-fns";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function hydrate() {
    try {
      const session = await getCurrentUserFn();
      setUser(session?.user ?? null);
      setProfile(session?.profile ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    hydrate();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
      } else if (session?.user) {
        setUser(session.user);
        // Refetch profile from server for latest role/suspension state
        hydrate();
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refresh: hydrate, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
