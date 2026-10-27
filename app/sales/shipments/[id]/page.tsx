"use client";

import { use } from "react";
import Link from "next/link";
import { shipmentApi } from "@/lib/api/sales";
import type { Shipment, ShipmentLine } from "@/types";
import DocumentDetail, {
  makeTable,
  type DocAction,
  type DocConfig,
} from "@/components/doc/DocumentDetail";
import { qtyColumns } from "@/components/doc/columns";
import { attachProducts } from "@/components/doc/enrich";
import { fmtDateLong } from "@/components/doc/docUtils";

const config: DocConfig<Shipment> = {
  docName: "ใบส่งของ",
  listHref: "/sales/shipments",
  statusLabels: { posted: "บันทึกบัญชีแล้ว" },
  load: async (id) => {
    const doc = await shipmentApi.getShipmentById(id);
    return { ...doc, line: await attachProducts<ShipmentLine>(doc.line) };
  },
  view: (d) => ({
    no: d.sh_no,
    status: d.status,
    fields: [
      { label: "ลูกค้า", value: d.customer?.name ?? `ลูกค้า #${d.customer_id}` },
      { label: "วันที่", value: fmtDateLong(d.sh_date) },
      {
        label: "อ้างอิงใบสั่งขาย",
        value: d.so_id ? (
          <Link href={`/sales/sales-orders/${d.so_id}`} className="text-brand-600 hover:underline">
            {d.sales_order?.so_no ?? `#${d.so_id}`}
          </Link>
        ) : (
          "-"
        ),
      },
    ],
    tables: [makeTable(d.line ?? [], qtyColumns, { title: "รายการสินค้าที่ส่ง", empty: "ไม่มีรายการสินค้า" })],
    note: d.note,
    createdAt: d.created_at,
    signatures: ["ผู้ส่งสินค้า", "ผู้รับสินค้า"],
  }),
  actions: (d) => {
    const list: DocAction[] = [];
    if (d.status === "draft") {
      list.push({
        key: "post",
        label: "บันทึกบัญชี",
        tone: "success",
        confirm: "คุณต้องการบันทึกบัญชีใบส่งของนี้ใช่หรือไม่?",
        run: () => shipmentApi.postShipment(d.id),
      });
    }
    if (d.status === "posted") {
      list.push({
        key: "to-invoice",
        label: "สร้างใบแจ้งหนี้",
        tone: "primary",
        href: `/sales/invoices?ref_sh=${d.id}`,
      });
    }
    return list;
  },
};

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <DocumentDetail id={id} config={config} />;
}
