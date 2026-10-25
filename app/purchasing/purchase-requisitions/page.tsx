"use client";

import { useEffect, useState } from "react";
import { purchaseRequisitionApi } from "@/lib/api/purchasing";
import { productApi } from "@/lib/api/masterdata";
import type { PurchaseRequisition, Product, CreatePRRequest } from "@/types";
import { useRouter } from "next/navigation";

export default function PurchaseRequisitionsPage() {
  const router = useRouter();
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<number>(1);

  // Form State
  const [formData, setFormData] = useState<{
    pr_date: string;
    note: string;
    lines: { product_id: string; qty: number; note: string }[];
  }>({
    pr_date: new Date().toISOString().split("T")[0],
    note: "",
    lines: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { authApi } = await import("@/lib/api");

      const [prData, prodData] = await Promise.all([
        purchaseRequisitionApi.getPRs(),
        productApi.getProducts(),
      ]);
      setPrs(prData);
      setProducts(prodData);

      try {
        const user = await authApi.getMe();
        if (user && user.id) setUserId(user.id);
      } catch (e) {
        console.error("Failed to fetch user", e);
      }
    } catch (err) {
      console.error("Failed to load PR data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { product_id: "", qty: 1, note: "" }],
    });
  };

  const handleLineChange = (index: number, field: string, value: string | number) => {
    const newLines = [...formData.lines];
    const line = newLines[index] as any;
    line[field] = value;
    setFormData({ ...formData, lines: newLines });
  };

  const handleRemoveLine = (index: number) => {
    const newLines = [...formData.lines];
    newLines.splice(index, 1);
    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const payload: CreatePRRequest = {
        pr_date: new Date(formData.pr_date).toISOString(),
        note: formData.note,
        created_by: userId,
        lines: formData.lines
          .map((l) => ({
            product_id: Number(l.product_id),
            qty: Number(l.qty),
            note: l.note || undefined,
          }))
          .filter((l) => l.product_id > 0),
      };

      await purchaseRequisitionApi.createPR(payload);
      setIsModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + (err.message || "สร้างใบขอซื้อไม่สำเร็จ"));
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างใบขอซื้อ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPR = async (id: number) => {
    if (!confirm("ต้องการส่งใบขอซื้อนี้เพื่อขออนุมัติใช่หรือไม่?")) return;
    try {
      await purchaseRequisitionApi.submitPR(id);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + err.message);
      } else {
        alert("เกิดข้อผิดพลาด");
      }
    }
  };

  const handleApprove = async (id: number, currentStatus: string) => {
    if (!confirm("ต้องการอนุมัติใบขอซื้อนี้ใช่หรือไม่?")) return;
    try {
      if (currentStatus === "draft") {
        await purchaseRequisitionApi.submitPR(id);
      }
      await purchaseRequisitionApi.approvePR(id);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + err.message);
      } else {
        alert("เกิดข้อผิดพลาดในการอนุมัติ");
      }
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("ต้องการยกเลิกใบขอซื้อนี้ใช่หรือไม่?")) return;
    try {
      await purchaseRequisitionApi.cancelPR(id);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + err.message);
      } else {
        alert("เกิดข้อผิดพลาดในการยกเลิก");
      }
    }
  };

  if (loading) return <div className="p-8">กำลังโหลด...</div>;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ใบขอซื้อ</h1>
          <p className="mt-2 text-sm text-slate-600">จัดการข้อมูลคำขอซื้อสินค้าภายในองค์กรเพื่อขออนุมัติจัดซื้อ</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              pr_date: new Date().toISOString().split("T")[0],
              note: "",
              lines: [{ product_id: "", qty: 1, note: "" }],
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
        >
          + สร้างใบขอซื้อ
        </button>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">เลขที่เอกสาร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">วันที่</th>
              {/* <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">จำนวนรายการ</th> */}
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">หมายเหตุ</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">สถานะ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {prs.map((pr) => (
              <tr key={pr.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{pr.pr_no}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{new Date(pr.pr_date).toLocaleDateString("th-TH")}</td>
                {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {pr.line?.length || 0} รายการ
                </td> */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{pr.note || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      pr.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : pr.status === "pending"
                        ? "bg-blue-100 text-blue-800"
                        : pr.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {pr.status === "draft"
                      ? "ร่าง"
                      : pr.status === "pending"
                      ? "รออนุมัติ"
                      : pr.status === "approved"
                      ? "อนุมัติแล้ว"
                      : pr.status === "cancelled"
                      ? "ยกเลิก"
                      : pr.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {pr.status === "draft" && (
                    <>
                      <button
                        onClick={() => handleSubmitPR(pr.id)}
                        className="text-amber-600 hover:text-amber-900 mr-3"
                      >
                        ส่งขออนุมัติ
                      </button>
                      <button
                        onClick={() => handleApprove(pr.id, pr.status)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => handleCancel(pr.id)}
                        className="text-red-500 hover:text-red-700 mr-2"
                      >
                        ยกเลิก
                      </button>
                    </>
                  )}
                  {pr.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleApprove(pr.id, pr.status)}
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => handleCancel(pr.id)}
                        className="text-red-500 hover:text-red-700 mr-2"
                      >
                        ยกเลิก
                      </button>
                    </>
                  )}
                  {pr.status === "approved" && (
                    <button
                      onClick={() => router.push(`/purchasing/purchase-orders?ref_pr=${pr.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      สร้างใบสั่งซื้อ 
                    </button>
                  )}
                  {pr.status === "cancelled" && (
                    <span className="text-slate-400">ยกเลิกแล้ว</span>
                  )}
                </td>
              </tr>
            ))}
            {prs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  ไม่มีข้อมูลใบขอซื้อ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">สร้างใบขอซื้อใหม่</h2>
              <button
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="pr-form" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ขอซื้อ *</label>
                    <input
                      type="date"
                      required
                      value={formData.pr_date}
                      onChange={(e) => setFormData({ ...formData, pr_date: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ / เหตุผลการขอซื้อ</label>
                    <input
                      type="text"
                      placeholder="เช่น สต๊อกใกล้หมด, สั่งซื้อสำหรับงานประจำเดือน"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4 flex justify-between items-end">
                  <h3 className="text-md font-semibold text-slate-800">รายการสินค้าที่ต้องการสั่งซื้อ</h3>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-sm text-blue-600 font-medium hover:text-blue-800"
                  >
                    + เพิ่มรายการ
                  </button>
                </div>

                <table className="w-full border border-slate-200 mb-4 rounded-md overflow-hidden">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left text-sm font-medium text-slate-600">สินค้า</th>
                      <th className="py-2 px-3 text-right text-sm font-medium text-slate-600 w-32">จำนวนที่ขอ</th>
                      <th className="py-2 px-3 text-left text-sm font-medium text-slate-600 w-64">หมายเหตุรายการ</th>
                      <th className="py-2 px-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.lines.map((line, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="p-2">
                          <select
                            required
                            value={line.product_id}
                            onChange={(e) => handleLineChange(idx, "product_id", e.target.value)}
                            className="w-full text-sm border-slate-300 rounded shadow-sm focus:ring-blue-500"
                          >
                            <option value="">-- เลือกสินค้า --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.sku} - {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            required
                            value={line.qty}
                            onChange={(e) => handleLineChange(idx, "qty", Number(e.target.value))}
                            className="w-full text-right text-sm border-slate-300 rounded shadow-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="ระบุเพิ่มเติม (ถ้ามี)"
                            value={line.note}
                            onChange={(e) => handleLineChange(idx, "note", e.target.value)}
                            className="w-full text-sm border-slate-300 rounded shadow-sm"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            &times;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 font-medium disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                form="pr-form"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                {submitting ? "กำลังบันทึก..." : "บันทึกใบขอซื้อ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
