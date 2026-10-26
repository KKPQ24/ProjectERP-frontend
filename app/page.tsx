"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/api/client";
import { productApi, customerApi, supplierApi } from "@/lib/api/masterdata";
import {
  quotationApi,
  salesOrderApi,
  shipmentApi,
  invoiceApi,
  receiptApi,
} from "@/lib/api/sales";
import {
  purchaseRequisitionApi,
  purchaseOrderApi,
  goodsReceiptApi,
  supplierBillApi,
  paymentApi,
} from "@/lib/api/purchasing";

export default function Home() {
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState({
    products: [] as any[],
    customers: [] as any[],
    suppliers: [] as any[],
    quotations: [] as any[],
    salesOrders: [] as any[],
    shipments: [] as any[],
    invoices: [] as any[],
    receipts: [] as any[],
    purchaseRequisitions: [] as any[],
    purchaseOrders: [] as any[],
    goodsReceipts: [] as any[],
    supplierBills: [] as any[],
    payments: [] as any[],
  });

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/auth/login");
      return;
    }

    async function fetchAllDashboardData() {
      try {
        const results = await Promise.allSettled([
          productApi.getProducts(),
          customerApi.getCustomers(),
          supplierApi.getSuppliers(),
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

        const val = (r: PromiseSettledResult<any>) =>
          r.status === "fulfilled" && Array.isArray(r.value) ? r.value : [];

        setDashboardData({
          products: val(results[0]),
          customers: val(results[1]),
          suppliers: val(results[2]),
          quotations: val(results[3]),
          salesOrders: val(results[4]),
          shipments: val(results[5]),
          invoices: val(results[6]),
          receipts: val(results[7]),
          purchaseRequisitions: val(results[8]),
          purchaseOrders: val(results[9]),
          goodsReceipts: val(results[10]),
          supplierBills: val(results[11]),
          payments: val(results[12]),
        });
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล:", error);
      }
    }

    fetchAllDashboardData();
  }, [router]);

  // ทำสถานะ
  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    approved: { label: "อนุมัติแล้ว", cls: "bg-emerald-100 text-emerald-800" },
    pending: { label: "รออนุมัติ", cls: "bg-amber-100 text-amber-800" },
    waiting: { label: "รออนุมัติ", cls: "bg-amber-100 text-amber-800" },
    draft: { label: "แบบร่าง", cls: "bg-slate-100 text-slate-700" },
    posted: { label: "ผ่านรายการ", cls: "bg-blue-100 text-blue-800" },
    cancelled: { label: "ยกเลิก", cls: "bg-rose-100 text-rose-800" },
    voided: { label: "ยกเลิก", cls: "bg-rose-100 text-rose-800" },
  };
  // Helpers
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "-"
      : d.toLocaleDateString("th-TH", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        });
  };

  const getPrTotal = (pr: any) => {
    if (pr.total_amount || pr.totalAmount)
      return Number(pr.total_amount || pr.totalAmount);
    if (Array.isArray(pr.line) && pr.line.length > 0) {
      const sum = pr.line.reduce((tot: number, l: any) => {
        const prod = dashboardData.products.find(
          (p: any) => Number(p.id) === Number(l.product_id),
        );
        return (
          tot +
          Number(l.qty || 0) * Number(l.unit_price ?? prod?.sale_price ?? 0)
        );
      }, 0);
      if (sum > 0) return sum;
    }
    return null;
  };

  const getParty = (id: number, type: "cust" | "supp") =>
    (type === "cust" ? dashboardData.customers : dashboardData.suppliers).find(
      (x: any) => Number(x.id) === Number(id),
    )?.name;

  const renderStatus = (status: string) => {
    const s = STATUS_MAP[(status || "").toLowerCase()] || {
      label: status || "-",
      cls: "bg-slate-100 text-slate-700",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
        {s.label}
      </span>
    );
  };

  // รวมเอกสารทั้งหมดเพื่อใช้ร่วมกันในทุกเงื่อนไข
  const normalize = (
    list: any[],
    type: string,
    typeName: string,
    codeKey: string,
    dateKey: string,
    route: string,
    partyType: "cust" | "supp",
    isOrder = false,
  ) =>
    (list || []).map((item) => ({
      docCode: item[codeKey] || item.code || "-",
      docType: type,
      docTypeName: typeName,
      docDate: item[dateKey] || item.created_at,
      partyName:
        (partyType === "cust"
          ? item.customer?.name ||
            item.customerName ||
            getParty(item.customer_id, "cust")
          : item.supplier?.name ||
            item.supplierName ||
            getParty(item.supplier_id, "supp")) ||
        (partyType === "supp" && type === "PR" ? "ฝ่ายจัดซื้อ" : "-"),
      amount:
        type === "PR"
          ? getPrTotal(item)
          : Number(item.total_amount ?? item.amount ?? 0),
      status: item.status,
      route,
      isOrder,
    }));

  const allDocs = [
    ...normalize(
      dashboardData.purchaseRequisitions,
      "PR",
      "ใบขอซื้อ (PR)",
      "pr_no",
      "pr_date",
      "/purchasing/purchase-requisitions",
      "supp",
      true,
    ),
    ...normalize(
      dashboardData.quotations,
      "QT",
      "ใบเสนอราคา (QT)",
      "qt_no",
      "qt_date",
      "/sales/quotations",
      "cust",
      true,
    ),
    ...normalize(
      dashboardData.purchaseOrders,
      "PO",
      "ใบสั่งซื้อ (PO)",
      "po_no",
      "po_date",
      "/purchasing/purchase-orders",
      "supp",
      true,
    ),
    ...normalize(
      dashboardData.salesOrders,
      "SO",
      "ใบสั่งขาย (SO)",
      "so_no",
      "so_date",
      "/sales/sales-orders",
      "cust",
      true,
    ),
    ...normalize(
      dashboardData.invoices,
      "INV",
      "ใบแจ้งหนี้ (INV)",
      "inv_no",
      "inv_date",
      "/sales/invoices",
      "cust",
    ),
    ...normalize(
      dashboardData.receipts,
      "RC",
      "ใบเสร็จ (RC)",
      "receipt_no",
      "receipt_date",
      "/sales/receipts",
      "cust",
    ),
  ];

  // 1. KPI Calculations
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const endToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  const isToday = (d?: string | null) => {
    if (!d) return false;
    const time = new Date(d).getTime();
    return time >= startToday.getTime() && time <= endToday.getTime();
  };

  const invoiceSales = dashboardData.invoices
    .filter((inv) => isToday(inv.inv_date || inv.created_at))
    .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const soSales = dashboardData.salesOrders
    .filter((so) => isToday(so.so_date || so.created_at))
    .reduce((sum, so) => sum + Number(so.total_amount || 0), 0);
  const todaySales = invoiceSales > 0 ? invoiceSales : soSales;

  // 2. เอกสารรออนุมัติ (PR, QT, PO, SO)
  const allPendingItems = allDocs
    .filter(
      (d) =>
        d.isOrder &&
        ["pending", "waiting"].includes((d.status || "").toLowerCase()),
    )
    .sort(
      (a, b) =>
        new Date(b.docDate || 0).getTime() - new Date(a.docDate || 0).getTime(),
    );

  // 3. สินค้าเหลือน้อย
  const lowStockProducts = dashboardData.products.filter(
    (p) =>
      p.low_stock === true ||
      (p.reorder_point != null &&
        Number(p.on_hand ?? 0) <= Number(p.reorder_point)),
  );

  // 4. เอกสารล่าสุด 5 อันดับแรก
  const allRecentDocs = [...allDocs]
    .filter((d) => d.docDate)
    .sort(
      (a, b) => new Date(b.docDate).getTime() - new Date(a.docDate).getTime(),
    )
    .slice(0, 10);

  // 5. เอกสารที่ค้างเกิน 3 วัน
  const nowMs = Date.now();
  const overdueDocs = allDocs
    .filter(
      (d) =>
        d.isOrder &&
        ["pending", "draft", "waiting"].includes(
          (d.status || "").toLowerCase(),
        ),
    )
    .map((d) => ({
      ...d,
      diffDays: Math.floor(
        (nowMs - new Date(d.docDate || 0).getTime()) / 86400000,
      ),
    }))
    .filter((d) => d.diffDays >= 3)
    .sort((a, b) => b.diffDays - a.diffDays);

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50/60 p-3 sm:p-4 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        {/* Header */}
        <header className="relative isolate overflow-hidden rounded-3xl px-5 py-6 shadow-xl shadow-blue-950/10 sm:px-8 sm:py-8">
          <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-24 -z-10 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 right-1/3 -z-10 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                ระบบ ERP
              </h1>
              <p className="mt-2 text-sm sm:text-base">
                ภาพรวมธุรกิจและรายการสำคัญของคุณในวันนี้
              </p>
            </div>
            <div className="w-fit rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-inner shadow-white/5 backdrop-blur-sm">
              <p className="text-[11px] font-medium uppercase tracking-wider">
                วันนี้
              </p>
              <p className="mt-0.5 text-sm font-semibold sm:text-base">
                {new Date().toLocaleDateString("th-TH", { dateStyle: "long" })}
              </p>
            </div>
          </div>
        </header>

        {/* KPI cards */}
        <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {[
            {
              label: "ยอดขายรวม",
              value: `${todaySales.toLocaleString()} ฿`,
              note: "วันนี้ ",
              color: "from-sky-500 to-blue-600",
              symbol: "฿",
            },
            {
              label: "รออนุมัติ",
              value: `${allPendingItems.length} รายการ`,
              note: "PR, QT, PO, SO",
              color: "from-amber-400 to-orange-500",
              symbol: "…",
            },
            {
              label: "สินค้าเหลือน้อย",
              value: `${lowStockProducts.length} รายการ`,
              note: "ถึงจุดสั่งซื้อซ้ำ",
              color: "from-rose-500 to-red-600",
              symbol: "!",
            },
            {
              label: "ลูกค้าทั้งหมด",
              value: `${dashboardData.customers.length} ราย`,
              note: "ในฐานข้อมูล",
              color: "from-emerald-400 to-teal-600",
              symbol: "◎",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="group relative flex min-w-0 items-center gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60 sm:p-5"
            >
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${k.color} text-lg font-bold text-white shadow-lg shadow-slate-300/50`}>
                {k.symbol}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500 sm:text-sm">{k.label}</p>
                <p className="truncate text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
                  {k.value}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">{k.note}</p>
              </div>
            </div>
          ))}
        </section>

        {/* grid แยก row*/}
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
          {/* เอกสารที่รออนุมัติ */}
          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-8">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-800">
                  เอกสารที่รออนุมัติ
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  (ใบขอซื้อ PR, ใบเสนอราคา QT, PO, SO)
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200/70">
                {allPendingItems.length} รายการ
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50/80 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">ประเภท</th>
                    <th className="px-4 py-3 font-medium">เลขที่เอกสาร</th>
                    <th className="px-4 py-3 font-medium">วันที่</th>
                    <th className="px-4 py-3 font-medium">ลูกค้า / ผู้ขาย</th>
                    <th className="px-4 py-3 text-right font-medium">ยอดรวม</th>
                    <th className="px-4 py-3 text-center font-medium">สถานะ</th>
                    <th className="px-4 py-3 text-center font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPendingItems.length > 0 ? (
                    allPendingItems.map((item, idx) => (
                      <tr
                        key={item.docCode || idx}
                        className="transition-colors hover:bg-blue-50/40"
                      >
                        <td className="px-4 py-3 text-sm">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.docTypeName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                          {item.docCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {formatDate(item.docDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[160px] truncate">
                          {item.partyName}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-800 whitespace-nowrap">
                          {item.amount != null
                            ? `${Number(item.amount).toLocaleString()} ฿`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {renderStatus(item.status)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <button
                            onClick={() => router.push(item.route)}
                            className="min-h-9 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                          >
                            ตรวจสอบ
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-12 text-center text-sm text-slate-400"
                      >
                        ไม่มีเอกสารที่รออนุมัติ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* สินค้าที่เหลือน้อย */}
          <section className="flex h-[320px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm sm:h-[360px] lg:col-span-4 lg:h-[400px]">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-5">
              <h2 className="font-semibold text-slate-800">
                สินค้าที่เหลือน้อย
              </h2>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200/70">
                {lowStockProducts.length} รายการ
              </span>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full min-w-[360px] text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-medium text-slate-500 shadow-sm">
                  <tr>
                    <th className="px-4 py-3">ชื่อสินค้า</th>
                    <th className="px-4 py-3 text-right">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockProducts.length > 0 ? (
                    lowStockProducts.map((item: any) => (
                      <tr key={item.id} className="transition-colors hover:bg-rose-50/40">
                        <td className="px-4 py-3 text-sm text-slate-800">
                          <p className="font-medium line-clamp-1">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            รหัส: {item.sku} | จุดสั่งซื้อ:{" "}
                            {item.reorder_point ?? "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-red-600 whitespace-nowrap">
                          {Number(item.on_hand ?? 0).toLocaleString()}{" "}
                          {item.unit_name || item.unit?.name || "ชิ้น"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-10 text-center text-sm text-slate-400"
                      >
                        สต็อกสินค้าอยู่ในเกณฑ์ปกติ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          {/* เอกสารล่าสุด 10 ราบการ */}
          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-5">
              <h2 className="font-semibold text-slate-800">เอกสารล่าสุด</h2>
              <span className="text-xs text-slate-400">10 รายการล่าสุด</span>
            </div>

            <div className="max-h-[280px] overflow-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-medium text-slate-500 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 bg-slate-50">เลขที่เอกสาร</th>
                    <th className="px-4 py-3 bg-slate-50">วันที่</th>
                    <th className="px-4 py-3 bg-slate-50">ลูกค้า / ผู้ขาย</th>
                    <th className="px-4 py-3 text-right bg-slate-50">ยอดรวม</th>
                    <th className="px-4 py-3 text-center bg-slate-50">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRecentDocs.length > 0 ? (
                    allRecentDocs.map((doc, idx) => (
                      <tr
                        key={doc.docCode || idx}
                        onClick={() => router.push(doc.route)}
                        className="cursor-pointer transition-colors hover:bg-blue-50/40"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          <span className="inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 mr-1.5">
                            {doc.docType}
                          </span>
                          {doc.docCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {formatDate(doc.docDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[160px] truncate">
                          {doc.partyName}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-800 whitespace-nowrap">
                          {doc.amount != null
                            ? `${Number(doc.amount).toLocaleString()} ฿`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          {renderStatus(doc.status)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm text-slate-400"
                      >
                        ยังไม่มีเอกสารในระบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* เอกสารที่ค้าง (ค้างเกิน 3 วัน) */}
          <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-slate-800">เอกสารที่ค้าง</h2>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                  ค้างเกิน 3 วัน
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {overdueDocs.length} รายการ
              </span>
            </div>
            <div className="max-h-[280px] flex-1 overflow-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-medium text-slate-500 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 bg-slate-50">เลขที่เอกสาร</th>
                    <th className="px-4 py-3 bg-slate-50">วันที่</th>
                    <th className="px-4 py-3 bg-slate-50">ลูกค้า / ผู้ขาย</th>
                    <th className="px-4 py-3 text-right bg-slate-50">ยอดรวม</th>
                    <th className="px-4 py-3 text-center bg-slate-50">
                      ระยะเวลา
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueDocs.length > 0 ? (
                    overdueDocs.map((doc, idx) => (
                      <tr
                        key={doc.docCode || idx}
                        onClick={() => router.push(doc.route)}
                        className="cursor-pointer transition-colors hover:bg-rose-50/40"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          <span className="inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 mr-1.5">
                            {doc.docType}
                          </span>
                          {doc.docCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {formatDate(doc.docDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[130px] truncate">
                          {doc.partyName}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-slate-800 whitespace-nowrap">
                          {doc.amount != null
                            ? `${Number(doc.amount).toLocaleString()} ฿`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">
                            ค้าง {doc.diffDays} วัน
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-sm text-slate-400"
                      >
                        ไม่มีเอกสารที่ค้างเกิน 3 วัน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
