"use client";

import { useEffect, useState, type FormEvent } from "react";
import AccessLink from "@/components/AccessLink";
import { historyApi } from "@/lib/api/history";
import { ApiError } from "@/lib/api/client";
import type { AuditLogEntry, HistoryPage, StockMovement } from "@/types";

type HistoryData =
  | { kind: "stock"; result: HistoryPage<StockMovement> }
  | { kind: "audit"; result: HistoryPage<AuditLogEntry> };

const actions: Record<string, string> = {
  CREATE: "สร้าง", UPDATE: "แก้ไข", DEACTIVATE: "ปิดใช้งาน", SUBMIT: "ส่งเอกสาร",
  APPROVE: "อนุมัติ", POST: "ผ่านรายการ", CANCEL: "ยกเลิก", VOID: "โมฆะ",
};
const entities: Record<string, string> = {
  unit: "หน่วยนับ", customer: "ลูกค้า", supplier: "ผู้ขาย", product: "สินค้า",
  product_category: "หมวดหมู่", account: "บัญชี", app_user: "ผู้ใช้งาน",
  quotation: "ใบเสนอราคา", sales_order: "ใบสั่งขาย", shipment: "ใบส่งของ",
  invoice: "ใบแจ้งหนี้", receipt: "ใบรับเงิน", purchase_requisition: "ใบขอซื้อ",
  purchase_order: "ใบสั่งซื้อ", goods_receipt: "ใบรับของ", supplier_bill: "ใบตั้งหนี้", payment: "ใบจ่ายเงิน",
};
const documentRoutes: Record<string, string> = {
  quotation: "/sales/quotations", sales_order: "/sales/sales-orders", shipment: "/sales/shipments",
  invoice: "/sales/invoices", receipt: "/sales/receipts", purchase_requisition: "/purchasing/purchase-requisitions",
  purchase_order: "/purchasing/purchase-orders", goods_receipt: "/purchasing/goods-receipts", supplier_bill: "/purchasing/bills", payment: "/purchasing/payments",
};
const th = "whitespace-nowrap px-5 py-3 text-left text-xs font-medium text-slate-500";
const td = "whitespace-nowrap px-5 py-4 text-sm";
const control = "min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100";

function dateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" });
}
function quantity(value: number | string) {
  return Number(value).toLocaleString("th-TH", { maximumFractionDigits: 4 });
}

