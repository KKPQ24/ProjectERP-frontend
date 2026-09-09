"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authApi } from "@/lib/api";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    import("@/lib/api/client").then(({ getStoredToken }) => {
      setIsLoggedIn(!!getStoredToken());
    });
  }, [pathname]);

  const handleLogout = async () => {
    try {
      authApi.logout();
      setIsLoggedIn(false);
      router.push("/auth/login");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Search */}
      <div className="flex flex-1 items-center">
        <form className="w-full max-w-md" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            ค้นหาเอกสาร หรือชื่อลูกค้า/ผู้ขาย
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              id="search-field"
              className="block w-full rounded-md border-0 py-1.5 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              placeholder="ค้นหาเอกสาร หรือชื่อลูกค้า/ผู้ขาย"
              type="search"
              name="search"
            />
          </div>
        </form>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        {isLoggedIn ? (
          <>
            <Link href="/auth/profile" className="flex items-center gap-x-2 text-sm font-semibold leading-6 text-slate-900 hover:text-slate-700">
              <span className="flex flex-col text-right">
                <span>ผู้ดูแลระบบ</span>
                <span className="text-xs font-normal text-slate-500">ผู้ดูแลระบบ</span>
              </span>
            </Link>
            <div className="h-6 w-px bg-slate-200" aria-hidden="true"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-x-2 text-sm font-medium leading-6 text-slate-600 hover:text-slate-900"
            >
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              ออกจากระบบ
            </button>
          </>
        ) : (
          <Link href="/auth/login" className="text-sm font-semibold leading-6 text-slate-900">
            เข้าสู่ระบบ <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
    </header>
  );
}
