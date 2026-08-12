import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../lib/database.types';

const isDev = import.meta.env.DEV;

interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string;
  address: string | null;
  zone_id: string | null;
  center_id: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    userData: {
      full_name: string;
      phone: string;
      role: UserRole;
      address?: string;
      zone_id?: string;
    }
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadReqId = useRef(0);

  const loadProfile = async (u: User) => {
    const reqId = ++loadReqId.current;
    setAuthError(null);

    if (isDev) console.log('[Auth] loadProfile start:', u.id);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle();

    if (reqId !== loadReqId.current) return;

    if (error) {
      if (isDev) console.error('[Auth] loadProfile error:', error);
      setProfile(null);
      setAuthError(error.message);
      return;
    }

    if (!data) {
      if (isDev) console.error('[Auth] Profile not found for user:', u.id);
      setProfile(null);
      setAuthError("Profil introuvable (profiles).");
      return;
    }

    if (isDev) console.log('[Auth] Profile loaded:', data.role);
    setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await loadProfile(session.user);
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        if (isDev) console.log('[Auth] initAuth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          await loadProfile(session.user);
        } else {
          setProfile(null);
        }
      } catch (e: any) {
        if (isDev) console.error('[Auth] initAuth error:', e);
        if (mounted) setAuthError(e?.message || 'Erreur auth');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isDev) console.log('[Auth] onAuthStateChange:', event);

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setAuthError(null);
        setLoading(false);
        return;
      }

      const u = session?.user ?? null;
      setUser(u);

      if (u) {
        (async () => {
          setLoading(true);
          await loadProfile(u);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setAuthError(null);
      if (isDev) console.log('[Auth] signIn:', email);

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (isDev) console.error('[Auth] signIn error:', error);
        setAuthError(error.message);
        return { error };
      }

      return { error: null };
    } catch (e: any) {
      if (isDev) console.error('[Auth] signIn exception:', e);
      setAuthError(e?.message || 'Erreur connexion');
      return { error: e as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: {
      full_name: string;
      phone: string;
      role: UserRole;
      address?: string;
      zone_id?: string;
    }
  ) => {
    try {
      setAuthError(null);
      if (isDev) console.log('[Auth] signUp:', email, userData.role);

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name,
            phone: userData.phone,
            role: userData.role,
            address: userData.address,
            zone_id: userData.zone_id,
          },
        },
      });

      if (authError) {
        if (isDev) console.error('[Auth] signUp authError:', authError);
        setAuthError(authError.message);
        return { error: authError };
      }

      if (!data.user?.id) {
        const err = new Error("Supabase n'a pas retourné user.id après signUp");
        setAuthError(err.message);
        return { error: err };
      }

      // Le profil est créé automatiquement côté base de données par le trigger
      // on_auth_user_created (SECURITY DEFINER) à partir des métadonnées
      // transmises ci-dessus. On ne tente plus d'écrire dans "profiles" depuis
      // le client : tant que l'email n'est pas confirmé (session absente),
      // cette écriture échouait avec une erreur RLS ("new row violates
      // row-level security policy for table profiles").
      if (isDev) console.log('[Auth] signUp OK (profil créé par le trigger DB)');
      return { error: null };
    } catch (e: any) {
      if (isDev) console.error('[Auth] signUp exception:', e);
      setAuthError(e?.message || 'Erreur inscription');
      return { error: e as Error };
    }
  };

  const signOut = async () => {
    try {
      if (isDev) console.log('[Auth] signOut');
      await supabase.auth.signOut();

      window.location.href = '/';
    } catch (e) {
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, authError, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
