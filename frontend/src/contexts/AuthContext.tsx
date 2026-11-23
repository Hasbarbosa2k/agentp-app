import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, profileService, type User, type LoginCredentials, type RegisterData } from '../services';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user && authService.isAuthenticated();

  // Function to load user profile
  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await profileService.getProfile();
      setUser({
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role as 'user' | 'admin' | 'editor',
        team: profile.team,
        lastLoginAt: profile.lastLoginAt
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      // If profile loading fails, clear data and token
      await authService.logout();
      setUser(null);
      setError('Session expired');
    }
  }, []);

  // Check authentication on initialization
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        if (authService.isAuthenticated()) {
          await loadUserProfile();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError('Error verifying authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [loadUserProfile]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const authData = await authService.login(credentials);
      setUser(authData.user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login error';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const authData = await authService.register(data);
      setUser(authData.user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration error';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setError(null);
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      if (authService.isAuthenticated()) {
        await loadUserProfile();
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setError('Error updating profile');
    }
  }, [loadUserProfile]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 