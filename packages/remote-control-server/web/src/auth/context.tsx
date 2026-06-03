import { createContext, useContext, type ReactNode } from 'react';
import type { User } from 'oidc-client-ts';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  mode: 'oidc' | 'uuid';
  /** OIDC display name: preferred_username > name > email > sub */
  displayName: string;
  /** Unique user identifier: OIDC sub or UUID */
  userId: string;
  /** Access token for API calls */
  accessToken: string | null;
  /** Error message if OIDC initialization failed */
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children, value }: { children: ReactNode; value: AuthContextValue }) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
