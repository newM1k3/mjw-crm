import React, { createContext, useContext, useEffect, useState } from 'react';
import type { RecordModel } from 'pocketbase';
import { pb } from '../lib/pocketbase';

interface AuthContextType {
  user: RecordModel | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Seed initial state from the persisted auth store so the UI is never
  // momentarily unauthenticated on a hard refresh. This is the value used
  // while the authRefresh call below is in-flight.
  const [user, setUser] = useState<RecordModel | null>(
    pb.authStore.isValid ? (pb.authStore.model as RecordModel) : null
  );
  // loading stays true until we have confirmed the token is valid (or cleared
  // it). Components that depend on `user` should wait for loading === false
  // before issuing PocketBase queries to avoid "No user in auth store" errors.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ------------------------------------------------------------------
    // A. Validate the persisted token against PocketBase on mount.
    //    If the token is still valid this silently refreshes it; if it has
    //    expired the catch block clears the store and forces a re-login.
    // ------------------------------------------------------------------
    if (pb.authStore.isValid && pb.authStore.model) {
      pb.collection('users')
        .authRefresh()
        .then(({ record }) => {
          setUser(record);
        })
        .catch(() => {
          pb.authStore.clear();
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    // ------------------------------------------------------------------
    // B. Keep React state in sync whenever the auth store changes.
    //    This fires after login, logout, or a token refresh triggered by
    //    ensureAuth(). PocketBase v0.21 passes (token, model) to onChange.
    // ------------------------------------------------------------------
    const unsubscribeStore = pb.authStore.onChange((_token, model) => {
      setUser(model as RecordModel | null);
    });

    // ------------------------------------------------------------------
    // C. Listen for the global pb:authError event dispatched by the
    //    afterSend interceptor in pocketbase.ts whenever a 401 or 403
    //    response is received. This clears the user and stops any
    //    infinite loading spinner — the app will render <AuthPage />
    //    because user becomes null.
    // ------------------------------------------------------------------
    const handleAuthError = () => {
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('pb:authError', handleAuthError);

    return () => {
      unsubscribeStore();
      window.removeEventListener('pb:authError', handleAuthError);
    };
  }, []);

  const signOut = async () => {
    pb.authStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
