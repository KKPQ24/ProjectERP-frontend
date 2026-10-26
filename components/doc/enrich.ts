import { productApi } from "@/lib/api/masterdata";
import type { Product } from "@/types";

/**
 * เติมข้อมูลสินค้า (รหัส/ชื่อ) ให้แต่ละรายการในเอกสาร
 * เผื่อกรณีที่ API ส่งมาแค่ product_id โดยไม่แนบ product
 */
export async function attachProducts<
  L extends { product_id?: number | null; product?: Product | null },
>(lines: L[] | undefined): Promise<L[]> {
  const list = lines ?? [];
  if (list.every((l) => l.product || !l.product_id)) return list;
  const products = await productApi.getProducts();
  const byId = new Map(products.map((p) => [p.id, p]));
  return list.map((l) =>
    l.product || !l.product_id ? l : ({ ...l, product: byId.get(l.product_id) } as L),
  );
}
