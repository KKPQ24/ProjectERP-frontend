"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearch, matchesSearch, SearchSummary } from "@/components/SearchContext";
import { statusLabel, fmtDateShort } from "@/components/doc/docUtils";
import { purchaseOrderApi, purchaseRequisitionApi } from "@/lib/api/purchasing";
import { supplierApi, productApi } from "@/lib/api/masterdata";
import type { PurchaseOrder, PurchaseRequisition, Supplier, Product, CreatePORequest } from "@/types";
import { useSearchParams, useRouter } from "next/navigation";

function PurchaseOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refPrId = searchParams.get("ref_pr");

  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { query } = useSearch();
  const visible = pos.filter((po) =>
    matchesSearch(query, [po.po_no, po.purchase_requisition?.pr_no, po.supplier?.name, statusLabel(po.status), fmtDateShort(po.po_date), po.total_amount, po.note]),
  );

  const [userId, setUserId] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    po_date: string;
    supplier_id: string;
    pr_id: string;
    note: string;
    lines: { product_id: string; qty: number; unit_price: number; line_amount: number }[];
  }>({
    po_date: new Date().toISOString().split("T")[0],
    supplier_id: "",
    pr_id: "",
    note: "",
    lines: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { authApi } = await import("@/lib/api");

      const [poData, prData, supData, prodData] = await Promise.all([
        purchaseOrderApi.getPOs(),
        purchaseRequisitionApi.getPRs(),
        supplierApi.getSuppliers(),
        productApi.getProducts(),
      ]);
      setPos(poData);
      setPrs(prData.filter((pr) => pr.status === "approved"));
      setSuppliers(supData);
      setProducts(prodData);

      try {
        const user = await authApi.getMe();
        if (user && user.id) setUserId(user.id);
      } catch (e) {
        console.error("Failed to fetch user", e);
      }

      if (refPrId && !isModalOpen) {
        await handleSelectPR(refPrId, prodData);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to load PO data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refPrId]);

  const handleSelectPR = async (prId: string, prodList: Product[] = products) => {
    if (!prId) {
      setFormData((prev) => ({ ...prev, pr_id: "", lines: [] }));
      return;
    }
    try {
      const pr = await purchaseRequisitionApi.getPRById(prId);
      if (pr) {
        const lines = (pr.line || []).map((l) => {
          const p = prodList.find((prod) => prod.id === l.product_id) || products.find((prod) => prod.id === l.product_id);
          const price = p ? Number(p.sale_price) : 0;
          const qty = Number(l.qty);
          return {
            product_id: l.product_id.toString(),
            qty: qty,
            unit_price: price,
            line_amount: qty * price,
          };
        });

        setFormData((prev) => ({
          ...prev,
          pr_id: prId,
          note: pr.note ? `อ้างอิงใบขอซื้อ ${pr.pr_no} - ${pr.note}` : `อ้างอิงใบขอซื้อ ${pr.pr_no}`,
          lines: lines,
        }));
      }
    } catch (err) {
      console.error("Failed to load PR details", err);
    }
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { product_id: "", qty: 1, unit_price: 0, line_amount: 0 }],
    });
  };

  const handleLineChange = (index: number, field: string, value: string | number) => {
    const newLines = [...formData.lines];
    const line = newLines[index] as any;
    line[field] = value;

    if (field === "product_id" && value) {
      const p = products.find((prod) => prod.id.toString() === value.toString());
      if (p) line.unit_price = Number(p.sale_price);
    }

    line.line_amount = Number(line.qty) * Number(line.unit_price);
    setFormData({ ...formData, lines: newLines });
  };

  const handleRemoveLine = (index: number) => {
    const newLines = [...formData.lines];
    newLines.splice(index, 1);
    setFormData({ ...formData, lines: newLines });
  };

  const subtotal = formData.lines.reduce((sum, line) => sum + line.line_amount, 0);
  const vat = subtotal * 0.07;
  const total = subtotal + vat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const payload: CreatePORequest = {
        po_date: new Date(formData.po_date).toISOString(),
        supplier_id: Number(formData.supplier_id),
        pr_id: formData.pr_id ? Number(formData.pr_id) : null,
        subtotal_amount: subtotal,
        vat_amount: vat,
        total_amount: total,
        note: formData.note,
        created_by: userId,
        lines: formData.lines
          .map((l) => ({
            product_id: Number(l.product_id),
            qty: Number(l.qty),
            unit_price: Number(l.unit_price),
            line_amount: Number(l.line_amount),
          }))
          .filter((l) => l.product_id > 0),
      };

      await purchaseOrderApi.createPO(payload);
      setIsModalOpen(false);
      if (refPrId) {
        router.replace("/purchasing/purchase-orders");
      }
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + (err.message || "สร้างใบสั่งซื้อไม่สำเร็จ"));
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างใบสั่งซื้อ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">กำลังโหลด...</div>;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ใบสั่งซื้อ</h1>
          <p className="mt-2 text-sm text-slate-600">จัดการข้อมูลการสั่งซื้อสินค้ากับผู้ขาย</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              po_date: new Date().toISOString().split("T")[0],
              supplier_id: "",
              pr_id: "",
              note: "",
              lines: [{ product_id: "", qty: 1, unit_price: 0, line_amount: 0 }],
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
        >
          + สร้างใบสั่งซื้อ
        </button>
      </div>

      <SearchSummary query={query} shown={visible.length} total={pos.length} />
      <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">เลขที่เอกสาร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">อ้างอิงใบขอซื้อ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ผู้ขาย</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">ยอดรวม</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visible.map((po) => (
              <tr key={po.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/purchasing/purchase-orders/${po.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                    title="ดูรายละเอียดเอกสาร"
                  >
                    {po.po_no}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {po.purchase_requisition?.pr_no || (po.pr_id ? `PR #${po.pr_id}` : "-")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {po.supplier?.name || `Supplier #${po.supplier_id}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-medium">
                  {Number(po.total_amount).toLocaleString("th-TH", { style: "currency", currency: "THB" })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      po.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : po.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {po.status === "draft"
                      ? "ร่าง"
                      : po.status === "approved"
                      ? "อนุมัติแล้ว"
                      : po.status === "cancelled"
                      ? "ยกเลิก"
                      : po.status}
                  </span>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  {pos.length === 0
                    ? "ไม่มีข้อมูลใบสั่งซื้อ"
                    : `ไม่พบรายการที่ตรงกับ “${query.trim()}”`}
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
              <h2 className="text-lg font-bold text-slate-800">สร้างใบสั่งซื้อใหม่</h2>
              <button
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="po-form" onSubmit={handleSubmit}>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-md mb-6">
                  <label className="block text-sm font-semibold text-blue-800 mb-1">
                    ดึงข้อมูลอ้างอิงจากใบขอซื้อ (Purchase Requisition - PR)
                  </label>
                  <select
                    value={formData.pr_id}
                    onChange={(e) => handleSelectPR(e.target.value, products)}
                    className="w-full border-blue-200 bg-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3"
                  >
                    <option value="">-- ไม่ระบุอ้างอิง (สร้างใหม่) --</option>
                    {prs.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.pr_no} - {new Date(pr.pr_date).toLocaleDateString("th-TH")} ({pr.note || "ไม่มีหมายเหตุ"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ผู้ขาย *</label>
                    <select
                      required
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- เลือกผู้ขาย --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่สั่งซื้อ *</label>
                    <input
                      type="date"
                      required
                      value={formData.po_date}
                      onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                    <input
                      type="text"
                      placeholder="เช่น เงื่อนไขการจัดส่งหรือเครดิตเทอม"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4 flex justify-between items-end">
                  <h3 className="text-md font-semibold text-slate-800">รายการสินค้าสั่งซื้อ</h3>
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
                      <th className="py-2 px-3 text-right text-sm font-medium text-slate-600 w-24">จำนวน</th>
                      <th className="py-2 px-3 text-right text-sm font-medium text-slate-600 w-32">ราคา/หน่วย</th>
                      <th className="py-2 px-3 text-right text-sm font-medium text-slate-600 w-32">รวม</th>
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
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={line.unit_price}
                            onChange={(e) => handleLineChange(idx, "unit_price", Number(e.target.value))}
                            className="w-full text-right text-sm border-slate-300 rounded shadow-sm"
                          />
                        </td>
                        <td className="p-2 text-right text-sm font-medium bg-slate-50">
                          {line.line_amount.toLocaleString("th-TH")}
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

                <div className="flex justify-end mt-4">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">มูลค่ารวม:</span>
                      <span className="font-medium text-slate-900">{subtotal.toLocaleString("th-TH")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">ภาษีมูลค่าเพิ่ม 7%:</span>
                      <span className="font-medium text-slate-900">{vat.toLocaleString("th-TH")}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                      <span className="font-bold text-slate-800">ยอดรวมทั้งสิ้น:</span>
                      <span className="font-bold text-blue-700">{total.toLocaleString("th-TH")}</span>
                    </div>
                  </div>
                </div>
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
                form="po-form"
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
                {submitting ? "กำลังบันทึก..." : "บันทึกใบสั่งซื้อ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
      <PurchaseOrdersContent />
    </Suspense>
  );
}
