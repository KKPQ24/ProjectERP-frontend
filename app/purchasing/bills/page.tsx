"use client";

import { useEffect, useState, Suspense } from "react";
import { supplierBillApi, goodsReceiptApi, purchaseOrderApi } from "@/lib/api/purchasing";
import { supplierApi, productApi, accountApi } from "@/lib/api/masterdata";
import type { SupplierBill, GoodsReceipt, Supplier, Product, Account, CreateSupplierBillRequest } from "@/types";
import { useSearchParams, useRouter } from "next/navigation";

function BillsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refGrId = searchParams.get("ref_gr");

  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [grs, setGrs] = useState<GoodsReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    bill_date: string;
    due_date: string;
    supplier_ref: string;
    supplier_id: string;
    po_id: string;
    gr_id: string;
    lines: { product_id: string; account_id: string; description: string; qty: number; unit_price: number; line_amount: number }[];
  }>({
    bill_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    supplier_ref: "",
    supplier_id: "",
    po_id: "",
    gr_id: "",
    lines: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { authApi } = await import("@/lib/api");

      const [billData, grData, supData, prodData, accData] = await Promise.all([
        supplierBillApi.getBills(),
        goodsReceiptApi.getGoodsReceipts(),
        supplierApi.getSuppliers(),
        productApi.getProducts(),
        accountApi.getAccounts(),
      ]);
      setBills(billData);
      setGrs(grData.filter((gr) => gr.status === "posted"));
      setSuppliers(supData);
      setProducts(prodData);
      setAccounts(accData);

      try {
        const user = await authApi.getMe();
        if (user && user.id) setUserId(user.id);
      } catch (e) {
        console.error("Failed to fetch user", e);
      }

      if (refGrId && !isModalOpen) {
        await handleSelectGR(refGrId, prodData);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to load Bill data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refGrId]);

  const handleSelectGR = async (grId: string, prodList: Product[] = products) => {
    if (!grId) {
      setFormData((prev) => ({ ...prev, gr_id: "", po_id: "", supplier_id: "", lines: [] }));
      return;
    }
    try {
      const gr = await goodsReceiptApi.getGoodsReceiptById(grId);
      if (gr) {
        // Try to get PO prices if linked
        let poLines: any[] = [];
        if (gr.po_id) {
          try {
            const po = await purchaseOrderApi.getPOById(gr.po_id);
            if (po && po.line) poLines = po.line;
          } catch (e) {
            console.error("Failed to fetch PO details", e);
          }
        }

        const lines = (gr.line || []).map((l) => {
          // Get price from PO line or GR unit_cost
          const poLine = poLines.find(
            (pol) => pol.product_id === l.product_id
          );
          let price = poLine ? Number(poLine.unit_price) : Number(l.unit_cost);

          // Fallback to product sale_price
          if (!price) {
            const p = prodList.find((prod) => prod.id === l.product_id) || products.find((prod) => prod.id === l.product_id);
            if (p) price = Number(p.sale_price);
          }

          const qty = Number(l.qty);
          return {
            product_id: l.product_id.toString(),
            account_id: "",
            description: "",
            qty: qty,
            unit_price: price,
            line_amount: qty * price,
          };
        });

        setFormData((prev) => ({
          ...prev,
          gr_id: grId,
          po_id: gr.po_id ? gr.po_id.toString() : "",
          supplier_id: gr.supplier_id.toString(),
          lines: lines,
        }));
      }
    } catch (err) {
      console.error("Failed to load GR details", err);
    }
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { product_id: "", account_id: "", description: "", qty: 1, unit_price: 0, line_amount: 0 }],
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
      const payload: CreateSupplierBillRequest = {
        bill_date: new Date(formData.bill_date).toISOString(),
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        supplier_ref: formData.supplier_ref || undefined,
        supplier_id: Number(formData.supplier_id),
        po_id: formData.po_id ? Number(formData.po_id) : null,
        gr_id: formData.gr_id ? Number(formData.gr_id) : null,
        subtotal_amount: subtotal,
        vat_amount: vat,
        total_amount: total,
        created_by: userId,
        lines: formData.lines
          .map((l) => ({
            product_id: l.product_id ? Number(l.product_id) : null,
            account_id: l.account_id ? Number(l.account_id) : null,
            description: l.description || undefined,
            qty: Number(l.qty),
            unit_price: Number(l.unit_price),
            line_amount: Number(l.line_amount),
          }))
          .filter((l) => l.product_id || l.account_id || l.description),
      };

      await supplierBillApi.createBill(payload);
      setIsModalOpen(false);
      if (refGrId) {
        router.replace("/purchasing/bills");
      }
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + (err.message || "สร้างใบตั้งหนี้ไม่สำเร็จ"));
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างใบตั้งหนี้");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async (id: number) => {
    if (!confirm("ต้องการบันทึกบัญชี (Post) ใบตั้งหนี้นี้ใช่หรือไม่?")) return;
    try {
      await supplierBillApi.postBill(id);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + err.message);
      } else {
        alert("เกิดข้อผิดพลาดในการบันทึกบัญชี");
      }
    }
  };

  if (loading) return <div className="p-8">กำลังโหลด...</div>;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ใบตั้งหนี้</h1>
          <p className="mt-2 text-sm text-slate-600">บันทึกใบแจ้งหนี้จากผู้ขายเพื่อตั้งหนี้เจ้าหนี้การค้า</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              bill_date: new Date().toISOString().split("T")[0],
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              supplier_ref: "",
              supplier_id: "",
              po_id: "",
              gr_id: "",
              lines: [{ product_id: "", account_id: "", description: "", qty: 1, unit_price: 0, line_amount: 0 }],
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
        >
          + สร้างใบตั้งหนี้
        </button>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">เลขที่เอกสาร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ผู้ขาย</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">เลขที่อ้างอิงผู้ขาย</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">ยอดรวม</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">สถานะ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bills.map((bill) => (
              <tr key={bill.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{bill.bill_no}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {bill.supplier?.name || `Supplier #${bill.supplier_id}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{bill.supplier_ref || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-medium">
                  {Number(bill.total_amount).toLocaleString("th-TH", { style: "currency", currency: "THB" })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      bill.status === "posted"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {bill.status === "draft" ? "ร่าง" : bill.status === "posted" ? "บันทึกบัญชีแล้ว" : bill.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {bill.status === "draft" && (
                    <button
                      onClick={() => handlePost(bill.id)}
                      className="text-green-600 hover:text-green-900 mr-4"
                    >
                      บันทึกบัญชี (Post)
                    </button>
                  )}
                  {bill.status === "posted" && (
                    <button
                      onClick={() => router.push(`/purchasing/payments?ref_bill=${bill.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      สร้างใบจ่ายเงิน &gt;
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  ไม่มีข้อมูลใบตั้งหนี้
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
              <h2 className="text-lg font-bold text-slate-800">สร้างใบตั้งหนี้ใหม่</h2>
              <button disabled={submitting} onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="bill-form" onSubmit={handleSubmit}>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-md mb-6">
                  <label className="block text-sm font-semibold text-blue-800 mb-1">
                    ดึงข้อมูลอ้างอิงจากใบรับของ (Goods Receipt - GR)
                  </label>
                  <select
                    value={formData.gr_id}
                    onChange={(e) => handleSelectGR(e.target.value, products)}
                    className="w-full border-blue-200 bg-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3"
                  >
                    <option value="">-- ไม่ระบุอ้างอิง (สร้างใหม่) --</option>
                    {grs.map((gr) => (
                      <option key={gr.id} value={gr.id}>
                        {gr.gr_no} - {gr.supplier?.name} ({new Date(gr.gr_date).toLocaleDateString("th-TH")})
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
                      disabled={!!formData.gr_id}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                    >
                      <option value="">-- เลือกผู้ขาย --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เลขที่ใบแจ้งหนี้ผู้ขาย</label>
                    <input
                      type="text"
                      placeholder="เช่น INV-2026-0001"
                      value={formData.supplier_ref}
                      onChange={(e) => setFormData({ ...formData, supplier_ref: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ใบตั้งหนี้ *</label>
                    <input
                      type="date"
                      required
                      value={formData.bill_date}
                      onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันครบกำหนดชำระ</label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4 flex justify-between items-end">
                  <h3 className="text-md font-semibold text-slate-800">รายการในใบตั้งหนี้</h3>
                  <button type="button" onClick={handleAddLine} className="text-sm text-blue-600 font-medium hover:text-blue-800">+ เพิ่มรายการ</button>
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
                            value={line.product_id}
                            onChange={(e) => handleLineChange(idx, "product_id", e.target.value)}
                            className="w-full text-sm border-slate-300 rounded shadow-sm focus:ring-blue-500"
                          >
                            <option value="">-- เลือกสินค้า --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="number" min="0.01" step="0.01" required
                            value={line.qty}
                            onChange={(e) => handleLineChange(idx, "qty", Number(e.target.value))}
                            className="w-full text-right text-sm border-slate-300 rounded shadow-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number" min="0" step="0.01" required
                            value={line.unit_price}
                            onChange={(e) => handleLineChange(idx, "unit_price", Number(e.target.value))}
                            className="w-full text-right text-sm border-slate-300 rounded shadow-sm"
                          />
                        </td>
                        <td className="p-2 text-right text-sm font-medium bg-slate-50">
                          {line.line_amount.toLocaleString("th-TH")}
                        </td>
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => handleRemoveLine(idx)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end mt-4">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-600">มูลค่ารวม:</span><span className="font-medium text-slate-900">{subtotal.toLocaleString("th-TH")}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">ภาษีมูลค่าเพิ่ม 7%:</span><span className="font-medium text-slate-900">{vat.toLocaleString("th-TH")}</span></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><span className="font-bold text-slate-800">ยอดรวมทั้งสิ้น:</span><span className="font-bold text-blue-700">{total.toLocaleString("th-TH")}</span></div>
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button type="button" disabled={submitting} onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 font-medium disabled:opacity-50">ยกเลิก</button>
              <button type="submit" form="bill-form" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2">
                {submitting && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {submitting ? "กำลังบันทึก..." : "บันทึกใบตั้งหนี้"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillsPage() {
  return (
    <Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
      <BillsContent />
    </Suspense>
  );
}