export default function HistoryView({ kind }: { kind: "stock" | "audit" }) {
  const title = kind === "stock" ? "Stock Movement" : "Audit Log";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState({ page: 1, search: "", filter: "" });
  const [refresh, setRefresh] = useState(0);
  const requestKey = JSON.stringify([kind, query, refresh]);
  const [state, setState] = useState<{ key: string; data: HistoryData | null; error: string }>({ key: "", data: null, error: "" });
  const loading = state.key !== requestKey;
  const data = loading ? null : state.data;
  const error = loading ? "" : state.error;
  const totalPages = data ? Math.max(1, Math.ceil(data.result.total / data.result.limit)) : 1;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const params = { page: query.page, limit: 25, search: query.search || undefined };
        const response: HistoryData = kind === "stock"
          ? { kind, result: await historyApi.getStockMovements({ ...params, ref_type: query.filter || undefined }, controller.signal) }
          : { kind, result: await historyApi.getAuditLogs({ ...params, action: query.filter || undefined }, controller.signal) };
        const result = response.result;
        if (!Array.isArray(result.items) || !Number.isSafeInteger(result.total) || result.total < 0 || !Number.isSafeInteger(result.limit) || result.limit < 1) {
          throw new Error("รูปแบบข้อมูลประวัติไม่ถูกต้อง");
        }
        if (!active) return;
        const lastPage = Math.max(1, Math.ceil(result.total / result.limit));
        if (query.page > lastPage) {
          setQuery(previous => ({ ...previous, page: lastPage }));
          return;
        }
        setState({ key: requestKey, data: response, error: "" });
      } catch (err) {
        if (!active) return;
        const message = err instanceof ApiError && err.status === 404
          ? "หน้านี้ยังไม่พร้อมใช้งาน กรุณาอัปเดตระบบแล้วลองอีกครั้ง"
          : err instanceof Error ? err.message : "โหลดประวัติไม่สำเร็จ";
        setState({ key: requestKey, data: null, error: message });
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [kind, query, refresh, requestKey]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setQuery({ page: 1, search: search.trim(), filter });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{kind === "stock" ? "ประวัติสินค้าเข้า–ออกและยอดคงเหลือ" : "ประวัติการทำรายการของผู้ใช้งาน"}</p>
        </div>
        <button type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)} className={`${control} hover:bg-slate-50 disabled:opacity-50`}>รีเฟรช</button>
      </header>

      <form onSubmit={submit} className="flex flex-wrap items-center gap-3" aria-label={`ค้นหา ${title}`}>
        <label htmlFor="history-search" className="sr-only">ค้นหา {title}</label>
        <input id="history-search" type="search" maxLength={100} value={search} onChange={event => setSearch(event.target.value)} placeholder={kind === "stock" ? "เลขที่เอกสาร / รหัสหรือชื่อสินค้า" : "ค้นหาผู้ใช้งาน"} className={`${control} w-full sm:max-w-sm`} />
        <label htmlFor="history-filter" className="sr-only">{kind === "stock" ? "ประเภทการเคลื่อนไหว" : "การทำรายการ"}</label>
        <select id="history-filter" value={filter} onChange={event => setFilter(event.target.value)} className={`${control} flex-1 sm:flex-none`}>
          <option value="">ทั้งหมด</option>
          {kind === "stock" ? <><option value="goods_receipt">รับสินค้าเข้า</option><option value="shipment">จ่ายสินค้าออก</option></> : Object.entries(actions).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <button type="submit" disabled={loading} className="min-h-10 rounded-md bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50">ค้นหา</button>
      </form>

      {loading ? <div role="status" className="erp-panel p-8 text-center text-sm text-slate-500">กำลังโหลดประวัติ...</div> : error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div> : data && (
        <div className="erp-panel">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left tabular-nums">
              <thead className="border-b border-slate-200 bg-slate-50"><tr>
                {(kind === "stock" ? ["วันที่", "สินค้า", "เอกสารอ้างอิง", "รับเข้า", "จ่ายออก", "คงเหลือ", "ต้นทุน/หน่วย", "ผู้ทำรายการ"] : ["วันที่", "ผู้ใช้งาน", "การทำรายการ", "ประเภท", "รหัสรายการ", "รายละเอียด"]).map((label, index) => <th key={label} scope="col" className={kind === "stock" && index >= 3 && index <= 6 ? th.replace("text-left", "text-right") : th}>{label}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.kind === "stock" && data.result.items.map(item => (
                  <tr key={item.id}>
                    <td className={td}>{dateTime(item.moved_at)}</td>
                    <td className={td}><p className="font-medium text-slate-900">{item.product.name}</p><p className="mt-1 text-xs text-slate-500">{item.product.sku}</p></td>
                    <td className={td}>{documentRoutes[item.ref_type] ? <AccessLink href={`${documentRoutes[item.ref_type]}/${item.ref_id}`} className="text-brand-700 hover:underline">{item.ref_no}</AccessLink> : item.ref_no}</td>
                    <td className={`${td} text-right text-emerald-700`}>{Number(item.qty_change) > 0 ? quantity(item.qty_change) : "—"}</td>
                    <td className={`${td} text-right text-red-700`}>{Number(item.qty_change) < 0 ? quantity(Math.abs(Number(item.qty_change))) : "—"}</td>
                    <td className={`${td} text-right font-medium`}>{quantity(item.balance_qty)} <span className="text-xs font-normal text-slate-500">{item.product.unit.name}</span></td>
                    <td className={`${td} text-right`}>{quantity(item.unit_cost)}</td>
                    <td className={td}>{item.app_user.full_name || item.app_user.username}</td>
                  </tr>
                ))}
                {data.kind === "audit" && data.result.items.map(item => (
                  <tr key={item.id}>
                    <td className={td}>{dateTime(item.created_at)}</td>
                    <td className={td}>{item.app_user?.full_name || item.app_user?.username || (item.user_id ? `#${item.user_id}` : "ระบบ")}</td>
                    <td className={td}><span className="rounded bg-brand-50 px-2 py-1 text-xs font-medium text-brand-800">{actions[item.action] || item.action}</span></td>
                    <td className={td}>{entities[item.entity] || item.entity}</td>
                    <td className={td}>{item.entity_id && documentRoutes[item.entity] ? <AccessLink href={`${documentRoutes[item.entity]}/${item.entity_id}`} className="text-brand-700 hover:underline">#{item.entity_id}</AccessLink> : item.entity_id ?? "—"}</td>
                    <td className={td}>{item.diff ? <details><summary className="cursor-pointer text-brand-700">ดูรายละเอียด</summary><pre className="mt-3 max-h-64 max-w-md overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs">{JSON.stringify(item.diff, null, 2)}</pre></details> : "—"}</td>
                  </tr>
                ))}
                {data.result.items.length === 0 && <tr><td colSpan={kind === "stock" ? 8 : 6} className="px-5 py-12 text-center text-sm text-slate-500">{kind === "stock" ? "ไม่พบรายการเคลื่อนไหว" : "ไม่พบประวัติการใช้งาน"}</td></tr>}
              </tbody>
            </table>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
            <span role="status">{data.result.total.toLocaleString("th-TH")} รายการ · หน้า {query.page} / {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={query.page <= 1} onClick={() => setQuery(previous => ({ ...previous, page: previous.page - 1 }))} className="min-h-9 rounded-md border border-slate-200 px-3 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">ก่อนหน้า</button>
              <button type="button" disabled={query.page >= totalPages} onClick={() => setQuery(previous => ({ ...previous, page: previous.page + 1 }))} className="min-h-9 rounded-md border border-slate-200 px-3 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">ถัดไป</button>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
