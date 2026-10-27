"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearch, matchesSearch, SearchSummary } from "@/components/SearchContext";
import { categoryApi } from "@/lib/api/masterdata";
import type { ProductCategory } from "@/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { query } = useSearch();
  const visible = categories.filter((category) =>
    matchesSearch(query, [category.code, category.name]),
  );
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    name: "",
  });

  const loadCategories = useCallback(async () => {
    try {
      const data = await categoryApi.getCategories();
      setCategories(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "ไม่สามารถโหลดข้อมูลได้");
        setError(err.message || "ไม่สามารถโหลดข้อมูลได้");
      } else {
        setError("ไม่สามารถโหลดข้อมูลได้");
        setError("ไม่สามารถโหลดข้อมูลได้");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCategories();
  }, [loadCategories]);

  const refreshCategories = async () => {
    try {
      const data = await categoryApi.getCategories();
      setCategories(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ code: "", name: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: ProductCategory) => {
    setEditingId(category.id);
    setFormData({ code: category.code, name: category.name });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await categoryApi.updateCategory(editingId, {
          code: formData.code,
          name: formData.name,
        });
      } else {
        await categoryApi.createCategory({
          code: formData.code,
          name: formData.name,
        });
      }
      setIsModalOpen(false);
      await refreshCategories();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("บันทึกข้อมูลไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
        alert("บันทึกข้อมูลไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
      } else {
        alert("บันทึกข้อมูลไม่สำเร็จ");
        alert("บันทึกข้อมูลไม่สำเร็จ");
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center">กำลังโหลดหมวดหมู่สินค้า...</div>;
    return <div className="p-8 text-center">กำลังโหลดหมวดหมู่สินค้า...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">เกิดข้อผิดพลาด: {error}</div>;
    return <div className="p-8 text-center text-red-500">เกิดข้อผิดพลาด: {error}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            หมวดหมู่สินค้า
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            รายการหมวดหมู่สำหรับจัดประเภทสินค้า
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          + เพิ่มหมวดหมู่
        </button>
      </div>

      <SearchSummary query={query} shown={visible.length} total={categories.length} />
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  รหัส
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  ชื่อ
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase"
                >
                  <span className="sr-only">แก้ไข</span>
                  <span className="sr-only">แก้ไข</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    {categories.length === 0
                      ? "ไม่พบหมวดหมู่สินค้า"
                      : `ไม่พบรายการที่ตรงกับ “${query.trim()}”`}
                  </td>
                </tr>
              )}
              {visible.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {category.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {category.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenEdit(category)}
                      className="text-brand-600 hover:text-brand-900"
                    >
                      แก้ไข
                    </button>
                  </td>
                </tr>
              ))}
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
                {editingId ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
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
                    รหัส
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ชื่อ
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
