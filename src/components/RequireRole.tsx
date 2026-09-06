import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LoginPage } from './LoginPage';

interface RequireRoleProps {
  role: 'patient' | 'doctor';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ role, children, fallback }) => {
  const { user, role: currentRole, isAuthenticated } = useAuth();

  // Guard must re-validate on each render
  const isAuthorized = isAuthenticated && Boolean(user) && currentRole === role;

  if (!isAuthorized) {
    return <>{fallback || <LoginPage />}</>;
  }

  return <>{children}</>;
};
