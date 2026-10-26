"use client";

import { use } from "react";
import Link from "next/link";
import { productApi, supplierApi } from "@/lib/api/masterdata";
import { purchaseOrderApi } from "@/lib/api/purchasing";
import type { PurchaseOrder, PurchaseOrderLine } from "@/types";
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
  const [suppliers, products] = await Promise.all([
    supplierApi.getSuppliers(),
    productApi.getProducts(),
  ]);
  return {
    parties: suppliers.map((s) => ({ id: s.id, label: `${s.code} - ${s.name}` })),
    products,
  };
};

const config: DocConfig<PurchaseOrder> = {
  docName: "ใบสั่งซื้อ",
  listHref: "/purchasing/purchase-orders",
  load: async (id) => {
    const doc = await purchaseOrderApi.getPOById(id);
    return { ...doc, line: await attachProducts<PurchaseOrderLine>(doc.line) };
  },
  view: (d) => ({
    no: d.po_no,
    status: d.status,
    fields: [
      { label: "ผู้ขาย", value: d.supplier?.name ?? `ผู้ขาย #${d.supplier_id}` },
      { label: "วันที่", value: fmtDateLong(d.po_date) },
      {
        label: "อ้างอิงใบขอซื้อ",
        value: d.pr_id ? (
          <Link
            href={`/purchasing/purchase-requisitions/${d.pr_id}`}
            className="text-blue-600 hover:underline"
          >
            {d.purchase_requisition?.pr_no ?? `#${d.pr_id}`}
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
    signatures: ["ผู้จัดทำ", "ผู้อนุมัติสั่งซื้อ"],
  }),
  actions: (d) => {
    const list: DocAction[] = [];
    if (d.status === "draft") {
      list.push({
        key: "approve",
        label: "อนุมัติ",
        tone: "success",
        confirm: "ต้องการอนุมัติใบสั่งซื้อนี้ใช่หรือไม่?",
        run: () => purchaseOrderApi.approvePO(d.id),
      });
    }
    if (d.status === "approved") {
      list.push({
        key: "to-gr",
        label: "สร้างใบรับของ",
        tone: "primary",
        href: `/purchasing/goods-receipts?ref_po=${d.id}`,
      });
    }
    return list;
  },
  edit: {
    allowed: (d) => d.status === "draft",
    render: (d, onClose, onSaved) => (
      <DocEditModal
        title={`แก้ไขใบสั่งซื้อ ${d.po_no}`}
        mode="priced"
        dateLabel="วันที่"
        partyLabel="ผู้ขาย"
        initial={{
          date: dateInputValue(d.po_date),
          partyId: String(d.supplier_id),
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
          await purchaseOrderApi.updatePO(d.id, {
            po_date: new Date(r.date).toISOString(),
            supplier_id: r.partyId,
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
    run: (d) => purchaseOrderApi.cancelPO(d.id),
    confirm: "ต้องการยกเลิกใบสั่งซื้อนี้ใช่หรือไม่?",
  },
};

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DocumentDetail id={id} config={config} />;
}
