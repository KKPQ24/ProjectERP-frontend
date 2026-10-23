"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavLink = {
  label: string;
  href: string;
};

type NavGroup = {
  label: string;
  links: NavLink[];
};

export default function Sidebar() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    import("@/lib/api/client").then(({ getStoredToken }) => {
      setIsLoggedIn(!!getStoredToken());
    });
  }, [pathname]);

  if (pathname === "/auth/login") {
    return null;
  }

  const navGroups: NavGroup[] = [
    {
      label: "ขาย",
      links: [
        { label: "ใบเสนอราคา", href: "/sales/quotations" },
        { label: "ใบสั่งขาย", href: "/sales/sales-orders" },
        { label: "ใบส่งของ", href: "/sales/shipments" },
        { label: "ใบแจ้งหนี้", href: "/sales/invoices" },
        { label: "ใบรับเงิน", href: "/sales/receipts" },
      ],
    },
    {
      label: "จัดซื้อ",
      links: [
        { label: "ใบขอซื้อ", href: "/purchasing/purchase-requisitions" },
        { label: "ใบสั่งซื้อ", href: "/purchasing/purchase-orders" },
        { label: "ใบรับของ", href: "/purchasing/goods-receipts" },
        { label: "ใบตั้งหนี้", href: "/purchasing/bills" },
        { label: "ใบจ่ายเงิน", href: "/purchasing/payments" },
      ],
    },
    {
      label: "บัญชี",
      links: [
        { label: "ผังบัญชี", href: "/masterdata/accounts" },
        { label: "งบทดลอง", href: "/reports/trial-balance" },
      ],
    },
    {
      label: "ข้อมูลหลัก",
      links: [
        { label: "สินค้า", href: "/masterdata/products" },
        { label: "หมวดหมู่สินค้า", href: "/masterdata/categories" },
        { label: "หน่วยนับ", href: "/masterdata/units" },
        { label: "ลูกค้า", href: "/masterdata/customers" },
        { label: "ผู้ขาย", href: "/masterdata/suppliers" },
        { label: "ผู้ใช้งาน", href: "/masterdata/users" },
      ],
    },
  ];

  return (
    <aside className="flex flex-col w-64 h-screen border-r border-slate-200 bg-white shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-slate-200">
        <Link href="/" className="font-bold text-lg text-slate-800">
          ERP System
        </Link>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-6">
        {/* Dashboard Link */}
        <div>
          <Link
            href="/"
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              pathname === "/"
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            แดชบอร์ด
          </Link>
        </div>

        {/* Dynamic Groups */}
        {navGroups.map((group) => (
          <div key={group.label}>
            <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.links.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                      isActive
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
