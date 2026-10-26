"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import NavIcon, { type NavIconName } from "@/components/NavIcon";

type NavLink = {
  label: string;
  href: string;
  icon: NavIconName;
};

type NavGroup = {
  label: string;
  icon: NavIconName;
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
      icon: "groupSales",
      links: [
        { label: "ใบเสนอราคา", href: "/sales/quotations", icon: "quotation" },
        { label: "ใบสั่งขาย", href: "/sales/sales-orders", icon: "salesOrder" },
        { label: "ใบส่งของ", href: "/sales/shipments", icon: "shipment" },
        { label: "ใบแจ้งหนี้", href: "/sales/invoices", icon: "invoice" },
        { label: "ใบรับเงิน", href: "/sales/receipts", icon: "receipt" },
      ],
    },
    {
      label: "จัดซื้อ",
      icon: "groupPurchasing",
      links: [
        { label: "ใบขอซื้อ", href: "/purchasing/purchase-requisitions", icon: "requisition" },
        { label: "ใบสั่งซื้อ", href: "/purchasing/purchase-orders", icon: "purchaseOrder" },
        { label: "ใบรับของ", href: "/purchasing/goods-receipts", icon: "goodsReceipt" },
        { label: "ใบตั้งหนี้", href: "/purchasing/bills", icon: "bill" },
        { label: "ใบจ่ายเงิน", href: "/purchasing/payments", icon: "payment" },
      ],
    },
    {
      label: "บัญชี",
      icon: "groupAccounting",
      links: [
        { label: "ผังบัญชี", href: "/masterdata/accounts", icon: "accounts" },
        { label: "งบทดลอง", href: "/reports/trial-balance", icon: "trialBalance" },
      ],
    },
    {
      label: "ข้อมูลหลัก",
      icon: "groupMasterdata",
      links: [
        { label: "สินค้า", href: "/masterdata/products", icon: "product" },
        { label: "หมวดหมู่สินค้า", href: "/masterdata/categories", icon: "category" },
        { label: "หน่วยนับ", href: "/masterdata/units", icon: "unit" },
        { label: "ลูกค้า", href: "/masterdata/customers", icon: "customer" },
        { label: "ผู้ขาย", href: "/masterdata/suppliers", icon: "supplier" },
        { label: "ผู้ใช้งาน", href: "/masterdata/users", icon: "user" },
      ],
    },
  ];

  return (
    <aside className="flex flex-col w-64 h-screen border-r border-slate-200 bg-white shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-slate-200">
        <Link href="/" className="font-bold text-lg text-slate-800">
          ระบบ ERP
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
            <NavIcon name="dashboard" />
            แดชบอร์ด
          </Link>
        </div>

        {/* Dynamic Groups */}
        {navGroups.map((group) => (
          <div key={group.label}>
            <h3 className="flex items-center gap-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <NavIcon name={group.icon} className="h-4 w-4" />
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.links.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`group flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                      isActive
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <NavIcon
                      name={link.icon}
                      className={`h-5 w-5 transition-colors ${
                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
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
