import type { ReactNode } from "react";

export type NavIconName =
  // กลุ่มเมนู
  | "dashboard"
  | "groupSales"
  | "groupPurchasing"
  | "groupAccounting"
  | "groupMasterdata"
  // ขาย
  | "quotation"
  | "salesOrder"
  | "shipment"
  | "invoice"
  | "receipt"
  // จัดซื้อ
  | "requisition"
  | "purchaseOrder"
  | "goodsReceipt"
  | "bill"
  | "payment"
  // บัญชี
  | "accounts"
  | "trialBalance"
  // ข้อมูลหลัก
  | "product"
  | "category"
  | "unit"
  | "customer"
  | "supplier"
  | "user"
  | "stockMovement"
  | "auditLog";

const ICONS: Record<NavIconName, ReactNode> = {
  stockMovement: <><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" /></>,
  auditLog: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </>
  ),
  groupSales: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  groupPurchasing: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 016 0v2" />
    </>
  ),
  groupAccounting: (
    <>
      <path d="M3 10l9-6 9 6H3z" />
      <path d="M6 10v8M10 10v8M14 10v8M18 10v8" />
      <path d="M3 21h18" />
    </>
  ),
  groupMasterdata: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  quotation: (
    <>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </>
  ),
  salesOrder: (
    <>
      <rect x="5" y="4.5" width="14" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="4" rx="1" />
      <path d="M9 14l2.2 2.2L15.5 12" />
    </>
  ),
  shipment: (
    <>
      <path d="M3 6h10v10H3z" />
      <path d="M13 9h4l4 4v3h-8" />
      <circle cx="7.5" cy="17.5" r="2" />
      <circle cx="17.5" cy="17.5" r="2" />
    </>
  ),
  invoice: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  receipt: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  requisition: (
    <>
      <rect x="5" y="4.5" width="14" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="4" rx="1" />
      <path d="M9 11.5h6M9 15.5h6" />
    </>
  ),
  purchaseOrder: (
    <>
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="18" cy="20" r="1.3" />
      <path d="M2 3h3l2.4 11.2a1.5 1.5 0 001.5 1.2h8.7a1.5 1.5 0 001.5-1.1L21 8H6" />
    </>
  ),
  goodsReceipt: (
    <>
      <path d="M3 13l2.5-8h13L21 13v6a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
      <path d="M3 13h5l1 2h6l1-2h5" />
    </>
  ),
  bill: (
    <>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 15h6" />
    </>
  ),
  payment: (
    <>
      <path d="M19 7V4a1 1 0 00-1-1H5a2 2 0 000 4h15a1 1 0 011 1v4h-3a2 2 0 000 4h3a1 1 0 001-1v-2a1 1 0 00-1-1" />
      <path d="M3 5v14a2 2 0 002 2h15a1 1 0 001-1v-4" />
    </>
  ),
  accounts: (
    <>
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5V18c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2V4.5c-4 0-6.5.5-8 2z" />
      <path d="M12 6.5V20" />
    </>
  ),
  trialBalance: (
    <>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <rect x="8" y="5.5" width="8" height="4" rx=".5" />
      <path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01" />
    </>
  ),
  product: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </>
  ),
  category: (
    <>
      <path d="M12.6 2.6A2 2 0 0011.2 2H4a2 2 0 00-2 2v7.2a2 2 0 00.6 1.4l8.7 8.7a2.4 2.4 0 003.4 0l6.6-6.6a2.4 2.4 0 000-3.4z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </>
  ),
  unit: (
    <>
      <rect x="2" y="8" width="20" height="8" rx="1.5" />
      <path d="M6 8v4M10 8v3M14 8v4M18 8v3" />
    </>
  ),
  customer: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20v-.5A5.5 5.5 0 018 14h2a5.5 5.5 0 015.5 5.5v.5" />
      <path d="M16 4.7a3.5 3.5 0 010 6.6M18.5 14.4A5.5 5.5 0 0121.5 19.5v.5" />
    </>
  ),
  supplier: (
    <>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
      <path d="M4.5 12.5V21h15v-8.5" />
      <path d="M10 21v-5h4v5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" />
    </>
  ),
};

export default function NavIcon({
  name,
  className = "h-5 w-5",
}: {
  name: NavIconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
