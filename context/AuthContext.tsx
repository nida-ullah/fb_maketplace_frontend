"use client";

import React, { createContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ message?: string; success?: boolean } | undefined>;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => undefined,
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await authAPI.getProfile();
          setUser(response.data);
        } catch (error) {
          // Token invalid, clear storage
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      const { tokens, user } = response.data;

      // Save access token to localStorage
      localStorage.setItem("token", tokens.access);
      localStorage.setItem("user", JSON.stringify(user));

      setUser(user);
      router.push("/dashboard");
    } catch (error: any) {
      // Check if it's an approval error
      if (error.response?.status === 403) {
        throw new Error(
          error.response?.data?.message ||
            "Your account is pending approval. Please contact the administrator."
        );
      }
      throw new Error(error.response?.data?.error || "Login failed");
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      // Split name into first and last name
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Generate username from email (part before @)
      const username = email.split("@")[0];

      const response = await authAPI.signup(
        username,
        email,
        password,
        firstName,
        lastName
      );

      // Check if response indicates approval is needed
      if (response.data.success && !response.data.tokens) {
        // Account created but needs approval
        return response.data; // Return message to display
      }

      // Old flow (if admin changes approval system)
      if (response.data.tokens) {
        const { tokens, user } = response.data;
        localStorage.setItem("token", tokens.access);
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
        router.push("/dashboard");
      }

      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.username?.[0] ||
        error.response?.data?.email?.[0] ||
        error.response?.data?.password?.[0] ||
        error.response?.data?.error ||
        "Signup failed";
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    // Clear storage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
