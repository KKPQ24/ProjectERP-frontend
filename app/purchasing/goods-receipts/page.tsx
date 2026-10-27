"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { matchesSearch } from "@/components/SearchContext";
import DocumentSearch from "@/components/DocumentSearch";
import { statusLabel, fmtDateShort } from "@/components/doc/docUtils";
import { goodsReceiptApi, purchaseOrderApi } from "@/lib/api/purchasing";
import { supplierApi, productApi } from "@/lib/api/masterdata";
import type { GoodsReceipt, PurchaseOrder, Supplier, Product, CreateGoodsReceiptRequest } from "@/types";
import { useSearchParams, useRouter } from "next/navigation";

function GoodsReceiptsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refPoId = searchParams.get("ref_po");

  const [grs, setGrs] = useState<GoodsReceipt[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const visible = grs.filter((gr) =>
    matchesSearch(query, [gr.gr_no, gr.purchase_order?.po_no, gr.supplier?.name, statusLabel(gr.status), fmtDateShort(gr.gr_date), gr.note]),
  );

  const [userId, setUserId] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    gr_date: string;
    supplier_id: string;
    po_id: string;
    note: string;
    lines: { product_id: string; qty: number; unit_cost: number; po_line_id?: number }[];
  }>({
    gr_date: new Date().toISOString().split("T")[0],
    supplier_id: "",
    po_id: "",
    note: "",
    lines: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { authApi } = await import("@/lib/api");

      const [grData, poData, supData, prodData] = await Promise.all([
        goodsReceiptApi.getGoodsReceipts(),
        purchaseOrderApi.getPOs(),
        supplierApi.getSuppliers(),
        productApi.getProducts(),
      ]);
      setGrs(grData);
      setPos(poData.filter((po) => po.status === "approved"));
      setSuppliers(supData);
      setProducts(prodData);

      try {
        const user = await authApi.getMe();
        if (user && user.id) setUserId(user.id);
      } catch (e) {
        console.error("Failed to fetch user", e);
      }

      if (refPoId && !isModalOpen) {
        await handleSelectPO(refPoId, prodData);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to load GR data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refPoId]);

  const handleSelectPO = async (poId: string, prodList: Product[] = products) => {
    if (!poId) {
      setFormData((prev) => ({ ...prev, po_id: "", lines: [] }));
      return;
    }
    try {
      const po = await purchaseOrderApi.getPOById(poId);
      if (po) {
        const lines = (po.line || []).map((l) => ({
          product_id: l.product_id.toString(),
          qty: Number(l.qty),
          unit_cost: Number(l.unit_price),
          po_line_id: l.id,
        }));

        setFormData((prev) => ({
          ...prev,
          po_id: poId,
          supplier_id: po.supplier_id.toString(),
          note: po.note ? `รับของตามใบสั่งซื้อ ${po.po_no} - ${po.note}` : `รับของตามใบสั่งซื้อ ${po.po_no}`,
          lines: lines,
        }));
      }
    } catch (err) {
      console.error("Failed to load PO details", err);
    }
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { product_id: "", qty: 1, unit_cost: 0 }],
    });
  };

  const handleLineChange = (index: number, field: string, value: string | number) => {
    const newLines = [...formData.lines];
    const line = newLines[index] as any;
    line[field] = value;

    if (field === "product_id" && value) {
      const p = products.find((prod) => prod.id.toString() === value.toString());
      if (p) line.unit_cost = Number(p.sale_price);
    }

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
      const payload: CreateGoodsReceiptRequest = {
        gr_date: new Date(formData.gr_date).toISOString(),
        supplier_id: Number(formData.supplier_id),
        po_id: formData.po_id ? Number(formData.po_id) : null,
        note: formData.note,
        created_by: userId,
        lines: formData.lines
          .map((l) => ({
            product_id: Number(l.product_id),
            qty: Number(l.qty),
            unit_cost: Number(l.unit_cost),
          }))
          .filter((l) => l.product_id > 0),
      };

      await goodsReceiptApi.createGoodsReceipt(payload);
      setIsModalOpen(false);
      if (refPoId) {
        router.replace("/purchasing/goods-receipts");
      }
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + (err.message || "สร้างใบรับของไม่สำเร็จ"));
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างใบรับของ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">กำลังโหลด...</div>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ใบรับของ</h1>
        </div>
        <button
          onClick={() => {
            setFormData({
              gr_date: new Date().toISOString().split("T")[0],
              supplier_id: "",
              po_id: "",
              note: "",
              lines: [{ product_id: "", qty: 1, unit_cost: 0 }],
            });
            setIsModalOpen(true);
          }}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          + สร้างใบรับของ
        </button>
      </div>

      <DocumentSearch label="ค้นหาใบรับของ" value={query} onChange={setQuery} shown={visible.length} total={grs.length} />
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">เลขที่เอกสาร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">อ้างอิงใบสั่งซื้อ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ผู้ขาย</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">วันที่รับของ</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visible.map((gr) => (
              <tr key={gr.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/purchasing/goods-receipts/${gr.id}`}
                    className="text-brand-600 hover:text-brand-800 hover:underline"
                    title="ดูรายละเอียดเอกสาร"
                  >
                    {gr.gr_no}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {gr.purchase_order?.po_no || (gr.po_id ? `PO #${gr.po_id}` : "-")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {gr.supplier?.name || `Supplier #${gr.supplier_id}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {new Date(gr.gr_date).toLocaleDateString("th-TH")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      gr.status === "posted"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {gr.status === "draft" ? "ร่าง" : gr.status === "posted" ? "บันทึกสต๊อกแล้ว" : gr.status}
                  </span>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  {grs.length === 0
                    ? "ไม่มีข้อมูลใบรับของ"
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
              <h2 className="text-lg font-bold text-slate-800">สร้างใบรับของใหม่</h2>
              <button
                disabled={submitting}
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-600 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="gr-form" onSubmit={handleSubmit}>
                <div className="bg-brand-50 border border-brand-100 p-4 rounded-md mb-6">
                  <label className="block text-sm font-semibold text-brand-800 mb-1">
                    ดึงข้อมูลอ้างอิงจากใบสั่งซื้อ (Purchase Order - PO)
                  </label>
                  <select
                    value={formData.po_id}
                    onChange={(e) => handleSelectPO(e.target.value, products)}
                    className="w-full border-brand-200 bg-white rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3"
                  >
                    <option value="">-- ไม่ระบุอ้างอิง (สร้างใหม่) --</option>
                    {pos.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.po_no} - {po.supplier?.name} (ยอดรวม: {Number(po.total_amount).toLocaleString("th-TH")})
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
                      disabled={!!formData.po_id}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่รับของ *</label>
                    <input
                      type="date"
                      required
                      value={formData.gr_date}
                      onChange={(e) => setFormData({ ...formData, gr_date: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                    <input
                      type="text"
                      placeholder="เช่น ใบส่งของจากผู้ขายเลขที่..."
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="mb-4 flex justify-between items-end">
                  <h3 className="text-md font-semibold text-slate-800">รายการสินค้าที่ตรวจรับ</h3>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-sm text-brand-600 font-medium hover:text-brand-800"
                  >
                    + เพิ่มรายการ
                  </button>
                </div>

                <table className="w-full border border-slate-200 mb-4 rounded-md overflow-hidden">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left text-sm font-medium text-slate-600">สินค้า</th>
                      <th className="py-2 px-3 text-right text-sm font-medium text-slate-600 w-32">จำนวนที่รับ</th>
                      <th className="py-2 px-3 text-right text-sm font-medium text-slate-600 w-36">ต้นทุน/หน่วย</th>
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
                            className="w-full text-sm border-slate-300 rounded shadow-sm focus:ring-brand-500"
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
                            value={line.unit_cost}
                            onChange={(e) => handleLineChange(idx, "unit_cost", Number(e.target.value))}
                            className="w-full text-right text-sm border-slate-300 rounded shadow-sm"
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
                form="gr-form"
                disabled={submitting}
                className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 font-medium disabled:opacity-50 flex items-center gap-2"
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
                {submitting ? "กำลังบันทึก..." : "บันทึกใบรับของ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GoodsReceiptsPage() {
  return (
    <Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
      <GoodsReceiptsContent />
    </Suspense>
  );
}
