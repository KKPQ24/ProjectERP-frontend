"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { matchesSearch } from "@/components/SearchContext";
import DocumentSearch from "@/components/DocumentSearch";
import { useAuth } from "@/components/AuthProvider";
import { canAccessPath, fetchIfAllowed } from "@/lib/access";
import { statusLabel, fmtDateShort } from "@/components/doc/docUtils";
import { receiptApi, invoiceApi } from "@/lib/api/sales";
import { customerApi, accountApi } from "@/lib/api/masterdata";
import type { Receipt, Invoice, Customer, Account, CreateReceiptRequest, PayMethod } from "@/types";
import { useSearchParams, useRouter } from "next/navigation";

function ReceiptsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: sessionUser } = useAuth();
  const canSelectAccount = canAccessPath("/masterdata/accounts", sessionUser?.roles ?? []);
  const refInvId = searchParams.get('ref_inv');
  
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const visible = receipts.filter((rec) =>
    matchesSearch(query, [rec.receipt_no, rec.customer?.name, statusLabel(rec.status), fmtDateShort(rec.receipt_date), rec.amount, rec.note]),
  );
  
  const [userId, setUserId] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    receipt_date: string;
    customer_id: string;
    method: PayMethod;
    cash_account_id: string;
    amount: number;
    note: string;
    allocations: { invoice_id: string; amount: number; inv_no?: string; total_amount?: number; }[];
  }>({
    receipt_date: new Date().toISOString().split("T")[0],
    customer_id: "",
    method: "transfer",
    cash_account_id: "",
    amount: 0,
    note: "",
    allocations: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { authApi } = await import("@/lib/api");
      
      const [recData, invData, custData, accData] = await Promise.all([
        receiptApi.getReceipts(),
        invoiceApi.getInvoices(),
        customerApi.getCustomers(),
        fetchIfAllowed("/masterdata/accounts", sessionUser?.roles ?? [], () => accountApi.getAccounts()),
      ]);
      setReceipts(recData);
      setInvoices(invData.filter(inv => inv.status === 'posted'));
      setCustomers(custData);
      setAccounts(accData.filter(a => a.type === 'asset'));
      
      try {
        const user = await authApi.getMe();
        if (user && user.id) setUserId(user.id);
      } catch (e) {
        console.error("Failed to fetch current user", e);
      }
      
      if (refInvId && !isModalOpen && canSelectAccount) {
        handleSelectInvoice(refInvId, invData);
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
  }, [refInvId]);

  const handleSelectInvoice = async (invId: string, invList: Invoice[] = invoices) => {
    if (!invId) {
      setFormData(prev => ({ ...prev, allocations: [], amount: 0 }));
      return;
    }
    try {
      const inv = await invoiceApi.getInvoiceById(invId);
      if (inv) {
        setFormData({
          ...formData,
          customer_id: inv.customer_id.toString(),
          amount: Number(inv.total_amount),
          note: `รับชำระตาม ${inv.inv_no}`,
          allocations: [{
            invoice_id: invId,
            amount: Number(inv.total_amount),
            inv_no: inv.inv_no,
            total_amount: Number(inv.total_amount)
          }]
        });
      }
    } catch (err) {
      console.error("Failed to load Invoice details", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const payload: CreateReceiptRequest = {
        receipt_date: new Date(formData.receipt_date).toISOString(),
        customer_id: Number(formData.customer_id),
        method: formData.method,
        cash_account_id: Number(formData.cash_account_id),
        amount: Number(formData.amount),
        note: formData.note,
        created_by: userId,
        allocations: formData.allocations.map(a => ({
          invoice_id: Number(a.invoice_id),
          amount: Number(a.amount)
        }))
      };
      await receiptApi.createReceipt(payload);
      setIsModalOpen(false);
      if (refInvId) {
        router.replace("/sales/receipts");
      }
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + (err.message || "สร้างใบรับเงินไม่สำเร็จ"));
      } else {
        alert("สร้างใบรับเงินไม่สำเร็จ");
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
          <h1 className="text-2xl font-semibold text-slate-900">ใบรับเงิน</h1>
        </div>
        <button
          disabled={!canSelectAccount}
          title={canSelectAccount ? undefined : "ต้องมีสิทธิ์บัญชีเพื่อเลือกบัญชีรับ/จ่ายเงิน"}
          onClick={() => {
            setFormData({
              receipt_date: new Date().toISOString().split("T")[0],
              customer_id: "",
              method: "transfer",
              cash_account_id: "",
              amount: 0,
              note: "",
              allocations: [],
            });
            setIsModalOpen(true);
          }}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + สร้างใบรับเงิน
        </button>
      </div>

      {!canSelectAccount && <p className="mb-4 text-xs text-slate-500">ต้องมีสิทธิ์บัญชีเพื่อเลือกบัญชีรับ/จ่ายเงิน</p>}

      <DocumentSearch label="ค้นหาใบรับเงิน" value={query} onChange={setQuery} shown={visible.length} total={receipts.length} />
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">เลขที่เอกสาร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ลูกค้า</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ช่องทาง</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">ยอดรวมรับ</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {visible.map((rec) => (
              <tr key={rec.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/sales/receipts/${rec.id}`}
                    className="text-brand-600 hover:text-brand-800 hover:underline"
                    title="ดูรายละเอียดเอกสาร"
                  >
                    {rec.receipt_no}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{rec.customer?.name || rec.customer_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{rec.method}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">{Number(rec.amount).toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${rec.status === 'posted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {rec.status === 'draft' ? 'ร่าง' : rec.status === 'posted' ? 'บันทึกบัญชีแล้ว' : rec.status}
                  </span>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  {receipts.length === 0
                    ? "ไม่มีข้อมูลใบรับเงิน"
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
              <h2 className="text-lg font-bold text-slate-800">สร้างใบรับเงินใหม่</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-600">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="rec-form" onSubmit={handleSubmit}>
                <div className="bg-brand-50 border border-brand-100 p-4 rounded-md mb-6 flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-brand-800 mb-1">
                      ดึงข้อมูลอ้างอิงจากใบแจ้งหนี้ (Invoice)
                    </label>
                    <select 
                      onChange={e => handleSelectInvoice(e.target.value)}
                      className="w-full border-brand-200 bg-white rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3"
                    >
                      <option value="">-- เลือกใบแจ้งหนี้เพื่อตัดจ่าย --</option>
                      {invoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.inv_no} - {inv.customer?.name} (ยอด: {Number(inv.total_amount).toLocaleString('th-TH')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

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
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่รับเงิน *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.receipt_date} 
                      onChange={e => setFormData({...formData, receipt_date: e.target.value})}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">บัญชีรับเงิน *</label>
                    <select 
                      required 
                      value={formData.cash_account_id} 
                      onChange={e => setFormData({...formData, cash_account_id: e.target.value})}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                    >
                      <option value="">-- เลือกบัญชี --</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">ช่องทาง *</label>
                      <select 
                        required 
                        value={formData.method} 
                        onChange={e => setFormData({...formData, method: e.target.value as PayMethod})}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500"
                      >
                        <option value="cash">เงินสด</option>
                        <option value="transfer">โอนเงิน</option>
                        <option value="cheque">เช็ค</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">ยอดรับจริง *</label>
                      <input 
                        type="number" step="0.01" min="0" required 
                        value={formData.amount} 
                        onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-right"
                      />
                    </div>
                  </div>
                </div>

                {formData.allocations.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-md font-semibold text-slate-800 mb-2">ตัดหนี้ใบแจ้งหนี้</h3>
                    <table className="w-full border border-slate-200 rounded-md overflow-hidden">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 text-left text-sm font-medium text-slate-600">เลขที่เอกสาร</th>
                          <th className="py-2 px-3 text-right text-sm font-medium text-slate-600">ยอดรวม</th>
                          <th className="py-2 px-3 text-right text-sm font-medium text-slate-600">ยอดตัดหนี้</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.allocations.map((alloc, idx) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="p-2 font-medium">{alloc.inv_no}</td>
                            <td className="p-2 text-right">{alloc.total_amount?.toLocaleString('th-TH')}</td>
                            <td className="p-2">
                              <input 
                                type="number" step="0.01" max={alloc.total_amount} required
                                value={alloc.amount}
                                onChange={e => {
                                  const newAlloc = [...formData.allocations];
                                  newAlloc[idx].amount = Number(e.target.value);
                                  setFormData({...formData, allocations: newAlloc});
                                }}
                                className="w-full text-right text-sm border-slate-300 rounded shadow-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                form="rec-form" 
                disabled={submitting}
                className="px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {submitting ? "กำลังบันทึก..." : "บันทึกใบรับเงิน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
      <ReceiptsContent />
    </Suspense>
  );
}
