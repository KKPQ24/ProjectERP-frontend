"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearch, matchesSearch, SearchSummary } from "@/components/SearchContext";
import { productApi, categoryApi, unitApi } from "@/lib/api/masterdata";
import type {
  Product,
  ProductCategory,
  Unit,
  CreateProductRequest,
} from "@/types";

function isProductActive(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "string") {
    return !["false", "0", "inactive"].includes(value.trim().toLowerCase());
  }

  return value !== false && value !== 0;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [lowStockLoaded, setLowStockLoaded] = useState(false);
  const [lowStockError, setLowStockError] = useState<string | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { query } = useSearch();
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category_id: "",
    unit_id: "",
    sale_price: "",
    reorder_point: "",
    is_active: true,
  });

  const loadLowStockProducts = useCallback(async () => {
    try {
      const lowStockData = await productApi.getLowStockProducts();
      setLowStockProducts(lowStockData);
      setLowStockError(null);
    } catch (err: unknown) {
      setLowStockProducts([]);
      setLowStockError(
        err instanceof Error
          ? err.message
          : "ไม่สามารถโหลดข้อมูลสินค้าใกล้หมดได้"
      );
    } finally {
      setLowStockLoaded(true);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      // loading is already true initially
      const [productsData, categoriesData, unitsData] = await Promise.all([
        productApi.getProducts(),
        categoryApi.getCategories(),
        unitApi.getUnits(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setUnits(unitsData);
      void loadLowStockProducts();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "ไม่สามารถโหลดข้อมูลได้");
      } else {
        setError("ไม่สามารถโหลดข้อมูลได้");
      }
    } finally {
      setLoading(false);
    }
  }, [loadLowStockProducts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitialData();
  }, [loadInitialData]);

  const refreshProducts = async () => {
    try {
      const productsData = await productApi.getProducts();
      setProducts(productsData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
    }
    await loadLowStockProducts();
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      sku: "",
      name: "",
      category_id: "",
      unit_id: "",
      sale_price: "",
      reorder_point: "0",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      sku: product.sku,
      name: product.name,
      category_id: product.category_id ? String(product.category_id) : "",
      unit_id: String(product.unit_id),
      sale_price: String(product.sale_price),
      reorder_point: String(product.reorder_point),
      is_active: isProductActive(product.is_active),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("คุณต้องการลบสินค้านี้ใช่หรือไม่?"))
      return;
    try {
      await productApi.deleteProduct(id);
      await refreshProducts();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("ลบสินค้าไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
      } else {
        alert("ลบสินค้าไม่สำเร็จ");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        sku: formData.sku,
        name: formData.name,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        unit_id: Number(formData.unit_id),
        sale_price: Number(formData.sale_price),
        reorder_point: Number(formData.reorder_point),
        is_active: formData.is_active,
      };

      if (editingId) {
        await productApi.updateProduct(editingId, payload);
      } else {
        await productApi.createProduct(payload as CreateProductRequest);
      }
      setIsModalOpen(false);
      await refreshProducts();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("บันทึกสินค้าไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
      } else {
        alert("บันทึกสินค้าไม่สำเร็จ");
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center">กำลังโหลดสินค้า...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  const lowStockById = new Map(
    lowStockProducts.map((product) => [product.id, product])
  );
  const visibleProducts = (
    showLowStockOnly
      ? products.filter((product) => lowStockById.has(product.id))
      : products
  ).filter((product) =>
    matchesSearch(query, [product.sku, product.name, product.category_name, product.product_category?.name, product.unit_name, product.unit?.name]),
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ข้อมูลสินค้า</h1>
          <p className="mt-2 text-sm text-slate-600">
            รายการสินค้าพร้อมรหัสสินค้า ชื่อ ราคา และข้อมูลคงคลัง
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          + เพิ่มสินค้า
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-700" aria-live="polite">
          {lowStockError ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-red-600" role="alert">
                ตรวจสอบสินค้าใกล้หมดไม่สำเร็จ: {lowStockError}
              </span>
              <button
                type="button"
                onClick={() => {
                  setLowStockLoaded(false);
                  void loadLowStockProducts();
                }}
                className="font-medium text-brand-600 hover:text-brand-800"
              >
                ลองอีกครั้ง
              </button>
            </div>
          ) : !lowStockLoaded ? (
            <span>กำลังตรวจสอบสินค้าใกล้หมด...</span>
          ) : (
            <span>
              สินค้าใกล้ถึงจุดสั่งซื้อ {lowStockProducts.length} รายการ
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowLowStockOnly((showing) => !showing)}
          disabled={!lowStockLoaded || !!lowStockError}
          aria-pressed={showLowStockOnly}
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            showLowStockOnly
              ? "bg-amber-100 text-amber-900"
              : "border border-slate-300 text-slate-700 hover:bg-slate-50"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {showLowStockOnly ? "แสดงสินค้าทั้งหมด" : "แสดงเฉพาะสินค้าใกล้หมด"}
        </button>
      </div>

      <SearchSummary query={query} shown={visibleProducts.length} total={products.length} />
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  รหัสสินค้า
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  ชื่อสินค้า
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  หมวดหมู่
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  หน่วยนับ
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase"
                >
                  ราคา
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase"
                >
                  คงเหลือ
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase"
                >
                  สถานะ
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase"
                >
                  <span className="sr-only">การดำเนินการ</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleProducts.map((product) => {
                const lowStockProduct = lowStockById.get(product.id);

                return (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {product.category_name ||
                      product.product_category?.name ||
                      "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {product.unit_name || product.unit?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                    {Number(product.sale_price).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {lowStockProduct ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                        สินค้าใกล้หมด ({lowStockProduct.on_hand ?? "-"})
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        {product.on_hand ?? "-"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                    {isProductActive(product.is_active) ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        ใช้งาน
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        ไม่ใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="text-brand-600 hover:text-brand-900 mr-4"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
                );
              })}
              {visibleProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-sm text-slate-500"
                  >
                    {query.trim()
                      ? `ไม่พบรายการที่ตรงกับ “${query.trim()}”`
                      : showLowStockOnly
                        ? "ไม่พบสินค้าที่มีสต็อกต่ำ"
                        : "ไม่พบสินค้า"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    รหัสสินค้า (SKU)
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId} // Usually SKU cannot be changed
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ชื่อสินค้า
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      หมวดหมู่
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category_id: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    >
                      <option value="">-- ไม่มี --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      หน่วยนับ
                    </label>
                    <select
                      required
                      value={formData.unit_id}
                      onChange={(e) =>
                        setFormData({ ...formData, unit_id: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    >
                      <option value="">-- เลือก --</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ราคาขาย
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.sale_price}
                      onChange={(e) =>
                        setFormData({ ...formData, sale_price: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      จุดสั่งซื้อ
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.reorder_point}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reorder_point: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </div>
                </div>
                {editingId && (
                  <div className="flex items-center gap-2 mt-4">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                    />
                    <label
                      htmlFor="is_active"
                      className="text-sm font-medium text-slate-900"
                    >
                      เปิดใช้งาน (พร้อมจำหน่าย)
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 font-medium"
                  >
                    บันทึก
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
