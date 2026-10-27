"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import type { AppUser } from "@/types";
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const userData = await authApi.getMe();
        setUser(userData);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(
            err.message || "ไม่สามารถดึงข้อมูลโปรไฟล์ได้ (กรุณาเข้าสู่ระบบ)",
          );
        } else {
          setError("ไม่สามารถดึงข้อมูลโปรไฟล์ได้ (กรุณาเข้าสู่ระบบ)");
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);
  const handleLogout = () => {
    authApi.logout();
    router.push("/auth/login");
    router.refresh();
  };
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
        <div className="flex items-center gap-3 text-slate-600">
          <svg
            className="h-6 w-6 animate-spin text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-lg font-medium">กำลังโหลดข้อมูลโปรไฟล์...</span>
        </div>
      </div>
    );
  }
  if (error || !user) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-bold text-red-800">
            เกิดข้อผิดพลาด
          </h3>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <div className="mt-6">
            <Link
              href="/auth/login"
              className="inline-flex w-full justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5 sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-bold leading-6 text-slate-900">
              ข้อมูลโปรไฟล์
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              รายละเอียดบัญชีผู้ใช้ระบบ ERP ของคุณ
            </p>
          </div>
          <div className="mt-4 sm:ml-4 sm:mt-0">
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-200"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
        <div className="px-6 py-5">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-500">
                รหัสพนักงาน
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{user.id}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-500">
                ชื่อผู้ใช้
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {user.username}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-500">
                ชื่อ-นามสกุล
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{user.full_name}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-slate-500">
                อีเมล
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {user.email || "-"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">
                บทบาทและสิทธิ์การใช้งาน
              </dt>
              <dd className="mt-2 text-sm text-slate-900">
                {user.roles && user.roles.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                      <li
                        key={role}
                        className="inline-flex items-center rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-700/10"
                      >
                        {role}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-500">ไม่มีสิทธิ์พิเศษ</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">สถานะบัญชี</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {user.is_active !== false ? (
                  <span className="inline-flex items-center gap-1.5 text-green-600">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    ใช้งานปกติ
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-red-600">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    ระงับการใช้งาน
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
