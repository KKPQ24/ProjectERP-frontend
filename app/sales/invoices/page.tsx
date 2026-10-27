"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { matchesSearch } from "@/components/SearchContext";
import DocumentSearch from "@/components/DocumentSearch";
import { useAuth } from "@/components/AuthProvider";
import { canAccessPath, fetchIfAllowed } from "@/lib/access";
import { statusLabel, fmtDateShort } from "@/components/doc/docUtils";
import { invoiceApi, shipmentApi, salesOrderApi } from "@/lib/api/sales";
import { customerApi, productApi } from "@/lib/api/masterdata";
import type { Invoice, Shipment, Customer, Product, CreateInvoiceRequest } from "@/types";
import { useSearchParams, useRouter } from "next/navigation";

function InvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: sessionUser } = useAuth();
  const refShId = searchParams.get('ref_sh');
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const visible = invoices.filter((inv) =>
    matchesSearch(query, [inv.inv_no, inv.sales_order?.so_no, inv.customer?.name, statusLabel(inv.status), fmtDateShort(inv.inv_date), inv.total_amount]),
  );
  
  const [userId, setUserId] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    inv_date: string;
    due_date: string;
    customer_id: string;
    shipment_id: string;
    so_id: string;
    lines: { product_id: string; qty: number; unit_price: number; line_amount: number; }[];
  }>({
    inv_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    customer_id: "",
    shipment_id: "",
    so_id: "",
    lines: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { authApi } = await import("@/lib/api");
      
      const [invData, shData, custData, prodData] = await Promise.all([
        invoiceApi.getInvoices(),
        fetchIfAllowed("/sales/shipments", sessionUser?.roles ?? [], () => shipmentApi.getShipments()),
        customerApi.getCustomers(),
        productApi.getProducts(),
      ]);
      setInvoices(invData);
      setShipments(shData.filter(sh => sh.status === 'posted'));
      setCustomers(custData);
      setProducts(prodData);
      
      try {
        const user = await authApi.getMe();
        if (user && user.id) setUserId(user.id);
      } catch (e) {
        console.error("Failed to fetch current user", e);
      }
      
      if (refShId && !isModalOpen && canAccessPath("/sales/shipments", sessionUser?.roles ?? [])) {
        await handleSelectShipment(refShId, shData, prodData);
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
  }, [refShId]);

  const handleSelectShipment = async (
    shId: string, 
    shList: Shipment[] = shipments,
    prodList: Product[] = products
  ) => {
    if (!shId) {
      setFormData(prev => ({ ...prev, shipment_id: "", so_id: "", lines: [] }));
      return;
    }
    try {
      const sh = await shipmentApi.getShipmentById(shId);
      if (sh) {
        // If shipment is linked to a sales order, fetch SO to get agreed line prices
        let soLines: any[] = [];
        if (sh.so_id) {
          try {
            const so = await salesOrderApi.getSalesOrderById(sh.so_id);
            if (so && so.line) {
              soLines = so.line;
            }
          } catch (e) {
            console.error("Failed to fetch SO details", e);
          }
        }

        const lines = (sh.line || []).map(l => {
          // 1. Look for price from original SO line
          const soLine = soLines.find(
            sol => (l.so_line_id && sol.id === l.so_line_id) || sol.product_id === l.product_id
          );
          let price = soLine ? Number(soLine.unit_price) : 0;

          // 2. Look for price from product included in shipment
          if (!price && (l as any).product?.sale_price) {
            price = Number((l as any).product.sale_price);
          }

          // 3. Fallback to product catalog list
          if (!price) {
            const p = prodList.find(prod => prod.id === l.product_id) || products.find(prod => prod.id === l.product_id);
            if (p) price = Number(p.sale_price);
          }

          const qty = Number(l.qty);
          return {
            product_id: l.product_id.toString(),
            qty: qty,
            unit_price: price,
            line_amount: qty * price
          };
        });

        setFormData(prev => ({
          ...prev,
          shipment_id: shId,
          so_id: sh.so_id ? sh.so_id.toString() : "",
          customer_id: sh.customer_id.toString(),
          lines: lines
        }));
      }
    } catch (err) {
      console.error("Failed to load Shipment details", err);
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
      const payload: CreateInvoiceRequest = {
        inv_date: new Date(formData.inv_date).toISOString(),
        due_date: new Date(formData.due_date).toISOString(),
        customer_id: Number(formData.customer_id),
        shipment_id: formData.shipment_id ? Number(formData.shipment_id) : null,
        so_id: formData.so_id ? Number(formData.so_id) : null,
        subtotal_amount: subtotal,
        vat_amount: vat,
        total_amount: total,
        created_by: userId,
        lines: formData.lines.map(l => ({
          product_id: Number(l.product_id),
          qty: Number(l.qty),
          unit_price: Number(l.unit_price),
          line_amount: Number(l.line_amount)
        })).filter(l => l.product_id > 0)
      };
      await invoiceApi.createInvoice(payload);
      setIsModalOpen(false);
      if (refShId) {
        router.replace("/sales/invoices");
      }
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + (err.message || "สร้างใบแจ้งหนี้ไม่สำเร็จ"));
      } else {
        alert("สร้างใบแจ้งหนี้ไม่สำเร็จ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async (id: number) => {
    if (!confirm("คุณต้องการบันทึกบัญชีใบแจ้งหนี้นี้ใช่หรือไม่?")) return;
    try {
      await invoiceApi.postInvoice(id);
      await fetchData();
    } catch (err: unknown) {
      alert("เกิดข้อผิดพลาด: " + (err instanceof Error ? err.message : "บันทึกบัญชีไม่สำเร็จ"));
    }
  };

  if (loading) return <div className="p-8">กำลังโหลด...</div>;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ใบแจ้งหนี้</h1>
        </div>
        <button
          onClick={() => {
            setFormData({
              inv_date: new Date().toISOString().split("T")[0],
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
              customer_id: "",
              shipment_id: "",
              so_id: "",
              lines: [{ product_id: "", qty: 1, unit_price: 0, line_amount: 0 }],
            });
            setIsModalOpen(true);
          }}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          + สร้างใบแจ้งหนี้
        </button>
      </div>

      <DocumentSearch label="ค้นหาใบแจ้งหนี้" value={query} onChange={setQuery} shown={visible.length} total={invoices.length} />
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">เลขที่เอกสาร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">อ้างอิงใบส่งของ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ลูกค้า</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">ยอดรวม</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">สถานะ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visible.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/sales/invoices/${inv.id}`}
                    className="text-brand-600 hover:text-brand-800 hover:underline"
                    title="ดูรายละเอียดเอกสาร"
                  >
                    {inv.inv_no}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{inv.shipment?.sh_no || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{inv.customer?.name || inv.customer_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">{Number(inv.total_amount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${inv.status === 'posted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {inv.status === 'draft' ? 'ร่าง' : inv.status === 'posted' ? 'บันทึกบัญชีแล้ว' : inv.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {inv.status === 'draft' && (
                    <button onClick={() => handlePost(inv.id)} className="text-green-600 hover:text-green-900 mr-4">บันทึกบัญชี</button>
                  )}
                  {inv.status === 'posted' && (
                    <button onClick={() => router.push(`/sales/receipts?ref_inv=${inv.id}`)} className="text-brand-600 hover:text-brand-900">สร้างใบรับเงิน</button>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  {invoices.length === 0
                    ? "ไม่มีข้อมูลใบแจ้งหนี้"
                    : `ไม่พบรายการที่ตรงกับ “${query.trim()}”`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">สร้างใบแจ้งหนี้ใหม่</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="inv-form" onSubmit={handleSubmit}>
                <div className="bg-brand-50 border border-brand-100 p-4 rounded-md mb-6">
                  <label className="block text-sm font-semibold text-brand-800 mb-1">
                    ดึงข้อมูลอ้างอิงจากใบส่งของ (Shipment)
                  </label>
                  <select 
                    value={formData.shipment_id} 
                    onChange={e => handleSelectShipment(e.target.value, shipments, products)}
                    className="w-full border-brand-200 bg-white rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3"
                  >
                    <option value="">-- ไม่ระบุอ้างอิง (สร้างใหม่) --</option>
                    {shipments.map(sh => (
                      <option key={sh.id} value={sh.id}>
                        {sh.sh_no} - {sh.customer?.name}
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
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-100"
                      disabled={!!formData.shipment_id}
                    >
                      <option value="">-- เลือกลูกค้า --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">วันที่แจ้งหนี้ *</label>
                      <input 
                        type="date" 
                        required 
                        value={formData.inv_date} 
                        onChange={e => setFormData({...formData, inv_date: e.target.value})}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">ครบกำหนด *</label>
                      <input 
                        type="date" 
                        required 
                        value={formData.due_date} 
                        onChange={e => setFormData({...formData, due_date: e.target.value})}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex justify-between items-end">
                  <h3 className="text-md font-semibold text-slate-800">รายการเรียกเก็บเงิน</h3>
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
                form="inv-form" 
                disabled={submitting}
                className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {submitting ? "กำลังบันทึก..." : "บันทึกใบแจ้งหนี้"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
      <InvoicesContent />
    </Suspense>
  );
}
