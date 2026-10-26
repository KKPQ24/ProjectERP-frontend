"use client";

import { use } from "react";
import Link from "next/link";
import { invoiceApi } from "@/lib/api/sales";
import type { Invoice, InvoiceLine } from "@/types";
import DocumentDetail, {
  makeTable,
  type DocAction,
  type DocConfig,
} from "@/components/doc/DocumentDetail";
import { pricedColumns } from "@/components/doc/columns";
import { attachProducts } from "@/components/doc/enrich";
import { fmtDateLong, fmtMoney } from "@/components/doc/docUtils";

const config: DocConfig<Invoice> = {
  docName: "ใบแจ้งหนี้",
  listHref: "/sales/invoices",
  statusLabels: { posted: "บันทึกบัญชีแล้ว" },
  load: async (id) => {
    const doc = await invoiceApi.getInvoiceById(id);
    return { ...doc, line: await attachProducts<InvoiceLine>(doc.line) };
  },
  view: (d) => ({
    no: d.inv_no,
    status: d.status,
    fields: [
      { label: "ลูกค้า", value: d.customer?.name ?? `ลูกค้า #${d.customer_id}` },
      { label: "วันที่", value: fmtDateLong(d.inv_date) },
      { label: "ครบกำหนดชำระ", value: fmtDateLong(d.due_date) },
      {
        label: "อ้างอิงใบสั่งขาย",
        value: d.so_id ? (
          <Link href={`/sales/sales-orders/${d.so_id}`} className="text-blue-600 hover:underline">
            {d.sales_order?.so_no ?? `#${d.so_id}`}
          </Link>
        ) : (
          "-"
        ),
      },
      {
        label: "อ้างอิงใบส่งของ",
        value: d.shipment_id ? (
          <Link href={`/sales/shipments/${d.shipment_id}`} className="text-blue-600 hover:underline">
            {d.shipment?.sh_no ?? `#${d.shipment_id}`}
          </Link>
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
    signatures: ["ผู้ออกเอกสาร", "ผู้รับเอกสาร"],
  }),
  actions: (d) => {
    const list: DocAction[] = [];
    if (d.status === "draft") {
      list.push({
        key: "post",
        label: "บันทึกบัญชี",
        tone: "success",
        confirm: "คุณต้องการบันทึกบัญชีใบแจ้งหนี้นี้ใช่หรือไม่?",
        run: () => invoiceApi.postInvoice(d.id),
      });
    }
    if (d.status === "posted") {
      list.push({
        key: "to-receipt",
        label: "สร้างใบรับเงิน",
        tone: "primary",
        href: `/sales/receipts?ref_inv=${d.id}`,
      });
    }
    return list;
  },
};

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DocumentDetail id={id} config={config} />;
}
