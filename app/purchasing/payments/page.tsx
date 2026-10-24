"use client";

import { useEffect, useState, Suspense } from "react";
import { paymentApi, supplierBillApi } from "@/lib/api/purchasing";
import { supplierApi, accountApi } from "@/lib/api/masterdata";
import type { Payment, SupplierBill, Supplier, Account, CreatePaymentRequest, PayMethod } from "@/types";
import { useSearchParams, useRouter } from "next/navigation";

function PaymentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refBillId = searchParams.get("ref_bill");

  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<{
    payment_date: string;
    supplier_id: string;
    method: PayMethod;
    cash_account_id: string;
    amount: number;
    note: string;
    allocations: { bill_id: string; amount: number; bill_no?: string; total_amount?: number }[];
  }>({
    payment_date: new Date().toISOString().split("T")[0],
    supplier_id: "",
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

      const [payData, billData, supData, accData] = await Promise.all([
        paymentApi.getPayments(),
        supplierBillApi.getBills(),
        supplierApi.getSuppliers(),
        accountApi.getAccounts(),
      ]);
      setPayments(payData);
      setBills(billData.filter((b) => b.status === "posted"));
      setSuppliers(supData);
      setAccounts(accData.filter((a) => a.type === "asset"));

      try {
        const user = await authApi.getMe();
        if (user && user.id) setUserId(user.id);
      } catch (e) {
        console.error("Failed to fetch user", e);
      }

      if (refBillId && !isModalOpen) {
        await handleSelectBill(refBillId, billData);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to load Payment data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refBillId]);

  const handleSelectBill = async (billId: string, billList: SupplierBill[] = bills) => {
    if (!billId) {
      setFormData((prev) => ({ ...prev, allocations: [], amount: 0, supplier_id: "" }));
      return;
    }
    try {
      const bill = await supplierBillApi.getBillById(billId);
      if (bill) {
        setFormData((prev) => ({
          ...prev,
          supplier_id: bill.supplier_id.toString(),
          amount: Number(bill.total_amount),
          note: `จ่ายชำระตาม ${bill.bill_no}${bill.supplier_ref ? ` (Ref: ${bill.supplier_ref})` : ""}`,
          allocations: [
            {
              bill_id: billId,
              amount: Number(bill.total_amount),
              bill_no: bill.bill_no,
              total_amount: Number(bill.total_amount),
            },
          ],
        }));
      }
    } catch (err) {
      console.error("Failed to load Bill details", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const payload: CreatePaymentRequest = {
        payment_date: new Date(formData.payment_date).toISOString(),
        supplier_id: Number(formData.supplier_id),
        method: formData.method,
        cash_account_id: Number(formData.cash_account_id),
        amount: Number(formData.amount),
        note: formData.note,
        created_by: userId,
        allocations: formData.allocations.map((a) => ({
          bill_id: Number(a.bill_id),
          amount: Number(a.amount),
        })),
      };
      await paymentApi.createPayment(payload);
      setIsModalOpen(false);
      if (refBillId) {
        router.replace("/purchasing/payments");
      }
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("เกิดข้อผิดพลาด: " + (err.message || "สร้างใบจ่ายเงินไม่สำเร็จ"));
      } else {
        alert("เกิดข้อผิดพลาดในการสร้างใบจ่ายเงิน");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async (id: number) => {
    if (!confirm("ต้องการบันทึกบัญชี (Post) ใบจ่ายเงินนี้ใช่หรือไม่?")) return;
    try {
      await paymentApi.postPayment(id);
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
          <h1 className="text-2xl font-semibold text-slate-900">ใบจ่ายเงิน</h1>
          <p className="mt-2 text-sm text-slate-600">จัดการการจ่ายชำระเงินให้ผู้ขายเพื่อตัดหนี้เจ้าหนี้การค้า</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              payment_date: new Date().toISOString().split("T")[0],
              supplier_id: "",
              method: "transfer",
              cash_account_id: "",
              amount: 0,
              note: "",
              allocations: [],
            });
            setIsModalOpen(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
        >
          + สร้างใบจ่ายเงิน
        </button>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">เลขที่เอกสาร</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ผู้ขาย</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ช่องทาง</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">ยอดจ่าย</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">สถานะ</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {payments.map((pay) => (
              <tr key={pay.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{pay.payment_no}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  {pay.supplier?.name || `Supplier #${pay.supplier_id}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {pay.method === "cash" ? "เงินสด" : pay.method === "transfer" ? "โอนเงิน" : pay.method === "cheque" ? "เช็ค" : pay.method}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-medium">
                  {Number(pay.amount).toLocaleString("th-TH", { style: "currency", currency: "THB" })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      pay.status === "posted"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {pay.status === "draft" ? "ร่าง" : pay.status === "posted" ? "บันทึกบัญชีแล้ว" : pay.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {pay.status === "draft" && (
                    <button
                      onClick={() => handlePost(pay.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      บันทึกบัญชี (Post)
                    </button>
                  )}
                  {pay.status === "posted" && (
                    <span className="text-slate-400">สิ้นสุดขั้นตอน</span>
                  )}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  ไม่มีข้อมูลใบจ่ายเงิน
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
              <h2 className="text-lg font-bold text-slate-800">สร้างใบจ่ายเงินใหม่</h2>
              <button disabled={submitting} onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="pay-form" onSubmit={handleSubmit}>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-md mb-6 flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-blue-800 mb-1">
                      ดึงข้อมูลอ้างอิงจากใบตั้งหนี้ (Supplier Bill)
                    </label>
                    <select
                      onChange={(e) => handleSelectBill(e.target.value)}
                      className="w-full border-blue-200 bg-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3"
                    >
                      <option value="">-- เลือกใบตั้งหนี้เพื่อตัดจ่าย --</option>
                      {bills.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bill_no} - {b.supplier?.name} (ยอด: {Number(b.total_amount).toLocaleString("th-TH")})
                        </option>
                      ))}
                    </select>
                  </div>
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
                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">วันที่จ่ายเงิน *</label>
                    <input
                      type="date"
                      required
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">บัญชีจ่ายเงิน *</label>
                    <select
                      required
                      value={formData.cash_account_id}
                      onChange={(e) => setFormData({ ...formData, cash_account_id: e.target.value })}
                      className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">-- เลือกบัญชี --</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">ช่องทาง *</label>
                      <select
                        required
                        value={formData.method}
                        onChange={(e) => setFormData({ ...formData, method: e.target.value as PayMethod })}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="cash">เงินสด</option>
                        <option value="transfer">โอนเงิน</option>
                        <option value="cheque">เช็ค</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">ยอดจ่ายจริง *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                        className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-right"
                      />
                    </div>
                  </div>
                </div>

                {formData.allocations.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-md font-semibold text-slate-800 mb-2">ตัดจ่ายใบตั้งหนี้</h3>
                    <table className="w-full border border-slate-200 rounded-md overflow-hidden">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3 text-left text-sm font-medium text-slate-600">เลขที่เอกสาร</th>
                          <th className="py-2 px-3 text-right text-sm font-medium text-slate-600">ยอดรวม</th>
                          <th className="py-2 px-3 text-right text-sm font-medium text-slate-600">ยอดตัดจ่าย</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.allocations.map((alloc, idx) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="p-2 font-medium">{alloc.bill_no}</td>
                            <td className="p-2 text-right">{alloc.total_amount?.toLocaleString("th-TH")}</td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                max={alloc.total_amount}
                                required
                                value={alloc.amount}
                                onChange={(e) => {
                                  const newAlloc = [...formData.allocations];
                                  newAlloc[idx].amount = Number(e.target.value);
                                  setFormData({ ...formData, allocations: newAlloc });
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
              <button type="button" disabled={submitting} onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-100 font-medium disabled:opacity-50">ยกเลิก</button>
              <button type="submit" form="pay-form" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center gap-2">
                {submitting && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {submitting ? "กำลังบันทึก..." : "บันทึกใบจ่ายเงิน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="p-8">กำลังโหลด...</div>}>
      <PaymentsContent />
    </Suspense>
  );
}
