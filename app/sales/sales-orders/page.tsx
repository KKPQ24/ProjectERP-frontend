"use client";

import { useEffect, useState, Suspense } from "react";
import { salesOrderApi, quotationApi } from "@/lib/api/sales";
import { customerApi, productApi } from "@/lib/api/masterdata";
import type { SalesOrder, Quotation, Customer, Product, CreateSalesOrderRequest } from "@/types";
import { useSearchParams, useRouter } from "next/navigation";

function SalesOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refQtId = searchParams.get('ref_qt');
  
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [userId, setUserId] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    so_date: string;
    customer_id: string;
    qt_id: string;
    note: string;
    lines: { product_id: string; qty: number; unit_price: number; line_amount: number; }[];
  }>({
    so_date: new Date().toISOString().split("T")[0],
    customer_id: "",
    qt_id: "",
    note: "",
    lines: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { authApi } = await import("@/lib/api");
      
      const [soData, qtData, custData, prodData] = await Promise.all([
        salesOrderApi.getSalesOrders(),
        quotationApi.getQuotations(),
        customerApi.getCustomers(),
        productApi.getProducts(),
      ]);
      setSalesOrders(soData);
      setQuotations(qtData.filter(q => q.status === 'approved')); // Only approved can be referenced
      setCustomers(custData);
      setProducts(prodData);
      
      try {
        const user = await authApi.getMe();
        if (user && user.id) setUserId(user.id);
      } catch (e) {
        console.error("Failed to fetch current user", e);
      }
      
      if (refQtId && !isModalOpen) {
        handleSelectQuotation(refQtId, qtData);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refQtId]);

  const handleSelectQuotation = async (qtId: string, qtList: Quotation[] = quotations) => {
    if (!qtId) {
      setFormData(prev => ({ ...prev, qt_id: "", lines: [] }));
      return;
    }
    try {
      const qt = await quotationApi.getQuotationById(qtId);
      if (qt) {
        setFormData({
          ...formData,
          qt_id: qtId,
          customer_id: qt.customer_id.toString(),
          note: qt.note ? `อ้างอิงใบเสนอราคา ${qt.qt_no} - ${qt.note}` : `อ้างอิงใบเสนอราคา ${qt.qt_no}`,
          lines: qt.line?.map(l => ({
            product_id: l.product_id.toString(),
            qty: Number(l.qty),
            unit_price: Number(l.unit_price),
            line_amount: Number(l.line_amount)
          })) || []
        });
      }
    } catch (err) {
      console.error("Failed to load quotation details", err);
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
      const p = products.find(p => p.id.toString() === value.toString());
      if (p) line.unit_price = Number(p.sale_price);
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
      const payload: CreateSalesOrderRequest = {
        so_date: new Date(formData.so_date).toISOString(),
        customer_id: Number(formData.customer_id),
        qt_id: formData.qt_id ? Number(formData.qt_id) : null,
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
      await salesOrderApi.createSalesOrder(payload);
      setIsModalOpen(false);
      // Clear ref_qt param from URL if present
      if (refQtId) {
        router.replace("/sales/sales-orders");
      }
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + (err.message || "สร้างใบสั่งขายไม่สำเร็จ"));
      } else {
        alert("สร้างใบสั่งขายไม่สำเร็จ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm("คุณต้องการอนุมัติใบสั่งขายนี้ใช่หรือไม่?")) return;
    try {
      await salesOrderApi.approveSalesOrder(id);
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + err.message);
      } else {
        alert("อนุมัติใบสั่งขายไม่สำเร็จ");
      }
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("ต้องการยกเลิกใบสั่งขายนี้ใช่หรือไม่?")) return;
    try {
      await salesOrderApi.cancelSalesOrder(id);
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + err.message);
      } else {
        alert("ยกเลิกใบสั่งขายไม่สำเร็จ");
      }
    }
  };

  if (loading) return <div className="p-8">กำลังโหลด...</div>;

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ใบสั่งขาย</h1>
          <p className="mt-2 text-sm text-slate-600">จัดการข้อมูลใบสั่งขายเพื่อเตรียมจัดส่งสินค้า</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              so_date: new Date().toISOString().split("T")[0],
              customer_id: "",
              qt_id: "",
              note: "",
              lines: [{ product_id: "", qty: 1, unit_price: 0, line_amount: 0 }],
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
        >
          + สร้างใบสั่งขาย
        </button>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">เลขที่เอกสาร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">อ้างอิงใบเสนอราคา</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ลูกค้า</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">ยอดรวม</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">สถานะ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {salesOrders.map(so => (
              <tr key={so.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{so.so_no}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{so.quotation?.qt_no || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{so.customer?.name || so.customer_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">{Number(so.total_amount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${so.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {so.status === 'draft' ? 'ร่าง' : so.status === 'approved' ? 'อนุมัติแล้ว' : so.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {so.status === 'draft' && (
                    <>
                      <button onClick={() => handleApprove(so.id)} className="text-green-600 hover:text-green-900 mr-4">อนุมัติ</button>
                      <button onClick={() => handleCancel(so.id)} className="text-red-500 hover:text-red-700 mr-2">ยกเลิก</button>
                    </>
                  )}
                  {so.status === 'approved' && (
                    <button onClick={() => {
                      router.push(`/sales/shipments?ref_so=${so.id}`);
                    }} className="text-blue-600 hover:text-blue-900">สร้างใบส่งของ</button>
                  )}
                  {so.status === 'cancelled' && (
                    <span className="text-slate-400">ยกเลิกแล้ว</span>
                  )}
                </td>
              </tr>
            ))}
            {salesOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">ไม่มีข้อมูลใบสั่งขาย</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">สร้างใบสั่งขายใหม่</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="so-form" onSubmit={handleSubmit}>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-md mb-6">
                  <label className="block text-sm font-semibold text-blue-800 mb-1">
                    ดึงข้อมูลอ้างอิงจากใบเสนอราคา (Quotation)
                  </label>
                  <select 
                    value={formData.qt_id} 
                    onChange={e => handleSelectQuotation(e.target.value)}
                    className="w-full border-blue-200 bg-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3"
                  >
                    <option value="">-- ไม่ระบุอ้างอิง (สร้างใหม่) --</option>
                    {quotations.map(qt => (
                      <option key={qt.id} value={qt.id}>
                        {qt.qt_no} - {qt.customer?.name} (ยอดรวม: {Number(qt.total_amount).toLocaleString('th-TH')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ลูกค้า *</label>
                    <select 
                      required 
                      value={formData.customer_id} 
                      onChange={e => setFormData({...formData, customer_id: e.target.value})}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                      disabled={!!formData.qt_id} // If referenced QT, should not change customer easily
                    >
                      <option value="">-- เลือกลูกค้า --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่สั่งขาย *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.so_date} 
                      onChange={e => setFormData({...formData, so_date: e.target.value})}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ</label>
                    <input 
                      type="text" 
                      value={formData.note} 
                      onChange={e => setFormData({...formData, note: e.target.value})}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4 flex justify-between items-end">
                  <h3 className="text-md font-semibold text-slate-800">รายการสินค้า</h3>
                  <button type="button" onClick={handleAddLine} className="text-sm text-blue-600 font-medium hover:text-blue-800">
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
                            className="w-full text-sm border-slate-300 rounded shadow-sm focus:ring-blue-500"
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
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><span className="font-bold text-slate-800">ยอดรวมทั้งสิ้น:</span><span className="font-bold text-blue-700">{total.toLocaleString('th-TH')}</span></div>
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
                form="so-form" 
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {submitting ? "กำลังบันทึก..." : "บันทึกใบสั่งขาย"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesOrdersPage() {
  return (
    <Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
      <SalesOrdersContent />
    </Suspense>
  );
}
