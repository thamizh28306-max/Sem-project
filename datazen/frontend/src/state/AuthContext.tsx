import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/auth';
import { loginApi, registerApi, logoutApi, refreshApi, getMeApi } from '../api/auth';
import { clearAccessToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (name: string, email: string, pass: string, phone?: string) => Promise<User>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Silent session restoration on app load using httpOnly refresh cookie
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        await refreshApi();
        const me = await getMeApi();
        if (mounted) setUser(me);
      } catch {
        if (mounted) {
          clearAccessToken();
          setUser(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    const loggedUser = await loginApi(email, pass);
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (name: string, email: string, pass: string, phone?: string): Promise<User> => {
    const regUser = await registerApi(name, email, pass, phone);
    setUser(regUser);
    return regUser;
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
