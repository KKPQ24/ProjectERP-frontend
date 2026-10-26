import type { DocColumn } from "./DocumentDetail";
import { fmtMoney, fmtQty } from "./docUtils";

/** รายการสินค้า/บริการที่มีราคา (ใบเสนอราคา ใบสั่งขาย ใบสั่งซื้อ ใบแจ้งหนี้ ใบตั้งหนี้) */
export interface PricedLine {
  product_id?: number | null;
  product?: { sku: string; name: string } | null;
  account?: { code: string; name: string } | null;
  description?: string | null;
  qty: number | string;
  unit_price: number | string;
  line_amount: number | string;
}

/** รายการสินค้าอย่างเดียว (จำนวน) เช่น ใบส่งของ ใบรับของ ใบขอซื้อ */
export interface QtyLine {
  product_id: number;
  product?: { sku: string; name: string } | null;
  qty: number | string;
}

export function itemText(l: {
  product_id?: number | null;
  product?: { sku: string; name: string } | null;
  account?: { code: string; name: string } | null;
  description?: string | null;
}): string {
  if (l.product) return `${l.product.sku} - ${l.product.name}`;
  const extra = l.description || (l.account ? `${l.account.code} ${l.account.name}` : "");
  if (extra) return extra;
  return l.product_id ? `สินค้า #${l.product_id}` : "-";
}

export const pricedColumns: DocColumn<PricedLine>[] = [
  { header: "#", render: (_l, i) => i + 1 },
  { header: "รายการ", render: (l) => itemText(l) },
  { header: "จำนวน", align: "right", render: (l) => fmtQty(l.qty) },
  { header: "ราคา/หน่วย", align: "right", render: (l) => fmtMoney(l.unit_price) },
  { header: "จำนวนเงิน", align: "right", render: (l) => fmtMoney(l.line_amount) },
];

export const qtyColumns: DocColumn<QtyLine>[] = [
  { header: "#", render: (_l, i) => i + 1 },
  { header: "สินค้า", render: (l) => itemText(l) },
  { header: "จำนวน", align: "right", render: (l) => fmtQty(l.qty) },
];
