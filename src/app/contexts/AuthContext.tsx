import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api";

interface User {
  id: string | number;
  email: string;
  full_name?: string;
  onboarding_completed?: number | boolean;
  assessment_completed?: number | boolean;
  profile?: {
    full_name?: string;
    avatar?: string;
    current_level?: number;
    points?: number;
    streak_days?: number;
    interests?: string[];
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  signup: (email: string, password: string) => Promise<any>;
  loginWithGoogle: (googleUser: { email: string; displayName?: string; photoURL?: string; uid: string }) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setupProfile: (fullName: string, avatar: string, interests: string[]) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await api.auth.getMe();
      setUser(userData);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.auth.login(email, password);
    if (response.token) {
      await fetchUser();
    }
    return response;
  };

  const signup = async (email: string, password: string) => {
    const response = await api.auth.signup(email, password);
    if (response.token) {
      await fetchUser();
    }
    return response;
  };

  const loginWithGoogle = async (googleUser: { email: string; displayName?: string; photoURL?: string; uid: string }) => {
    const response = await api.auth.loginWithGoogle(googleUser);
    if (response.token) {
      await fetchUser();
    }
    return response;
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const setupProfile = async (fullName: string, avatar: string, interests: string[]) => {
    const response = await api.auth.setupProfile(fullName, avatar, interests);
    await fetchUser();
    return response;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout, refreshUser, setupProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
