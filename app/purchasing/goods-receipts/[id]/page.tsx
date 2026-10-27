"use client";

import { use } from "react";
import Link from "next/link";
import { goodsReceiptApi } from "@/lib/api/purchasing";
import type { GoodsReceipt, GoodsReceiptLine } from "@/types";
import DocumentDetail, {
  makeTable,
  type DocAction,
  type DocColumn,
  type DocConfig,
} from "@/components/doc/DocumentDetail";
import { itemText } from "@/components/doc/columns";
import { attachProducts } from "@/components/doc/enrich";
import { fmtDateLong, fmtMoney, fmtQty } from "@/components/doc/docUtils";

const columns: DocColumn<GoodsReceiptLine>[] = [
  { header: "#", render: (_l, i) => i + 1 },
  { header: "สินค้า", render: (l) => itemText(l) },
  { header: "จำนวนที่รับ", align: "right", render: (l) => fmtQty(l.qty) },
  { header: "ต้นทุน/หน่วย", align: "right", render: (l) => fmtMoney(l.unit_cost) },
  {
    header: "จำนวนเงิน",
    align: "right",
    render: (l) => fmtMoney(Number(l.qty) * Number(l.unit_cost)),
  },
];

const config: DocConfig<GoodsReceipt> = {
  docName: "ใบรับของ",
  listHref: "/purchasing/goods-receipts",
  statusLabels: { posted: "บันทึกสต๊อกแล้ว" },
  load: async (id) => {
    const doc = await goodsReceiptApi.getGoodsReceiptById(id);
    return { ...doc, line: await attachProducts<GoodsReceiptLine>(doc.line) };
  },
  view: (d) => {
    const total = (d.line ?? []).reduce((sum, l) => sum + Number(l.qty) * Number(l.unit_cost), 0);
    return {
      no: d.gr_no,
      status: d.status,
      fields: [
        { label: "ผู้ขาย", value: d.supplier?.name ?? `ผู้ขาย #${d.supplier_id}` },
        { label: "วันที่รับของ", value: fmtDateLong(d.gr_date) },
        {
          label: "อ้างอิงใบสั่งซื้อ",
          value: d.po_id ? (
            <Link
              href={`/purchasing/purchase-orders/${d.po_id}`}
              className="text-brand-600 hover:underline"
            >
              {d.purchase_order?.po_no ?? `#${d.po_id}`}
            </Link>
          ) : (
            "-"
          ),
        },
      ],
      tables: [makeTable(d.line ?? [], columns, { title: "รายการสินค้าที่รับ", empty: "ไม่มีรายการสินค้า" })],
      totals: [{ label: "มูลค่าสินค้ารวม", value: fmtMoney(total), strong: true }],
      note: d.note,
      createdAt: d.created_at,
      signatures: ["ผู้รับสินค้า", "ผู้ตรวจสอบ"],
    };
  },
  actions: (d) => {
    const list: DocAction[] = [];
    if (d.status === "draft") {
      list.push({
        key: "post",
        label: "บันทึกบัญชี / เข้าสต๊อก",
        tone: "success",
        confirm: "ต้องการบันทึกบัญชีและนำสินค้าเข้าสต๊อกใช่หรือไม่?",
        run: () => goodsReceiptApi.postGoodsReceipt(d.id),
      });
    }
    if (d.status === "posted") {
      list.push({
        key: "to-bill",
        label: "สร้างใบตั้งหนี้",
        tone: "primary",
        href: `/purchasing/bills?ref_gr=${d.id}`,
      });
    }
    return list;
  },
};

export default function GoodsReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DocumentDetail id={id} config={config} />;
}
