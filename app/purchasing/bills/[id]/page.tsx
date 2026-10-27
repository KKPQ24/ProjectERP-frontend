"use client";

import { use } from "react";
import AccessLink from "@/components/AccessLink";
import { supplierBillApi } from "@/lib/api/purchasing";
import type { SupplierBill, SupplierBillLine } from "@/types";
import DocumentDetail, {
  makeTable,
  type DocAction,
  type DocConfig,
} from "@/components/doc/DocumentDetail";
import { pricedColumns } from "@/components/doc/columns";
import { attachProducts } from "@/components/doc/enrich";
import { fmtDateLong, fmtMoney } from "@/components/doc/docUtils";

const config: DocConfig<SupplierBill> = {
  docName: "ใบตั้งหนี้",
  listHref: "/purchasing/bills",
  statusLabels: { posted: "บันทึกบัญชีแล้ว" },
  load: async (id) => {
    const doc = await supplierBillApi.getBillById(id);
    return { ...doc, line: await attachProducts<SupplierBillLine>(doc.line) };
  },
  view: (d) => ({
    no: d.bill_no,
    status: d.status,
    fields: [
      { label: "ผู้ขาย", value: d.supplier?.name ?? `ผู้ขาย #${d.supplier_id}` },
      { label: "เลขที่เอกสารของผู้ขาย", value: d.supplier_ref || "-" },
      { label: "วันที่", value: fmtDateLong(d.bill_date) },
      { label: "ครบกำหนดชำระ", value: fmtDateLong(d.due_date) },
      {
        label: "อ้างอิงใบสั่งซื้อ",
        value: d.po_id ? (
          <AccessLink
            href={`/purchasing/purchase-orders/${d.po_id}`}
            className="text-brand-600 hover:underline"
          >
            {d.purchase_order?.po_no ?? `#${d.po_id}`}
          </AccessLink>
        ) : (
          "-"
        ),
      },
      {
        label: "อ้างอิงใบรับของ",
        value: d.gr_id ? (
          <AccessLink
            href={`/purchasing/goods-receipts/${d.gr_id}`}
            className="text-brand-600 hover:underline"
          >
            {d.goods_receipt?.gr_no ?? `#${d.gr_id}`}
          </AccessLink>
        ) : (
          "-"
        ),
      },
    ],
    tables: [makeTable(d.line ?? [], pricedColumns, { title: "รายการ", empty: "ไม่มีรายการ" })],
    totals: [
      { label: "รวมเป็นเงิน", value: fmtMoney(d.subtotal_amount) },
      { label: "ภาษีมูลค่าเพิ่ม 7%", value: fmtMoney(d.vat_amount) },
      { label: "ยอดรวมทั้งสิ้น", value: fmtMoney(d.total_amount), strong: true },
    ],
    createdAt: d.created_at,
    signatures: ["ผู้บันทึก", "ผู้อนุมัติ"],
  }),
  actions: (d) => {
    const list: DocAction[] = [];
    if (d.status === "draft") {
      list.push({
        key: "post",
        label: "บันทึกบัญชี",
        tone: "success",
        confirm: "ต้องการบันทึกบัญชีใบตั้งหนี้นี้ใช่หรือไม่?",
        run: () => supplierBillApi.postBill(d.id),
      });
    }
    if (d.status === "posted") {
      list.push({
        key: "to-payment",
        label: "สร้างใบจ่ายเงิน",
        tone: "primary",
        href: `/purchasing/payments?ref_bill=${d.id}`,
      });
    }
    return list;
  },
};

export default function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DocumentDetail id={id} config={config} />;
}
