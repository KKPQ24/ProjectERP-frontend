"use client";

import { use } from "react";
import { productApi } from "@/lib/api/masterdata";
import { purchaseRequisitionApi } from "@/lib/api/purchasing";
import type { PurchaseRequisition, PurchaseRequisitionLine } from "@/types";
import DocumentDetail, {
  makeTable,
  type DocAction,
  type DocColumn,
  type DocConfig,
} from "@/components/doc/DocumentDetail";
import DocEditModal from "@/components/doc/DocEditModal";
import { itemText } from "@/components/doc/columns";
import { attachProducts } from "@/components/doc/enrich";
import { dateInputValue, fmtDateLong, fmtQty } from "@/components/doc/docUtils";

const columns: DocColumn<PurchaseRequisitionLine>[] = [
  { header: "#", render: (_l, i) => i + 1 },
  { header: "สินค้า", render: (l) => itemText(l) },
  { header: "จำนวน", align: "right", render: (l) => fmtQty(l.qty) },
  { header: "หมายเหตุ", render: (l) => l.note || "-" },
];

const loadRefs = async () => ({ parties: [], products: await productApi.getProducts() });

const config: DocConfig<PurchaseRequisition> = {
  docName: "ใบขอซื้อ",
  listHref: "/purchasing/purchase-requisitions",
  load: async (id) => {
    const doc = await purchaseRequisitionApi.getPRById(id);
    return { ...doc, line: await attachProducts<PurchaseRequisitionLine>(doc.line) };
  },
  view: (d) => ({
    no: d.pr_no,
    status: d.status,
    fields: [{ label: "วันที่ขอซื้อ", value: fmtDateLong(d.pr_date) }],
    tables: [makeTable(d.line ?? [], columns, { title: "รายการสินค้าที่ขอซื้อ", empty: "ไม่มีรายการสินค้า" })],
    note: d.note,
    createdAt: d.created_at,
    signatures: ["ผู้ขอซื้อ", "ผู้อนุมัติ"],
  }),
  actions: (d) => {
    const list: DocAction[] = [];
    if (d.status === "draft") {
      list.push({
        key: "submit",
        label: "ส่งขออนุมัติ",
        tone: "warning",
        confirm: "ต้องการส่งใบขอซื้อนี้เพื่อขออนุมัติใช่หรือไม่?",
        run: () => purchaseRequisitionApi.submitPR(d.id),
      });
    }
    if (d.status === "draft" || d.status === "pending") {
      list.push({
        key: "approve",
        label: "อนุมัติ",
        tone: "success",
        confirm: "ต้องการอนุมัติใบขอซื้อนี้ใช่หรือไม่?",
        run: async () => {
          if (d.status === "draft") await purchaseRequisitionApi.submitPR(d.id);
          await purchaseRequisitionApi.approvePR(d.id);
        },
      });
    }
    if (d.status === "approved") {
      list.push({
        key: "to-po",
        label: "สร้างใบสั่งซื้อ",
        tone: "primary",
        href: `/purchasing/purchase-orders?ref_pr=${d.id}`,
      });
    }
    return list;
  },
  edit: {
    allowed: (d) => d.status === "draft",
    render: (d, onClose, onSaved) => (
      <DocEditModal
        title={`แก้ไขใบขอซื้อ ${d.pr_no}`}
        mode="qty-note"
        dateLabel="วันที่ขอซื้อ"
        initial={{
          date: dateInputValue(d.pr_date),
          note: d.note ?? "",
          lines: (d.line ?? []).map((l) => ({
            product_id: String(l.product_id),
            qty: Number(l.qty),
            unit_price: 0,
            note: l.note ?? "",
          })),
        }}
        loadRefs={loadRefs}
        onClose={onClose}
        onSave={async (r) => {
          await purchaseRequisitionApi.updatePR(d.id, {
            pr_date: new Date(r.date).toISOString(),
            note: r.note,
            lines: r.lines.map((l) => ({
              product_id: l.product_id,
              qty: l.qty,
              note: l.note,
            })),
          });
          onSaved();
        }}
      />
    ),
  },
  cancel: {
    allowed: (d) => d.status === "draft" || d.status === "pending",
    run: (d) => purchaseRequisitionApi.cancelPR(d.id),
    confirm: "ต้องการยกเลิกใบขอซื้อนี้ใช่หรือไม่?",
  },
};

export default function PurchaseRequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DocumentDetail id={id} config={config} />;
}
