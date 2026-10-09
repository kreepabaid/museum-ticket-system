import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('museum_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('museum_auth_token') || '');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' or 'register'

  useEffect(() => {
    if (token) {
      localStorage.setItem('museum_auth_token', token);
    } else {
      localStorage.removeItem('museum_auth_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('museum_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('museum_user');
    }
  }, [user]);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    setIsAuthModalOpen(false);
    return res.data.user;
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    setToken(res.data.token);
    setUser(res.data.user);
    setIsAuthModalOpen(false);
    return res.data.user;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('museum_auth_token');
    localStorage.removeItem('museum_user');
  };

  const loginAsVisitor = async () => {
    return login('visitor@example.com', 'Visitor@123');
  };

  const loginAsAdmin = async () => {
    return login('admin@museum.org', 'Admin@123');
  };

  const openLoginModal = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAdmin: (user?.role || '').toUpperCase() === 'ADMIN',
        isVisitor: (user?.role || '').toUpperCase() === 'VISITOR',
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        loginAsVisitor,
        loginAsAdmin,
        isAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openLoginModal,
        openRegisterModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
