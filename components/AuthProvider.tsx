"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api/auth";
import { ApiError, getStoredToken, removeStoredToken } from "@/lib/api/client";
import { canAccessPath, isSessionCurrent } from "@/lib/access";
import type { AppUser } from "@/types";

const AuthContext = createContext<{
  user: AppUser | null;
  loading: boolean;
  error: string | null;
}>({ user: null, loading: true, error: null });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const publicPage = pathname === "/auth/login" || pathname === "/auth/register";
  const token = getStoredToken();
  const [session, setSession] = useState<{
    path: string;
    token: string | null;
    user: AppUser | null;
    error: string | null;
  }>({ path: "", token: null, user: null, error: null });

  useEffect(() => {
    if (publicPage) return;
    let active = true;

    async function loadSession() {
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      try {
        const user = await authApi.getMe();
        if (active) setSession({ path: pathname, token, user, error: null });
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          removeStoredToken();
          router.replace("/auth/login");
          return;
        }
        setSession({ path: pathname, token, user: null, error: "ตรวจสอบสิทธิ์ไม่สำเร็จ" });
      }
    }

    void loadSession();
    return () => { active = false; };
  }, [pathname, publicPage, router, token]);

  const currentSession = !publicPage && isSessionCurrent(session, pathname, token);
  return (
    <AuthContext.Provider value={{
      user: currentSession ? session.user : null,
      loading: !publicPage && !currentSession,
      error: currentSession ? session.error : null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function RouteAccess({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading, error } = useAuth();
  if (pathname === "/auth/login" || pathname === "/auth/register") return children;
  if (loading) return <p role="status" className="py-8 text-sm text-slate-500">กำลังตรวจสอบสิทธิ์...</p>;
  if (error) return (
    <div role="alert" className="rounded-lg border border-red-200 bg-white p-6">
      <p className="text-sm text-red-700">{error}</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-3 text-sm font-medium text-brand-700">ลองอีกครั้ง</button>
    </div>
  );
  if (!user || !canAccessPath(pathname, user.roles ?? [])) return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold">ไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
      <Link href="/" className="mt-3 inline-block text-sm font-medium text-brand-700">กลับหน้าภาพรวม</Link>
    </div>
  );
  return children;
}
