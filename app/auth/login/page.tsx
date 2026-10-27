"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.login({ username: username.trim(), password });
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "เข้าสู่ระบบไม่สำเร็จ โปรดลองอีกครั้ง");
      } else {
        setError("เข้าสู่ระบบไม่สำเร็จ โปรดลองอีกครั้ง");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-96px)] items-center justify-center py-8">
      <section aria-labelledby="login-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 id="login-title" className="text-center text-2xl font-semibold text-slate-900">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-center text-sm text-slate-500">ERP ร้านค้าส่งเครื่องเขียน</p>

        {error && <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">ชื่อผู้ใช้</label>
            <input id="username" name="username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100" />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">รหัสผ่าน</label>
            <div className="relative">
              <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-slate-300 py-2.5 pl-3 pr-20 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100" />
              <button type="button" aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 rounded-r-md px-3 text-xs font-medium text-slate-500 hover:text-brand-700">{showPassword ? "ซ่อน" : "แสดง"}</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="flex min-h-11 w-full items-center justify-center rounded-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
        </form>
      </section>
    </div>
  );
}
