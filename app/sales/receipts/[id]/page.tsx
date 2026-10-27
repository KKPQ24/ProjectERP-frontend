"use client";

import { use } from "react";
import Link from "next/link";
import { receiptApi } from "@/lib/api/sales";
import type { Receipt, ReceiptAllocation } from "@/types";
import DocumentDetail, {
  makeTable,
  type DocAction,
  type DocConfig,
} from "@/components/doc/DocumentDetail";
import { fmtDateLong, fmtMoney, payMethodLabel } from "@/components/doc/docUtils";

const config: DocConfig<Receipt> = {
  docName: "ใบรับเงิน",
  listHref: "/sales/receipts",
  statusLabels: { posted: "บันทึกบัญชีแล้ว" },
  load: (id) => receiptApi.getReceiptById(id),
  view: (d) => ({
    no: d.receipt_no,
    status: d.status,
    fields: [
      { label: "ลูกค้า", value: d.customer?.name ?? `ลูกค้า #${d.customer_id}` },
      { label: "วันที่รับเงิน", value: fmtDateLong(d.receipt_date) },
      { label: "วิธีชำระเงิน", value: payMethodLabel[d.method] ?? d.method },
      {
        label: "บัญชีรับเงิน",
        value: d.account ? `${d.account.code} - ${d.account.name}` : `บัญชี #${d.cash_account_id}`,
      },
    ],
    tables: [
      makeTable<ReceiptAllocation>(
        d.receipt_allocation ?? [],
        [
          { header: "#", render: (_a, i) => i + 1 },
          {
            header: "ใบแจ้งหนี้ที่ตัดชำระ",
            render: (a) => (
              <Link href={`/sales/invoices/${a.invoice_id}`} className="text-brand-600 hover:underline">
                {a.invoice?.inv_no ?? `#${a.invoice_id}`}
              </Link>
            ),
          },
          { header: "จำนวนเงิน", align: "right", render: (a) => fmtMoney(a.amount) },
        ],
        { title: "การตัดชำระใบแจ้งหนี้", empty: "ไม่มีรายการตัดชำระ" },
      ),
    ],
    totals: [{ label: "ยอดรับชำระรวม", value: fmtMoney(d.amount), strong: true }],
    note: d.note,
    createdAt: d.created_at,
    signatures: ["ผู้รับเงิน", "ผู้จ่ายเงิน"],
  }),
  actions: (d) => {
    const list: DocAction[] = [];
    if (d.status === "draft") {
      list.push({
        key: "post",
        label: "บันทึกบัญชี",
        tone: "success",
        confirm: "คุณต้องการบันทึกบัญชีใบรับเงินนี้ใช่หรือไม่?",
        run: () => receiptApi.postReceipt(d.id),
      });
    }
    return list;
  },
};

export default function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DocumentDetail id={id} config={config} />;
}
