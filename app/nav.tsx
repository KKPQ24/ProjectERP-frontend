"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type NavLink = {
  label: string;
  href: string;
};

type NavGroup = {
  label: string;
  links: NavLink[];
};

const navGroups: NavGroup[] = [
  {
    label: "Auth",
    links: [
    //   { label: "Register", href: "/auth/register" },
      { label: "Login", href: "/auth/login" },
      { label: "Profile", href: "/auth/profile" },
    ],
  },
  {
    label: "Master Data",
    links: [
      { label: "Units", href: "/masterdata/units" },
      { label: "Categories", href: "/masterdata/categories" },
      { label: "Customers", href: "/masterdata/customers" },
      { label: "Suppliers", href: "/masterdata/suppliers" },
      { label: "Products", href: "/masterdata/products" },
      { label: "Accounts", href: "/masterdata/accounts" },
      { label: "Users", href: "/masterdata/users" },
    ],
  },
  {
    label: "Purchasing",
    links: [
      {
        label: "Purchase Requisitions",
        href: "/purchasing/purchase-requisitions",
      },
      { label: "Purchase Orders", href: "/purchasing/purchase-orders" },
      { label: "Goods Receipts", href: "/purchasing/goods-receipts" },
      { label: "Bills", href: "/purchasing/bills" },
      { label: "Payments", href: "/purchasing/payments" },
    ],
  },
  {
    label: "Sales",
    links: [
      { label: "Quotations", href: "/sales/quotations" },
      { label: "Sales Orders", href: "/sales/sales-orders" },
      { label: "Shipments", href: "/sales/shipments" },
      { label: "Invoices", href: "/sales/invoices" },
      { label: "Receipts", href: "/sales/receipts" },
    ],
  },
  {
    label: "Reports",
    links: [{ label: "Trial Balance", href: "/reports/trial-balance" }],
  },
];

export default function Nav() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav
      ref={navRef}
      className="flex flex-col gap-1 text-sm font-medium sm:flex-row sm:gap-2 sm:items-center"
    >
      <Link
        href="/"
        className="px-3 py-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
      >
        Home
      </Link>
      {navGroups.map((group, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={group.label} className="relative">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-1.5 rounded-md px-3 py-2 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white sm:w-auto"
            >
              {group.label}
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              >
                <path
                  d="M1.5 3.5L5 7L8.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {isOpen && (
              <div className="static z-10 mt-1 w-full rounded-md border border-zinc-200 bg-white py-1 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:absolute sm:mt-2 sm:w-56">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpenIndex(null)}
                    className="block px-3 py-2 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}