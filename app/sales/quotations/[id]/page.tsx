"use client";

import { use } from "react";
import { customerApi, productApi } from "@/lib/api/masterdata";
import { quotationApi } from "@/lib/api/sales";
import type { Quotation, QuotationLine } from "@/types";
import DocumentDetail, {
  makeTable,
  type DocAction,
  type DocConfig,
} from "@/components/doc/DocumentDetail";
import DocEditModal from "@/components/doc/DocEditModal";
import { pricedColumns } from "@/components/doc/columns";
import { attachProducts } from "@/components/doc/enrich";
import { dateInputValue, fmtDateLong, fmtMoney } from "@/components/doc/docUtils";

const loadRefs = async () => {
  const [customers, products] = await Promise.all([
    customerApi.getCustomers(),
    productApi.getProducts(),
  ]);
  return {
    parties: customers.map((c) => ({ id: c.id, label: `${c.code} - ${c.name}` })),
    products,
  };
};

const config: DocConfig<Quotation> = {
  docName: "ใบเสนอราคา",
  listHref: "/sales/quotations",
  statusLabels: { pending: "ส่งแล้ว (รอตอบรับ)" },
  load: async (id) => {
    const doc = await quotationApi.getQuotationById(id);
    return { ...doc, line: await attachProducts<QuotationLine>(doc.line) };
  },
  view: (d) => ({
    no: d.qt_no,
    status: d.status,
    fields: [
      { label: "ลูกค้า", value: d.customer?.name ?? `ลูกค้า #${d.customer_id}` },
      { label: "วันที่", value: fmtDateLong(d.qt_date) },
      { label: "ใช้ได้ถึงวันที่", value: fmtDateLong(d.valid_until) },
    ],
    tables: [
      makeTable(d.line ?? [], pricedColumns, {
        title: "รายการสินค้า",
        empty: "ไม่มีรายการสินค้า",
      }),
    ],
    totals: [
      { label: "รวมเป็นเงิน", value: fmtMoney(d.subtotal_amount) },
      { label: "ภาษีมูลค่าเพิ่ม 7%", value: fmtMoney(d.vat_amount) },
      { label: "ยอดรวมทั้งสิ้น", value: fmtMoney(d.total_amount), strong: true },
    ],
    note: d.note,
    createdAt: d.created_at,
    signatures: ["ผู้เสนอราคา", "ลูกค้า (ผู้อนุมัติ)"],
  }),
  actions: (d) => {
    const list: DocAction[] = [];
    if (d.status === "draft") {
      list.push(
        {
          key: "submit",
          label: "ส่งให้ลูกค้า",
          tone: "warning",
          confirm: "ต้องการส่งใบเสนอราคานี้ให้ลูกค้าใช่หรือไม่?",
          run: () => quotationApi.submitQuotation(d.id),
        },
        {
          key: "approve",
          label: "อนุมัติ",
          tone: "success",
          confirm: "ต้องการอนุมัติใบเสนอราคานี้ใช่หรือไม่?",
          run: async () => {
            await quotationApi.submitQuotation(d.id);
            await quotationApi.approveQuotation(d.id);
          },
        },
      );
    }
    if (d.status === "pending") {
      list.push({
        key: "approve",
        label: "ลูกค้าตอบรับ (อนุมัติ)",
        tone: "success",
        confirm: "ลูกค้าตอบรับใบเสนอราคานี้แล้วใช่หรือไม่?",
        run: () => quotationApi.approveQuotation(d.id),
      });
    }
    if (d.status === "approved") {
      list.push({
        key: "to-so",
        label: "สร้างใบสั่งขาย",
        tone: "primary",
        href: `/sales/sales-orders?ref_qt=${d.id}`,
      });
    }
    return list;
  },
  edit: {
    allowed: (d) => d.status === "draft",
    render: (d, onClose, onSaved) => (
      <DocEditModal
        title={`แก้ไขใบเสนอราคา ${d.qt_no}`}
        mode="priced"
        dateLabel="วันที่"
        withValidUntil
        partyLabel="ลูกค้า"
        initial={{
          date: dateInputValue(d.qt_date),
          validUntil: dateInputValue(d.valid_until),
          partyId: String(d.customer_id),
          note: d.note ?? "",
          lines: (d.line ?? []).map((l) => ({
            product_id: String(l.product_id),
            qty: Number(l.qty),
            unit_price: Number(l.unit_price),
            note: "",
          })),
        }}
        loadRefs={loadRefs}
        priceOf={(p) => Number(p.sale_price)}
        onClose={onClose}
        onSave={async (r) => {
          await quotationApi.updateQuotation(d.id, {
            qt_date: new Date(r.date).toISOString(),
            valid_until: r.validUntil ? new Date(r.validUntil).toISOString() : undefined,
            customer_id: r.partyId,
            subtotal_amount: r.subtotal,
            vat_amount: r.vat,
            total_amount: r.total,
            note: r.note,
            lines: r.lines.map((l) => ({
              product_id: l.product_id,
              qty: l.qty,
              unit_price: l.unit_price,
              line_amount: l.line_amount,
            })),
          });
          onSaved();
        }}
      />
    ),
  },
  cancel: {
    allowed: (d) => d.status === "draft" || d.status === "pending",
    run: (d) => quotationApi.cancelQuotation(d.id),
    confirm: "ต้องการยกเลิกใบเสนอราคานี้ใช่หรือไม่?",
  },
};

export default function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DocumentDetail id={id} config={config} />;
}
