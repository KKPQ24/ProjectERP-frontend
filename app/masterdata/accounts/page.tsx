"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearch, matchesSearch, SearchSummary } from "@/components/SearchContext";
import { accountApi } from "@/lib/api/masterdata";
import type { Account, AccountType } from "@/types";

const ACCOUNT_TYPES: AccountType[] = [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
];

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: "สินทรัพย์",
  liability: "หนี้สิน",
  equity: "ส่วนของเจ้าของ",
  revenue: "รายได้",
  expense: "ค่าใช้จ่าย",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { query } = useSearch();
  const visible = accounts.filter((account) =>
    matchesSearch(query, [account.code, account.name, account.type, ACCOUNT_TYPE_LABELS[account.type], account.normal_balance === "D" ? "เดบิต" : "เครดิต"]),
  );
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "asset" as AccountType,
    normal_balance: "D",
    is_active: true,
  });

  const loadAccounts = useCallback(async () => {
    try {
      const data = await accountApi.getAccounts();
      setAccounts(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "ไม่สามารถโหลดข้อมูลได้");
      } else {
        setError("ไม่สามารถโหลดข้อมูลได้");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAccounts();
  }, [loadAccounts]);

  const refreshAccounts = async () => {
    try {
      const data = await accountApi.getAccounts();
      setAccounts(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      code: "",
      name: "",
      type: "asset",
      normal_balance: "D",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (account: Account) => {
    setEditingId(account.id);
    setFormData({
      code: account.code,
      name: account.name,
      type: account.type,
      normal_balance: account.normal_balance,
      is_active: account.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("คุณต้องการลบบัญชีนี้ใช่หรือไม่?"))
      return;
    try {
      await accountApi.deleteAccount(id);
      await refreshAccounts();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("ลบข้อมูลไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
      } else {
        alert("ลบข้อมูลไม่สำเร็จ");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await accountApi.updateAccount(editingId, {
          name: formData.name,
          type: formData.type,
          normal_balance: formData.normal_balance,
          is_active: formData.is_active,
        });
      } else {
        await accountApi.createAccount({
          code: formData.code,
          name: formData.name,
          type: formData.type,
          normal_balance: formData.normal_balance,
        });
      }
      setIsModalOpen(false);
      await refreshAccounts();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("บันทึกข้อมูลไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
      } else {
        alert("บันทึกข้อมูลไม่สำเร็จ");
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center">กำลังโหลดผังบัญชี...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">เกิดข้อผิดพลาด: {error}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            ผังบัญชี
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            รายการบัญชีแยกประเภท ประเภทบัญชี และยอดคงเหลือตามปกติ
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          + เพิ่มบัญชี
        </button>
      </div>

      <SearchSummary query={query} shown={visible.length} total={accounts.length} />
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  รหัสบัญชี
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  ชื่อบัญชี
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  ประเภทบัญชี
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase"
                >
                  ยอดคงเหลือปกติ
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase"
                >
                  สถานะ
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase"
                >
                  <span className="sr-only">การดำเนินการ</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    {accounts.length === 0
                      ? "ไม่พบบัญชี"
                      : `ไม่พบรายการที่ตรงกับ “${query.trim()}”`}
                  </td>
                </tr>
              )}
              {visible.map((account) => (
                <tr key={account.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {account.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {account.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {account.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                    {account.normal_balance}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                    {account.is_active ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        ใช้งาน
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        ไม่ใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenEdit(account)}
                      className="text-brand-600 hover:text-brand-900 mr-4"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? "แก้ไขบัญชี" : "เพิ่มบัญชีใหม่"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    รหัสบัญชี
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId}
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ชื่อบัญชี
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ประเภทบัญชี
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as AccountType,
                        })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100 capitalize"
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t} className="capitalize">
                          {ACCOUNT_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ยอดคงเหลือปกติ
                    </label>
                    <select
                      required
                      value={formData.normal_balance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          normal_balance: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    >
                      <option value="D">เดบิต (D)</option>
                      <option value="C">เครดิต (C)</option>
                    </select>
                  </div>
                </div>
                {editingId && (
                  <div className="flex items-center gap-2 mt-4">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                    />
                    <label
                      htmlFor="is_active"
                      className="text-sm font-medium text-slate-900"
                    >
                      ใช้งาน
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 font-medium"
                  >
                    บันทึก
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
