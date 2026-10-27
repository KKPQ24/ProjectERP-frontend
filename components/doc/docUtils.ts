// ฟังก์ชันช่วยเรื่องการแสดงผลเอกสาร (สถานะ วันที่ เงิน) ใช้ร่วมกันทุกหน้า

export interface StatusMeta {
  label: string;
  cls: string;
}

const BASE_STATUS: Record<string, StatusMeta> = {
  draft: { label: "ร่าง", cls: "bg-slate-100 text-slate-700" },
  pending: { label: "รอดำเนินการ", cls: "bg-amber-50 text-amber-800" },
  approved: { label: "อนุมัติแล้ว", cls: "bg-emerald-50 text-emerald-800" },
  posted: { label: "บันทึกแล้ว", cls: "bg-emerald-50 text-emerald-800" },
  cancelled: { label: "ยกเลิกแล้ว", cls: "bg-red-50 text-red-700" },
  voided: { label: "ยกเลิกแล้ว", cls: "bg-red-50 text-red-700" },
};

/** ชื่อสถานะภาษาไทย (overrides ใช้เปลี่ยนคำเฉพาะเอกสาร เช่น posted = "บันทึกบัญชีแล้ว") */
export function statusMeta(
  status: string,
  overrides?: Record<string, string>,
): StatusMeta {
  const base = BASE_STATUS[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-700",
  };
  return overrides?.[status] ? { ...base, label: overrides[status] } : base;
}

export const statusLabel = (status: string) => statusMeta(status).label;

export function fmtMoney(v: number | string | null | undefined): string {
  return Number(v ?? 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
  });
}

export function fmtQty(v: number | string | null | undefined): string {
  return Number(v ?? 0).toLocaleString("th-TH");
}

/** 11 สิงหาคม 2569 */
export function fmtDateLong(v?: string | null): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 11/8/2569 (ใช้ตอนค้นหา) */
export function fmtDateShort(v?: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("th-TH");
}

/** แปลงวันที่จาก API เป็นค่าสำหรับ <input type="date"> (YYYY-MM-DD) */
export function dateInputValue(v?: string | null): string {
  if (!v) return "";
  return v.slice(0, 10);
}

export const payMethodLabel: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนเงิน",
  cheque: "เช็ค",
  other: "อื่นๆ",
};
