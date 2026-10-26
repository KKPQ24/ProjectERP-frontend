"use client";

import { use } from "react";
import Link from "next/link";
import { customerApi, productApi } from "@/lib/api/masterdata";
import { salesOrderApi } from "@/lib/api/sales";
import type { SalesOrder, SalesOrderLine } from "@/types";
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

const config: DocConfig<SalesOrder> = {
  docName: "ใบสั่งขาย",
  listHref: "/sales/sales-orders",
  load: async (id) => {
    const doc = await salesOrderApi.getSalesOrderById(id);
    return { ...doc, line: await attachProducts<SalesOrderLine>(doc.line) };
  },
  view: (d) => ({
    no: d.so_no,
    status: d.status,
    fields: [
      { label: "ลูกค้า", value: d.customer?.name ?? `ลูกค้า #${d.customer_id}` },
      { label: "วันที่", value: fmtDateLong(d.so_date) },
      {
        label: "อ้างอิงใบเสนอราคา",
        value: d.qt_id ? (
          <Link
            href={`/sales/quotations/${d.qt_id}`}
            className="text-blue-600 hover:underline"
          >
            {d.quotation?.qt_no ?? `#${d.qt_id}`}
          </Link>
        ) : (
          "-"
        ),
      },
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
    signatures: ["ผู้จัดทำ", "ผู้อนุมัติ"],
  }),
  actions: (d) => {
    const list: DocAction[] = [];
    if (d.status === "draft") {
      list.push({
        key: "approve",
        label: "อนุมัติ",
        tone: "success",
        confirm: "ต้องการอนุมัติใบสั่งขายนี้ใช่หรือไม่?",
        run: () => salesOrderApi.approveSalesOrder(d.id),
      });
    }
    if (d.status === "approved") {
      list.push({
        key: "to-shipment",
        label: "สร้างใบส่งของ",
        tone: "primary",
        href: `/sales/shipments?ref_so=${d.id}`,
      });
    }
    return list;
  },
  edit: {
    allowed: (d) => d.status === "draft",
    render: (d, onClose, onSaved) => (
      <DocEditModal
        title={`แก้ไขใบสั่งขาย ${d.so_no}`}
        mode="priced"
        dateLabel="วันที่"
        partyLabel="ลูกค้า"
        initial={{
          date: dateInputValue(d.so_date),
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
          await salesOrderApi.updateSalesOrder(d.id, {
            so_date: new Date(r.date).toISOString(),
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
    allowed: (d) => d.status === "draft",
    run: (d) => salesOrderApi.cancelSalesOrder(d.id),
    confirm: "ต้องการยกเลิกใบสั่งขายนี้ใช่หรือไม่?",
  },
};

export default function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DocumentDetail id={id} config={config} />;
}
