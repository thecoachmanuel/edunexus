"use client";

import { createContext, useState, useEffect, useContext } from "react";
import { api } from "@/lib/api";
import type { academicYear, user } from "@/types";

// 1. Create Context
const AuthContext = createContext<{
  user: user | null;
  setUser: React.Dispatch<React.SetStateAction<user | null>>;
  loading: boolean;
  year: academicYear | null;
  fetchYear: () => Promise<void>;
}>({
  user: null,
  setUser: () => {},
  loading: true,
  year: null,
  fetchYear: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<user | null>(null);
  const [loading, setLoading] = useState(true); // <--- Vital for preventing "flicker"
  const [year, setYear] = useState<academicYear | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await api.get("/users/profile");
        setUser(data.user);
      } catch (error) {
        console.log("Auth error:", error);
        setUser(null);
      }
    };

    const loadYear = async () => {
      try {
        const { data } = await api.get("/academic-years/current");
        setYear(data);
      } catch (error) {
        console.log("Year error:", error);
        setYear(null);
      }
    };

    const initialize = async () => {
      setLoading(true);
      await Promise.allSettled([checkAuth(), loadYear()]);
      setLoading(false);
    };

    initialize();
  }, []);

  const fetchYear = async () => {
    try {
      const { data } = await api.get("/academic-years/current");
      setYear(data);
    } catch (error) {
      console.log(error);
      setYear(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, year, fetchYear }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
