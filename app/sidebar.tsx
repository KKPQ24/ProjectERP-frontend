"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { canAccessPath } from "@/lib/access";
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
  const { user } = useAuth();
  const mobileMenu = useRef<HTMLDialogElement>(null);

  if (pathname === "/auth/login") return null;

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

  const visibleGroups = navGroups.map((group) => ({
    ...group,
    links: group.links.filter((link) => user && canAccessPath(link.href, user.roles ?? [])),
  })).filter((group) => group.links.length > 0);

  const brand = (
    <Link href="/" onClick={() => mobileMenu.current?.close()} className="text-base font-semibold tracking-tight text-slate-900">
      ระบบ ERP
    </Link>
  );

  const navigation = (
    <nav aria-label="เมนูหลัก" className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
      <Link
        href="/"
        aria-current={pathname === "/" ? "page" : undefined}
        onClick={() => mobileMenu.current?.close()}
        className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium ${
          pathname === "/" ? "bg-brand-100 text-brand-800" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <NavIcon name="dashboard" className="h-[18px] w-[18px]" />
        ภาพรวม
      </Link>
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <h2 className="mb-1.5 px-3 text-[11px] font-medium text-slate-500">{group.label}</h2>
          <div className="space-y-0.5">
            {group.links.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => mobileMenu.current?.close()}
                  className={`flex min-h-10 items-center gap-3 rounded-md px-3 text-sm ${
                    isActive ? "bg-brand-100 font-semibold text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <NavIcon name={link.icon} className={`h-[18px] w-[18px] ${isActive ? "text-brand-700" : "text-slate-500"}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50 lg:flex">
        <div className="flex h-[76px] shrink-0 items-center border-b border-slate-200 px-6">{brand}</div>
        {navigation}
      </aside>

      <button
        type="button"
        onClick={() => mobileMenu.current?.showModal()}
        aria-label="เปิดเมนูหลัก"
        aria-haspopup="dialog"
        aria-controls="mobile-navigation"
        className="fixed left-3 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 lg:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <dialog
        ref={mobileMenu}
        id="mobile-navigation"
        aria-label="เมนูหลัก"
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-dvh w-72 max-w-[85vw] border-0 bg-white p-0 text-slate-900 backdrop:bg-slate-950/35"
        onClick={(event) => { if (event.target === event.currentTarget) mobileMenu.current?.close(); }}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-slate-200 px-5">
            {brand}
            <button type="button" autoFocus aria-label="ปิดเมนูหลัก" onClick={() => mobileMenu.current?.close()} className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-slate-100">✕</button>
          </div>
          {navigation}
        </div>
      </dialog>
    </>
  );
}
