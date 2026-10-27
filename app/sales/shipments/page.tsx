"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { matchesSearch } from "@/components/SearchContext";
import DocumentSearch from "@/components/DocumentSearch";
import { statusLabel, fmtDateShort } from "@/components/doc/docUtils";
import { shipmentApi, salesOrderApi } from "@/lib/api/sales";
import { customerApi, productApi } from "@/lib/api/masterdata";
import type { Shipment, SalesOrder, Customer, Product, CreateShipmentRequest } from "@/types";
import { useSearchParams, useRouter } from "next/navigation";

function ShipmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refSoId = searchParams.get('ref_so');
  
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const visible = shipments.filter((sh) =>
    matchesSearch(query, [sh.sh_no, sh.sales_order?.so_no, sh.customer?.name, statusLabel(sh.status), fmtDateShort(sh.sh_date), sh.note]),
  );
  
  const [userId, setUserId] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    sh_date: string;
    customer_id: string;
    so_id: string;
    note: string;
    lines: { product_id: string; qty: number; so_line_id: string; }[];
  }>({
    sh_date: new Date().toISOString().split("T")[0],
    customer_id: "",
    so_id: "",
    note: "",
    lines: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { authApi } = await import("@/lib/api");
      
      const [shData, soData, custData, prodData] = await Promise.all([
        shipmentApi.getShipments(),
        salesOrderApi.getSalesOrders(),
        customerApi.getCustomers(),
        productApi.getProducts(),
      ]);
      setShipments(shData);
      setSalesOrders(soData.filter(so => so.status === 'approved')); // Only approved SO
      setCustomers(custData);
      setProducts(prodData);
      
      try {
        const user = await authApi.getMe();
        if (user && user.id) setUserId(user.id);
      } catch (e) {
        console.error("Failed to fetch current user", e);
      }
      
      if (refSoId && !isModalOpen) {
        handleSelectSO(refSoId, soData);
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
  }, [refSoId]);

  const handleSelectSO = async (soId: string, soList: SalesOrder[] = salesOrders) => {
    if (!soId) {
      setFormData(prev => ({ ...prev, so_id: "", lines: [] }));
      return;
    }
    try {
      const so = await salesOrderApi.getSalesOrderById(soId);
      if (so) {
        setFormData({
          ...formData,
          so_id: soId,
          customer_id: so.customer_id.toString(),
          note: so.note ? `อ้างอิงใบสั่งขาย ${so.so_no} - ${so.note}` : `อ้างอิงใบสั่งขาย ${so.so_no}`,
          lines: so.line?.map(l => ({
            product_id: l.product_id.toString(),
            qty: Number(l.qty),
            so_line_id: l.id ? l.id.toString() : "",
          })) || []
        });
      }
    } catch (err) {
      console.error("Failed to load SO details", err);
    }
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { product_id: "", qty: 1, so_line_id: "" }],
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
      const payload: CreateShipmentRequest = {
        sh_date: new Date(formData.sh_date).toISOString(),
        customer_id: Number(formData.customer_id),
        so_id: formData.so_id ? Number(formData.so_id) : null,
        note: formData.note,
        created_by: userId,
        lines: formData.lines.map(l => ({
          product_id: Number(l.product_id),
          qty: Number(l.qty),
          so_line_id: l.so_line_id ? Number(l.so_line_id) : null
        })).filter(l => l.product_id > 0)
      };
      await shipmentApi.createShipment(payload);
      setIsModalOpen(false);
      if (refSoId) {
        router.replace("/sales/shipments");
      }
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + (err.message || "สร้างใบส่งของไม่สำเร็จ"));
      } else {
        alert("สร้างใบส่งของไม่สำเร็จ");
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
          <h1 className="text-2xl font-semibold text-slate-900">ใบส่งของ</h1>
        </div>
        <button
          onClick={() => {
            setFormData({
              sh_date: new Date().toISOString().split("T")[0],
              customer_id: "",
              so_id: "",
              note: "",
              lines: [{ product_id: "", qty: 1, so_line_id: "" }],
            });
            setIsModalOpen(true);
          }}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          + สร้างใบส่งของ
        </button>
      </div>

      <DocumentSearch label="ค้นหาใบส่งของ" value={query} onChange={setQuery} shown={visible.length} total={shipments.length} />
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">เลขที่เอกสาร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">อ้างอิงใบสั่งขาย</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ลูกค้า</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visible.map((sh) => (
              <tr key={sh.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/sales/shipments/${sh.id}`}
                    className="text-brand-600 hover:text-brand-800 hover:underline"
                    title="ดูรายละเอียดเอกสาร"
                  >
                    {sh.sh_no}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{sh.sales_order?.so_no || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{sh.customer?.name || sh.customer_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${sh.status === 'posted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {sh.status === 'draft' ? 'ร่าง' : sh.status === 'posted' ? 'บันทึกบัญชีแล้ว' : sh.status}
                  </span>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  {shipments.length === 0
                    ? "ไม่มีข้อมูลใบส่งของ"
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
              <h2 className="text-lg font-bold text-slate-800">สร้างใบส่งของใหม่</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="sh-form" onSubmit={handleSubmit}>
                <div className="bg-brand-50 border border-brand-100 p-4 rounded-md mb-6">
                  <label className="block text-sm font-semibold text-brand-800 mb-1">
                    ดึงข้อมูลอ้างอิงจากใบสั่งขาย (Sales Order)
                  </label>
                  <select 
                    value={formData.so_id} 
                    onChange={e => handleSelectSO(e.target.value)}
                    className="w-full border-brand-200 bg-white rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3"
                  >
                    <option value="">-- ไม่ระบุอ้างอิง (สร้างใหม่) --</option>
                    {salesOrders.map(so => (
                      <option key={so.id} value={so.id}>
                        {so.so_no} - {so.customer?.name}
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
                      disabled={!!formData.so_id}
                    >
                      <option value="">-- เลือกลูกค้า --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ส่งของ *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.sh_date} 
                      onChange={e => setFormData({...formData, sh_date: e.target.value})}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  <div className="col-span-2">
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
                  <h3 className="text-md font-semibold text-slate-800">รายการสินค้าจัดส่ง</h3>
                  <button type="button" onClick={handleAddLine} className="text-sm text-brand-600 font-medium hover:text-brand-800">
                    + เพิ่มรายการ
                  </button>
                </div>
                
                <table className="w-full border border-slate-200 mb-4 rounded-md overflow-hidden">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3 text-left text-sm font-medium text-slate-600">สินค้า</th>
                      <th className="py-2 px-3 text-right text-sm font-medium text-slate-600 w-32">จำนวนส่งมอบ</th>
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
                        <td className="p-2 text-center">
                          <button type="button" onClick={() => handleRemoveLine(idx)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
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
                form="sh-form" 
                disabled={submitting}
                className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {submitting ? "กำลังบันทึก..." : "บันทึกใบส่งของ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShipmentsPage() {
  return (
    <Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
      <ShipmentsContent />
    </Suspense>
  );
}
