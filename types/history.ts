export interface HistoryPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface HistoryActor {
  id: number;
  username: string;
  full_name?: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  moved_at: string;
  qty_change: number | string;
  unit_cost: number | string;
  value_change: number | string;
  balance_qty: number | string;
  balance_value: number | string;
  ref_type: string;
  ref_id: number;
  ref_no: string;
  note: string | null;
  created_by: number;
  product: { id: number; sku: string; name: string; unit: { code: string; name: string } };
  app_user: HistoryActor;
}

export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  action: string;
  entity: string;
  entity_id: number | null;
  diff: unknown;
  ip_address: string | null;
  created_at: string;
  app_user: HistoryActor | null;
}
