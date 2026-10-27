"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { canAccessPath, fetchIfAllowed } from "@/lib/access";
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
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const canViewSales = canAccessPath("/sales/sales-orders", roles) || canAccessPath("/sales/invoices", roles);
  const canViewOrders = canAccessPath("/sales/quotations", roles) || canAccessPath("/purchasing/purchase-requisitions", roles);
  const [loading, setLoading] = useState(true);
  const [failedRequests, setFailedRequests] = useState(0);

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
    if (!user) return;

    async function fetchAllDashboardData() {
      try {
        const results = await Promise.allSettled([
          productApi.getProducts(),
          customerApi.getCustomers(),
          supplierApi.getSuppliers(),
          fetchIfAllowed("/sales/quotations", user?.roles ?? [], () => quotationApi.getQuotations()),
          fetchIfAllowed("/sales/sales-orders", user?.roles ?? [], () => salesOrderApi.getSalesOrders()),
          fetchIfAllowed("/sales/shipments", user?.roles ?? [], () => shipmentApi.getShipments()),
          fetchIfAllowed("/sales/invoices", user?.roles ?? [], () => invoiceApi.getInvoices()),
          fetchIfAllowed("/sales/receipts", user?.roles ?? [], () => receiptApi.getReceipts()),
          fetchIfAllowed("/purchasing/purchase-requisitions", user?.roles ?? [], () => purchaseRequisitionApi.getPRs()),
          fetchIfAllowed("/purchasing/purchase-orders", user?.roles ?? [], () => purchaseOrderApi.getPOs()),
          fetchIfAllowed("/purchasing/goods-receipts", user?.roles ?? [], () => goodsReceiptApi.getGoodsReceipts()),
          fetchIfAllowed("/purchasing/bills", user?.roles ?? [], () => supplierBillApi.getBills()),
          fetchIfAllowed("/purchasing/payments", user?.roles ?? [], () => paymentApi.getPayments()),
        ]);

        const val = (r: PromiseSettledResult<any>) =>
          r.status === "fulfilled" && Array.isArray(r.value) ? r.value : [];

        setFailedRequests(results.filter((result) => result.status === "rejected").length);
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
        setFailedRequests(13);
      } finally {
        setLoading(false);
      }
    }

    fetchAllDashboardData();
  }, [user]);

  // ทำสถานะ
  const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    approved: { label: "อนุมัติแล้ว", cls: "bg-emerald-100 text-emerald-800" },
    pending: { label: "รออนุมัติ", cls: "bg-amber-100 text-amber-800" },
    waiting: { label: "รออนุมัติ", cls: "bg-amber-100 text-amber-800" },
    draft: { label: "แบบร่าง", cls: "bg-slate-100 text-slate-700" },
    posted: { label: "ผ่านรายการ", cls: "bg-brand-100 text-brand-800" },
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
      <span className={`inline-flex whitespace-nowrap text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
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
      id: item.id,
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
    <div className="space-y-7">
      <div className="space-y-7">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">พื้นที่ทำงาน / ภาพรวม</p>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">ภาพรวมธุรกิจ</h1>
            <p className="mt-2 text-sm text-slate-500">ติดตามงาน เอกสาร และข้อมูลสำคัญในแต่ละวัน</p>
          </div>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString("th-TH", { dateStyle: "long" })}</p>
        </header>

        {loading && <p role="status" className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">กำลังโหลดข้อมูลภาพรวม...</p>}
        {!loading && failedRequests > 0 && <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{failedRequests === 13 ? "ไม่สามารถโหลดข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อแล้วรีเฟรชหน้า" : "ข้อมูลบางส่วนยังโหลดไม่สำเร็จ ตัวเลขและรายการอาจไม่ครบ กรุณารีเฟรชเพื่อลองอีกครั้ง"}</p>}

        <section aria-label="ข้อมูลสรุป" className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white xl:grid-cols-4">
          {[
            { label: "ยอดขายวันนี้", value: canViewSales ? todaySales.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—", unit: "บาท", note: "ยอดรวมตามเอกสารวันนี้" },
            { label: "เอกสารรออนุมัติ", value: canViewOrders ? allPendingItems.length : "—", unit: "รายการ", note: "ใบขอซื้อ · ใบเสนอราคา · ใบสั่งซื้อ · ใบสั่งขาย" },
            { label: "สินค้าเหลือน้อย", value: lowStockProducts.length, unit: "รายการ", note: "ถึงจุดสั่งซื้อซ้ำ" },
            { label: "ลูกค้าในระบบ", value: dashboardData.customers.length, unit: "ราย", note: "ข้อมูลลูกค้าทั้งหมด" },
          ].map((item, index) => (
            <div key={item.label} className={`min-w-0 px-5 py-6 sm:px-6 ${index % 2 === 1 ? "border-l border-slate-200" : ""} ${index > 1 ? "border-t border-slate-200 xl:border-t-0 xl:border-l" : ""}`}>
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-3xl">{loading || failedRequests > 0 ? "—" : item.value}<span className="text-xs font-normal tracking-normal text-slate-500">{item.unit}</span></p>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">{item.note}</p>
            </div>
          ))}
        </section>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-slate-200 pb-5">
          <span className="text-xs font-medium text-slate-500">เริ่มทำงาน</span>
          {canAccessPath("/sales/quotations", roles) && <Link href="/sales/quotations" className="text-sm font-medium text-brand-700 hover:underline">ใบเสนอราคา <span aria-hidden="true">↗</span></Link>}
          {canAccessPath("/purchasing/purchase-requisitions", roles) && <Link href="/purchasing/purchase-requisitions" className="text-sm font-medium text-brand-700 hover:underline">ใบขอซื้อ <span aria-hidden="true">↗</span></Link>}
          <Link href="/masterdata/products" className="text-sm font-medium text-brand-700 hover:underline">ข้อมูลสินค้า <span aria-hidden="true">↗</span></Link>
        </div>
        {/* grid แยก row*/}
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-12">
          {/* เอกสารที่รออนุมัติ */}
          {canViewOrders && <section className="erp-panel erp-dashboard-panel flex min-w-0 flex-col lg:col-span-12 min-[87.5rem]:col-span-8">
            <div className="erp-panel-heading shrink-0">
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-800">
                  เอกสารที่รออนุมัติ
                </h2>
              </div>
              <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200/70">
                {allPendingItems.length} รายการ
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-3">เลขที่เอกสาร</th>
                    <th className="px-4 py-3">ลูกค้า / ผู้ขาย</th>
                    <th className="px-4 py-3 text-right">ยอดรวม</th>
                    <th className="px-4 py-3 text-center">สถานะ</th>
                    <th className="px-4 py-3"><span className="sr-only">จัดการ</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allPendingItems.length > 0 ? allPendingItems.map((item) => (
                    <tr key={`${item.docType}-${item.id}`}>
                      <td className="px-4 py-3">
                        <Link href={`${item.route}/${item.id}`} className="whitespace-nowrap text-sm font-medium text-brand-700 hover:underline">{item.docCode}</Link>
                        <p className="mt-1 text-[11px] text-slate-500">{item.docTypeName}</p>
                      </td>
                      <td className="max-w-[150px] truncate px-4 py-3 text-sm text-slate-600">{item.partyName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium">{item.amount != null ? `${Number(item.amount).toLocaleString()} ฿` : "-"}</td>
                      <td className="px-4 py-3 text-center">{renderStatus(item.status)}</td>
                      <td className="px-4 py-3 text-right"><Link href={`${item.route}/${item.id}`} className="inline-flex min-h-9 items-center whitespace-nowrap rounded-md bg-brand-50 px-3 text-xs font-medium text-brand-700 hover:bg-brand-100">ตรวจสอบ</Link></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">{loading ? "กำลังโหลดเอกสาร..." : failedRequests > 0 ? "ข้อมูลเอกสารยังไม่ครบ" : "ไม่มีเอกสารที่รออนุมัติ"}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>}

          {/* สินค้าที่เหลือน้อย */}
          <section className={`erp-panel erp-dashboard-panel flex min-w-0 flex-col lg:col-span-12 ${canViewOrders ? "min-[87.5rem]:col-span-4" : ""}`}>
            <div className="erp-panel-heading shrink-0">
              <h2 className="font-semibold text-slate-800">
                สินค้าที่เหลือน้อย
              </h2>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200/70">
                {lowStockProducts.length} รายการ
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
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
                          <p className="text-xs text-slate-500">
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
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        {loading ? "กำลังโหลดสินค้า..." : failedRequests > 0 ? "ข้อมูลสินค้ายังไม่ครบ" : "ไม่มีสินค้าที่ถึงจุดสั่งซื้อซ้ำ"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          {/* เอกสารล่าสุด 10 ราบการ */}
          <section className="erp-panel flex min-w-0 flex-col lg:col-span-12">
            <div className="erp-panel-heading">
              <h2 className="font-semibold text-slate-800">เอกสารล่าสุด</h2>
              <span className="text-xs text-slate-500">10 รายการล่าสุด</span>
            </div>

            <div className="max-h-[440px] overflow-auto">
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
                        className="transition-colors hover:bg-brand-50/40"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          <span className="inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 mr-1.5">
                            {doc.docType}
                          </span>
                          <Link href={`${doc.route}/${doc.id}`} className="text-brand-700 underline-offset-4 hover:underline">{doc.docCode}</Link>
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
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        {loading ? "กำลังโหลดเอกสาร..." : failedRequests > 0 ? "ข้อมูลเอกสารยังไม่ครบ" : "ยังไม่มีเอกสารในระบบ"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* เอกสารที่ค้าง (ค้างเกิน 3 วัน) */}
          {canViewOrders && <section className="erp-panel flex min-w-0 flex-col lg:col-span-12">
            <div className="erp-panel-heading">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-slate-800">เอกสารที่ค้าง</h2>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                  ค้างเกิน 3 วัน
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {overdueDocs.length} รายการ
              </span>
            </div>
            <div className="max-h-[440px] flex-1 overflow-auto">
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
                        className="transition-colors hover:bg-rose-50/40"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">
                          <span className="inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 mr-1.5">
                            {doc.docType}
                          </span>
                          <Link href={`${doc.route}/${doc.id}`} className="text-brand-700 underline-offset-4 hover:underline">{doc.docCode}</Link>
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
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        {loading ? "กำลังโหลดเอกสาร..." : failedRequests > 0 ? "ข้อมูลเอกสารยังไม่ครบ" : "ไม่มีเอกสารที่ค้างเกิน 3 วัน"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>}
        </div>
      </div>
    </div>
  );
}
