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
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold text-slate-800">
              Welcome to ERP Dashboard !!
            </h1>
            <p className="text-sm text-slate-500">Dashboard & Overview</p>
          </div>
          <span className="text-sm font-medium text-slate-600">
            {new Date().toLocaleDateString("th-TH", { dateStyle: "long" })}
          </span>
        </header>

        {/* KPI cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "ยอดขายรวม",
              value: `${todaySales.toLocaleString()} ฿`,
              note: "วันนี้ ",
              color: "bg-blue-500",
            },
            {
              label: "รออนุมัติ",
              value: `${allPendingItems.length} รายการ`,
              note: "PR, QT, PO, SO",
              color: "bg-amber-500",
            },
            {
              label: "สินค้าเหลือน้อย",
              value: `${lowStockProducts.length} รายการ`,
              note: "ถึงจุดสั่งซื้อซ้ำ",
              color: "bg-red-500",
            },
            {
              label: "ลูกค้าทั้งหมด",
              value: `${dashboardData.customers.length} ราย`,
              note: "วันนี้",
              color: "bg-emerald-500",
            },
          ].map((k) => (
            <div
              key={k.label}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 hover:shadow transition-shadow"
            >
              <div className={`w-1.5 self-stretch rounded-full ${k.color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-500">{k.label}</p>
                <p className="text-2xl font-bold text-slate-800 truncate">
                  {k.value}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{k.note}</p>
              </div>
            </div>
          ))}
        </section>

        {/* grid แยก row*/}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* เอกสารที่รออนุมัติ */}
          <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-800">
                  เอกสารที่รออนุมัติ
                </h2>
                <span className="text-xs text-slate-400">
                  (ใบขอซื้อ PR, ใบเสนอราคา QT, PO, SO)
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                {allPendingItems.length} รายการ
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs font-medium">
                  <tr>
                    <th className="px-4 py-3">ประเภท</th>
                    <th className="px-4 py-3">เลขที่เอกสาร</th>
                    <th className="px-4 py-3">วันที่</th>
                    <th className="px-4 py-3">ลูกค้า / ผู้ขาย</th>
                    <th className="px-4 py-3 text-right">ยอดรวม</th>
                    <th className="px-4 py-3 text-center">สถานะ</th>
                    <th className="px-4 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPendingItems.length > 0 ? (
                    allPendingItems.map((item, idx) => (
                      <tr
                        key={item.docCode || idx}
                        className="hover:bg-slate-50"
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
                            className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer"
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
          <section className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h2 className="font-semibold text-slate-800">
                สินค้าที่เหลือน้อย
              </h2>
              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                {lowStockProducts.length} รายการ
              </span>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-slate-500 text-xs font-medium">
                  <tr>
                    <th className="px-4 py-3">ชื่อสินค้า</th>
                    <th className="px-4 py-3 text-right">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockProducts.length > 0 ? (
                    lowStockProducts.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50">
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
          <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">เอกสารล่าสุด</h2>
              <span className="text-xs text-slate-400">10 รายการล่าสุด</span>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[280px]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs font-medium sticky top-0 z-10 shadow-sm">
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
                        className="hover:bg-slate-50 cursor-pointer"
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
          <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-800">เอกสารที่ค้าง</h2>
                <span className="text-xs text-rose-500 font-medium bg-rose-50 px-2 py-0.5 rounded-full">
                  ค้างเกิน 3 วัน
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {overdueDocs.length} รายการ
              </span>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[280px] flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-xs font-medium sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 bg-slate-50 min-w-[160px] whitespace-nowrap">
                      เลขที่เอกสาร
                    </th>
                    <th className="px-4 py-3 bg-slate-50 whitespace-nowrap">
                      วันที่
                    </th>
                    <th className="px-4 py-3 bg-slate-50 whitespace-nowrap">
                      ลูกค้า / ผู้ขาย
                    </th>
                    <th className="px-4 py-3 text-center bg-slate-50 whitespace-nowrap">
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
                        className="hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-800 whitespace-nowrap">
                          <span className="inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 mr-1.5">
                            {doc.docType}
                          </span>
                          {doc.docCode}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {formatDate(doc.docDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate whitespace-nowrap">
                          {doc.partyName}
                        </td>
                        <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium whitespace-nowrap">
                            {doc.diffDays} วัน
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-10 text-center text-sm text-slate-400 whitespace-nowrap"
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
