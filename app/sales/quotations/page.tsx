"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { matchesSearch } from "@/components/SearchContext";
import DocumentSearch from "@/components/DocumentSearch";
import { statusLabel, fmtDateShort } from "@/components/doc/docUtils";
import { quotationApi } from "@/lib/api/sales";
import { customerApi, productApi } from "@/lib/api/masterdata";
import type { Quotation, Customer, Product, CreateQuotationRequest } from "@/types";

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const visible = quotations.filter((qt) =>
    matchesSearch(query, [qt.qt_no, qt.customer?.name, statusLabel(qt.status), fmtDateShort(qt.qt_date), qt.total_amount, qt.note]),
  );
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewId, setViewId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    qt_date: string;
    valid_until: string;
    customer_id: string;
    note: string;
    lines: { product_id: string; qty: number; unit_price: number; line_amount: number; }[];
  }>({
    qt_date: new Date().toISOString().split("T")[0],
    valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    customer_id: "",
    note: "",
    lines: [],
  });

  const [userId, setUserId] = useState<number>(1); // Default to 1

  const fetchData = async () => {
    try {
      setLoading(true);
      const { authApi } = await import("@/lib/api");
      
      const [qtData, custData, prodData] = await Promise.all([
        quotationApi.getQuotations(),
        customerApi.getCustomers(),
        productApi.getProducts(),
      ]);
      setQuotations(qtData);
      setCustomers(custData);
      setProducts(prodData);
      
      try {
        const user = await authApi.getMe();
        if (user && user.id) setUserId(user.id);
      } catch (e) {
        console.error("Failed to get current user", e);
      }
    } catch (err) {
      console.error(err);
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
      lines: [...formData.lines, { product_id: "", qty: 1, unit_price: 0, line_amount: 0 }],
    });
  };

  const handleLineChange = (index: number, field: string, value: string | number) => {
    const newLines = [...formData.lines];
    const line = newLines[index] as any;
    line[field] = value;

    // Auto calculate price if product selected
    if (field === "product_id" && value) {
      const p = products.find(p => p.id.toString() === value.toString());
      if (p) {
        line.unit_price = Number(p.sale_price);
      }
    }
    
    line.line_amount = line.qty * line.unit_price;
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
      const payload: CreateQuotationRequest = {
        qt_date: new Date(formData.qt_date).toISOString(),
        valid_until: new Date(formData.valid_until).toISOString(),
        customer_id: Number(formData.customer_id),
        subtotal_amount: subtotal,
        vat_amount: vat,
        total_amount: total,
        note: formData.note,
        created_by: userId,
        lines: formData.lines.map(l => ({
          product_id: Number(l.product_id),
          qty: Number(l.qty),
          unit_price: Number(l.unit_price),
          line_amount: Number(l.line_amount)
        })).filter(l => l.product_id > 0)
      };
      await quotationApi.createQuotation(payload);
      setIsModalOpen(false);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + (err.message || "สร้างใบเสนอราคาไม่สำเร็จ"));
      } else {
        alert("สร้างใบเสนอราคาไม่สำเร็จ");
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
          <h1 className="text-2xl font-semibold text-slate-900">ใบเสนอราคา</h1>
        </div>
        <button
          onClick={() => {
            setFormData({
              qt_date: new Date().toISOString().split("T")[0],
              valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              customer_id: "",
              note: "",
              lines: [{ product_id: "", qty: 1, unit_price: 0, line_amount: 0 }],
            });
            setIsModalOpen(true);
          }}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          + สร้างใบเสนอราคา
        </button>
      </div>

      <DocumentSearch label="ค้นหาใบเสนอราคา" value={query} onChange={setQuery} shown={visible.length} total={quotations.length} />
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">เลขที่เอกสาร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">วันที่</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ลูกค้า</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">ยอดรวม</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visible.map((qt) => (
              <tr key={qt.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/sales/quotations/${qt.id}`}
                    className="text-brand-600 hover:text-brand-800 hover:underline"
                    title="ดูรายละเอียดเอกสาร"
                  >
                    {qt.qt_no}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{new Date(qt.qt_date).toLocaleDateString("th-TH")}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{qt.customer?.name || qt.customer_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">{Number(qt.total_amount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    qt.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : qt.status === 'pending'
                      ? 'bg-brand-100 text-brand-800'
                      : qt.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {qt.status === 'draft'
                      ? 'ร่าง'
                      : qt.status === 'pending'
                      ? 'ส่งแล้ว (รอตอบรับ)'
                      : qt.status === 'approved'
                      ? 'อนุมัติแล้ว'
                      : qt.status === 'cancelled'
                      ? 'ยกเลิก'
                      : qt.status}
                  </span>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  {quotations.length === 0
                    ? "ไม่มีข้อมูลใบเสนอราคา"
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
              <h2 className="text-lg font-bold text-slate-800">สร้างใบเสนอราคาใหม่</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="qt-form" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ลูกค้า *</label>
                    <select 
                      required 
                      value={formData.customer_id} 
                      onChange={e => setFormData({...formData, customer_id: e.target.value})}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                    >
                      <option value="">-- เลือกลูกค้า --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.qt_date} 
                      onChange={e => setFormData({...formData, qt_date: e.target.value})}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                    <input 
                      type="text" 
                      value={formData.note} 
                      onChange={e => setFormData({...formData, note: e.target.value})}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="mb-4 flex justify-between items-end">
                  <h3 className="text-md font-semibold text-slate-800">รายการสินค้า</h3>
                  <button type="button" onClick={handleAddLine} className="text-sm text-brand-600 font-medium hover:text-brand-800">
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
                            onChange={e => handleLineChange(idx, 'product_id', e.target.value)}
                            className="w-full text-sm border-slate-300 rounded shadow-sm focus:ring-brand-500"
                          >
                            <option value="">-- เลือกสินค้า --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                          </select>
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" min="1" required 
                            value={line.qty} 
                            onChange={e => handleLineChange(idx, 'qty', Number(e.target.value))}
                            className="w-full text-right text-sm border-slate-300 rounded shadow-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" min="0" step="0.01" required 
                            value={line.unit_price} 
                            onChange={e => handleLineChange(idx, 'unit_price', Number(e.target.value))}
                            className="w-full text-right text-sm border-slate-300 rounded shadow-sm"
                          />
                        </td>
                        <td className="p-2 text-right text-sm font-medium bg-slate-50">
                          {line.line_amount.toLocaleString('th-TH')}
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
                    <div className="flex justify-between"><span className="text-slate-600">มูลค่ารวม:</span><span className="font-medium text-slate-900">{subtotal.toLocaleString('th-TH')}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">ภาษีมูลค่าเพิ่ม 7%:</span><span className="font-medium text-slate-900">{vat.toLocaleString('th-TH')}</span></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><span className="font-bold text-slate-800">ยอดรวมทั้งสิ้น:</span><span className="font-bold text-brand-700">{total.toLocaleString('th-TH')}</span></div>
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
                form="qt-form" 
                disabled={submitting}
                className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {submitting ? "กำลังบันทึก..." : "บันทึกใบเสนอราคา"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
