import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient, AuthUser, AuthTokens } from '../services/apiClient';

interface AuthContextType {
  user: AuthUser | null;
  role: 'patient' | 'doctor' | null;
  isFirstLogin: boolean;
  isAuthenticated: boolean;
  isRestoringSession: boolean;
  login: (credentials: { email: string; password: string }) => Promise<AuthTokens>;
  loginOfflineDemo: (targetRole: 'patient' | 'doctor') => void;
  register: (payload: { email: string; password: string; fullName?: string; contactNumber?: string }) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<'patient' | 'doctor' | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState<boolean>(false);
  const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true);

  const isAuthenticated = Boolean(user && role && apiClient.getAccessToken());

  // Restore session on mount if valid refresh token exists in storage
  useEffect(() => {
    const restore = async () => {
      const storedRefresh = apiClient.getRefreshToken();
      if (!storedRefresh) {
        setIsRestoringSession(false);
        return;
      }
      try {
        const tokens = await apiClient.refreshToken();
        const resolvedRole = (tokens.role?.toLowerCase() === 'doctor' ? 'doctor' : 'patient') as 'patient' | 'doctor';
        apiClient.setTokens(tokens.accessToken, tokens.refreshToken, tokens.user);
        setUser(tokens.user);
        setRole(resolvedRole);
        setIsFirstLogin(tokens.isFirstLogin);
      } catch {
        apiClient.clearTokens();
        setUser(null);
        setRole(null);
      } finally {
        setIsRestoringSession(false);
      }
    };
    restore();
  }, []);

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

  // Offline Demo Mode: Instant entry for testing or when local backend is not yet started
  const loginOfflineDemo = useCallback((targetRole: 'patient' | 'doctor') => {
    const demoUser: AuthUser = targetRole === 'doctor' ? {
      id: 'bf337d0c-df0d-4ce1-87ea-7d9cd7f95fbd',
      email: 'doctor@patientpilot.org',
      role: 'doctor',
      fullName: 'Dr. Rajesh Sharma, MD (Cardiologist)',
      isFirstLogin: false
    } : {
      id: 'e66ce660-03ca-46c1-a8ba-aac8977e469a',
      email: 'patient@patientpilot.org',
      role: 'patient',
      fullName: 'Rajesh Kumar',
      isFirstLogin: false
    };

    apiClient.setTokens('demo-offline-access-token', 'demo-offline-refresh-token', demoUser);
    setUser(demoUser);
    setRole(targetRole);
    setIsFirstLogin(false);
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
        isRestoringSession,
        login,
        loginOfflineDemo,
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
