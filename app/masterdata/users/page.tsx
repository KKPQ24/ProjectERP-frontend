"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearch, matchesSearch, SearchSummary } from "@/components/SearchContext";
import { userApi } from "@/lib/api/masterdata";
import type { User } from "@/types";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { query } = useSearch();
  const visible = users.filter((user) =>
    matchesSearch(query, [user.username, user.full_name, user.email, user.user_role?.map((r) => r.role?.code).join(" ")]),
  );
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
    is_active: true,
  });

  const loadUsers = useCallback(async () => {
    try {
      const data = await userApi.getUsers();
      setUsers(data);
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
    loadUsers();
  }, [loadUsers]);

  const refreshUsers = async () => {
    try {
      const data = await userApi.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      username: "",
      password: "",
      full_name: "",
      email: "",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingId(user.id);
    setFormData({
      username: user.username,
      password: "",
      full_name: user.full_name,
      email: user.email || "",
      is_active: user.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("คุณต้องการลบผู้ใช้นี้ใช่หรือไม่?")) return;
    try {
      await userApi.deleteUser(id);
      await refreshUsers();
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
        await userApi.updateUser(editingId, {
          full_name: formData.full_name,
          email: formData.email || undefined,
          is_active: formData.is_active,
        });
      } else {
        await userApi.createUser({
          username: formData.username,
          password: formData.password,
          full_name: formData.full_name,
          email: formData.email || undefined,
        });
      }
      setIsModalOpen(false);
      await refreshUsers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("บันทึกข้อมูลไม่สำเร็จ: " + (err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
      } else {
        alert("บันทึกข้อมูลไม่สำเร็จ");
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center">กำลังโหลดข้อมูลผู้ใช้งาน...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">เกิดข้อผิดพลาด: {error}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            ผู้ใช้งานระบบ
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            รายชื่อผู้ใช้งานที่สามารถเข้าสู่ระบบ ERP
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          + เพิ่มผู้ใช้งาน
        </button>
      </div>

      <SearchSummary query={query} shown={visible.length} total={users.length} />
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  ชื่อผู้ใช้
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  ชื่อ-นามสกุล
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  อีเมล
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  บทบาท
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
                    {users.length === 0
                      ? "ไม่พบข้อมูลผู้ใช้งาน"
                      : `ไม่พบรายการที่ตรงกับ “${query.trim()}”`}
                  </td>
                </tr>
              )}
              {visible.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {user.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {user.email || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {user.user_role
                      ?.map((r) => r.role?.code)
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                    {user.is_active ? (
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
                      onClick={() => handleOpenEdit(user)}
                      className="text-brand-600 hover:text-brand-900 mr-4"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
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
                {editingId ? "แก้ไขข้อมูลผู้ใช้งาน" : "เพิ่มผู้ใช้งานใหม่"}
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
                    ชื่อผู้ใช้
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId}
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      รหัสผ่าน
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    อีเมล
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                  />
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
