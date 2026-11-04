/**
 * src/context/AuthContext.jsx
 * Global authentication state for Balay Urios.
 *
 * Exclusively driven by Supabase Auth (supabase.auth).
 * Persists session automatically and stays in sync via onAuthStateChange.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../services/api';

const AuthContext = createContext(null);

function clearStaleSessionStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('balay_active_tenancy_prop_id');
    localStorage.removeItem('balay_tenancy_left');
  } catch {}
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check initial active session from Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setToken(session.access_token);
        api.getMe()
          .then(profile => setUser(profile))
          .catch(() => setUser(null))
          .finally(() => setLoading(false));
      } else {
        clearStaleSessionStorage();
        setLoading(false);
      }
    });

    // 2. Listen to real-time auth changes from Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setToken(session.access_token);
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch {
          setUser(null);
        }
      } else {
        clearStaleSessionStorage();
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /** Called after login or registration */
  const handleAuth = useCallback(({ token: newToken, user: newUser }) => {
    clearStaleSessionStorage();
    setToken(newToken);
    setUser(newUser);
  }, []);

  /** Update stored user data after profile edit */
  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  /** Log out from Supabase Auth */
  const logout = useCallback(async () => {
    clearStaleSessionStorage();
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, handleAuth, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
