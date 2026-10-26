"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useSearch } from "@/components/SearchContext";
import {
  goodsReceiptApi,
  paymentApi,
  purchaseOrderApi,
  purchaseRequisitionApi,
  supplierBillApi,
} from "@/lib/api/purchasing";
import {
  invoiceApi,
  quotationApi,
  receiptApi,
  salesOrderApi,
  shipmentApi,
} from "@/lib/api/sales";

type DocumentSearchResult = {
  id: number;
  documentNumber: string;
  documentType: string;
  date: string;
  status: string;
  href: string;
  searchableText: string;
};

const documentStatusLabels: Record<string, string> = {
  draft: "แบบร่าง",
  pending: "รออนุมัติ",
  waiting: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  posted: "ผ่านรายการแล้ว",
  cancelled: "ยกเลิกแล้ว",
  voided: "ยกเลิกแล้ว",
};

function createDocumentResults<T extends { id: number; status: string }>(
  documents: T[],
  options: {
    documentType: string;
    route: string;
    getDocumentNumber: (document: T) => string;
    getDate: (document: T) => string;
    // getRelatedText: (document: T) => string;
  }
): DocumentSearchResult[] {
  return documents.map((document) => {
    const documentNumber = options.getDocumentNumber(document);
    const date = options.getDate(document);

    return {
      id: document.id,
      documentNumber,
      documentType: options.documentType,
      date,
      status: document.status,
      href: `${options.route}/${document.id}`,
      searchableText: [
        documentNumber,
        options.documentType,
        document.id,
        date,
        document.status,
        // options.getRelatedText(document),
      ]
        .join(" ")
        .toLocaleLowerCase(),
    };
  });
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // คำค้นหาใช้ร่วมกับหน้ารายการ: พิมพ์แล้วตารางในหน้านั้นกรองทันที
  // (ปุ่ม "ค้นหา"/Enter ยังค้นข้ามทุกเอกสารเหมือนเดิม)
  const { query: searchQuery, setQuery: setSearchQuery } = useSearch();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/api/client").then(({ getStoredToken }) => {
      setIsLoggedIn(!!getStoredToken());
    });
  }, [pathname]);

  // กด "/" ที่ไหนก็ได้ในหน้า เพื่อกระโดดไปที่ช่องค้นหา
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (pathname === "/auth/login") {
    return null;
  }

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

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query || isSearching) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);

    try {
      const [
        quotations,
        salesOrders,
        shipments,
        invoices,
        receipts,
        purchaseRequisitions,
        purchaseOrders,
        goodsReceipts,
        bills,
        payments,
      ] = await Promise.all([
        quotationApi.getQuotations(),
        salesOrderApi.getSalesOrders(),
        shipmentApi.getShipments(),
        invoiceApi.getInvoices(),
        receiptApi.getReceipts(),
        purchaseRequisitionApi.getPRs(),
        purchaseOrderApi.getPOs(),
        goodsReceiptApi.getGoodsReceipts(),
        supplierBillApi.getBills(),
        paymentApi.getPayments(),
      ]);

      const documents = [
        ...createDocumentResults(quotations, {
          documentType: "ใบเสนอราคา",
          route: "/sales/quotations",
          getDocumentNumber: (document) => document.qt_no,
          getDate: (document) => document.qt_date,
          // getRelatedText: (document) => `${document.customer?.name ?? ""} ${document.note ?? ""}`,
        }),
        ...createDocumentResults(salesOrders, {
          documentType: "ใบสั่งขาย",
          route: "/sales/sales-orders",
          getDocumentNumber: (document) => document.so_no,
          getDate: (document) => document.so_date,
          // getRelatedText: (document) => `${document.customer?.name ?? ""} ${document.note ?? ""}`,
        }),
        ...createDocumentResults(shipments, {
          documentType: "ใบส่งของ",
          route: "/sales/shipments",
          getDocumentNumber: (document) => document.sh_no,
          getDate: (document) => document.sh_date,
          // getRelatedText: (document) => `${document.customer?.name ?? ""} ${document.note ?? ""}`,
        }),
        ...createDocumentResults(invoices, {
          documentType: "ใบแจ้งหนี้",
          route: "/sales/invoices",
          getDocumentNumber: (document) => document.inv_no,
          getDate: (document) => document.inv_date,
          // getRelatedText: (document) => document.customer?.name ?? "",
        }),
        ...createDocumentResults(receipts, {
          documentType: "ใบรับเงิน",
          route: "/sales/receipts",
          getDocumentNumber: (document) => document.receipt_no,
          getDate: (document) => document.receipt_date,
          // getRelatedText: (document) => `${document.customer?.name ?? ""} ${document.note ?? ""}`,
        }),
        ...createDocumentResults(purchaseRequisitions, {
          documentType: "ใบขอซื้อ",
          route: "/purchasing/purchase-requisitions",
          getDocumentNumber: (document) => document.pr_no,
          getDate: (document) => document.pr_date,
          // getRelatedText: (document) => document.note ?? "",
        }),
        ...createDocumentResults(purchaseOrders, {
          documentType: "ใบสั่งซื้อ",
          route: "/purchasing/purchase-orders",
          getDocumentNumber: (document) => document.po_no,
          getDate: (document) => document.po_date,
          // getRelatedText: (document) => `${document.supplier?.name ?? ""} ${document.note ?? ""}`,
        }),
        ...createDocumentResults(goodsReceipts, {
          documentType: "ใบรับของ",
          route: "/purchasing/goods-receipts",
          getDocumentNumber: (document) => document.gr_no,
          getDate: (document) => document.gr_date,
          // getRelatedText: (document) => `${document.supplier?.name ?? ""} ${document.note ?? ""}`,
        }),
        ...createDocumentResults(bills, {
          documentType: "ใบตั้งหนี้",
          route: "/purchasing/bills",
          getDocumentNumber: (document) => document.bill_no,
          getDate: (document) => document.bill_date,
          // getRelatedText: (document) => `${document.supplier?.name ?? ""} ${document.supplier_ref ?? ""}`,
        }),
        ...createDocumentResults(payments, {
          documentType: "ใบจ่ายเงิน",
          route: "/purchasing/payments",
          getDocumentNumber: (document) => document.payment_no,
          getDate: (document) => document.payment_date,
          // getRelatedText: (document) => `${document.supplier?.name ?? ""} ${document.note ?? ""}`,
        }),
      ];

      setSearchResults(
        documents
          .filter((document) => document.searchableText.includes(query))
          .slice(0, 10)
      );
    } catch (err) {
      setSearchError(
        err instanceof Error
          ? `ค้นหาเอกสารไม่สำเร็จ: ${err.message}`
          : "ค้นหาเอกสารไม่สำเร็จ กรุณาลองอีกครั้ง"
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Search */}
      <div className="flex flex-1 items-center">
        <form role="search" className="relative w-full max-w-xl" onSubmit={handleSearch}>
          <label htmlFor="search-field" className="sr-only">
            ค้นหาเอกสาร เลขที่เอกสาร หรือลูกค้า/ผู้ขาย
          </label>
          <div className="group relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            <input
              ref={searchInputRef}
              id="search-field"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-32 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="ค้นหาเลขที่เอกสาร ชื่อ หรือรหัส..."
              type="text"
              inputMode="search"
              autoComplete="off"
              name="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchResults(null);
                setSearchError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchQuery("");
                  setSearchResults(null);
                  setSearchError(null);
                  event.currentTarget.blur();
                }
              }}
              aria-controls="document-search-results"
            />
            <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults(null);
                    setSearchError(null);
                    searchInputRef.current?.focus();
                  }}
                  aria-label="ล้างคำค้นหา"
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition hover:bg-slate-300 hover:text-slate-700"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
              <button
                type="submit"
                className="rounded-lg px-3 py-1 text-sm font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
                disabled={isSearching || !searchQuery.trim()}
              >
                ค้นหา
              </button>
            </div>
          </div>
          {(isSearching || searchResults !== null || searchError) && (
            <div
              id="document-search-results"
              className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
              role="status"
              aria-live="polite"
            >
              {isSearching && (
                <p className="px-4 py-3 text-sm text-slate-500">กำลังค้นหาเอกสาร...</p>
              )}
              {searchError && (
                <p className="px-4 py-3 text-sm text-red-600">{searchError}</p>
              )}
              {!isSearching && !searchError && searchResults?.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-500">ไม่พบเอกสารที่ตรงกับคำค้นหา</p>
              )}
              {!isSearching &&
                searchResults?.map((result) => (
                  <Link
                    key={`${result.documentType}-${result.id}`}
                    href={result.href}
                    onClick={() => setSearchResults(null)}
                    className="block px-4 py-3 hover:bg-slate-50"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-900">{result.documentNumber}</span>
                      <span className="text-xs text-slate-500">{result.documentType}</span>
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>{result.date ? new Date(result.date).toLocaleDateString() : ""}</span>
                      <span>
                        {documentStatusLabels[result.status.toLowerCase()] ??
                          result.status}
                      </span>
                    </span>
                  </Link>
                ))}
            </div>
          )}
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
