import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, AuthUser, AuthTokens } from '../services/apiClient';

interface AuthContextType {
  user: AuthUser | null;
  role: 'patient' | 'doctor' | null;
  isFirstLogin: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<AuthTokens>;
  register: (payload: { email: string; password: string; fullName?: string; contactNumber?: string }) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<'patient' | 'doctor' | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState<boolean>(false);

  const isAuthenticated = Boolean(user && role && apiClient.getAccessToken());

  // Log out action
  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      apiClient.clearTokens();
      setUser(null);
      setRole(null);
      setIsFirstLogin(false);
    }
  }, []);

  // Listen for automatic auth failure (e.g. expired refresh token)
  useEffect(() => {
    apiClient.setOnAuthFailure(() => {
      setUser(null);
      setRole(null);
      setIsFirstLogin(false);
    });
  }, []);

  // Login handler
  const login = useCallback(async (credentials: { email: string; password: string }): Promise<AuthTokens> => {
    const tokens = await apiClient.login(credentials);
    const resolvedRole = (tokens.role?.toLowerCase() === 'doctor' ? 'doctor' : 'patient') as 'patient' | 'doctor';
    
    setUser(tokens.user);
    setRole(resolvedRole);
    setIsFirstLogin(tokens.isFirstLogin);
    return tokens;
  }, []);

  // Registration handler: strictly creates patient role
  const register = useCallback(async (payload: {
    email: string;
    password: string;
    fullName?: string;
    contactNumber?: string;
  }): Promise<any> => {
    return apiClient.register(payload);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isFirstLogin,
        isAuthenticated,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
