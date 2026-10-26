"use client";

import { use } from "react";
import Link from "next/link";
import { paymentApi } from "@/lib/api/purchasing";
import type { Payment, PaymentAllocation } from "@/types";
import DocumentDetail, {
  makeTable,
  type DocAction,
  type DocConfig,
} from "@/components/doc/DocumentDetail";
import { fmtDateLong, fmtMoney, payMethodLabel } from "@/components/doc/docUtils";

const config: DocConfig<Payment> = {
  docName: "ใบจ่ายเงิน",
  listHref: "/purchasing/payments",
  statusLabels: { posted: "บันทึกบัญชีแล้ว" },
  load: (id) => paymentApi.getPaymentById(id),
  view: (d) => ({
    no: d.payment_no,
    status: d.status,
    fields: [
      { label: "ผู้ขาย", value: d.supplier?.name ?? `ผู้ขาย #${d.supplier_id}` },
      { label: "วันที่จ่ายเงิน", value: fmtDateLong(d.payment_date) },
      { label: "วิธีชำระเงิน", value: payMethodLabel[d.method] ?? d.method },
      {
        label: "บัญชีจ่ายเงิน",
        value: d.account ? `${d.account.code} - ${d.account.name}` : `บัญชี #${d.cash_account_id}`,
      },
    ],
    tables: [
      makeTable<PaymentAllocation>(
        d.payment_allocation ?? [],
        [
          { header: "#", render: (_a, i) => i + 1 },
          {
            header: "ใบตั้งหนี้ที่ตัดชำระ",
            render: (a) => (
              <Link href={`/purchasing/bills/${a.bill_id}`} className="text-blue-600 hover:underline">
                {a.supplier_bill?.bill_no ?? `#${a.bill_id}`}
              </Link>
            ),
          },
          { header: "จำนวนเงิน", align: "right", render: (a) => fmtMoney(a.amount) },
        ],
        { title: "การตัดชำระใบตั้งหนี้", empty: "ไม่มีรายการตัดชำระ" },
      ),
    ],
    totals: [{ label: "ยอดจ่ายชำระรวม", value: fmtMoney(d.amount), strong: true }],
    note: d.note,
    createdAt: d.created_at,
    signatures: ["ผู้จ่ายเงิน", "ผู้รับเงิน"],
  }),
  actions: (d) => {
    const list: DocAction[] = [];
    if (d.status === "draft") {
      list.push({
        key: "post",
        label: "บันทึกบัญชี",
        tone: "success",
        confirm: "ต้องการบันทึกบัญชีใบจ่ายเงินนี้ใช่หรือไม่?",
        run: () => paymentApi.postPayment(d.id),
      });
    }
    return list;
  },
};

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DocumentDetail id={id} config={config} />;
}
