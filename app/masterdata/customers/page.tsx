"use client";

import { useEffect, useState, useCallback } from "react";
import { customerApi } from "@/lib/api/masterdata";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    tax_id: "",
    address: "",
    phone: "",
    email: "",
    credit_days: "0",
    is_active: true,
  });

  const loadCustomers = useCallback(async () => {
    try {
      const data = await customerApi.getCustomers();
      setCustomers(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Failed to load data");
      } else {
        setError("Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCustomers();
  }, [loadCustomers]);

  const refreshCustomers = async () => {
    try {
      const data = await customerApi.getCustomers();
      setCustomers(data);
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
      tax_id: "",
      address: "",
      phone: "",
      email: "",
      credit_days: "0",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      code: customer.code,
      name: customer.name,
      tax_id: customer.tax_id || "",
      address: customer.address || "",
      phone: customer.phone || "",
      email: customer.email || "",
      credit_days: String(customer.credit_days ?? 0),
      is_active: customer.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this customer?"))
      return;
    try {
      await customerApi.deleteCustomer(id);
      await refreshCustomers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("Failed to delete: " + (err.message || "Unknown error"));
      } else {
        alert("Failed to delete");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await customerApi.updateCustomer(editingId, {
          name: formData.name,
          tax_id: formData.tax_id || undefined,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          credit_days: Number(formData.credit_days),
          is_active: formData.is_active,
        });
      } else {
        await customerApi.createCustomer({
          code: formData.code,
          name: formData.name,
          tax_id: formData.tax_id || undefined,
          address: formData.address || undefined,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          credit_days: Number(formData.credit_days),
        });
      }
      setIsModalOpen(false);
      await refreshCustomers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("Failed to save: " + (err.message || "Unknown error"));
      } else {
        alert("Failed to save");
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading customers...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Customers (Master Data)
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            A list of all customers including contact info and credit terms.
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
        >
          + Add Customer
        </button>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  Code
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  Phone
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase"
                >
                  Credit Days
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase"
                >
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {customers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    No customers found.
                  </td>
                </tr>
              )}
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {customer.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {customer.phone || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {customer.email || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                    {customer.credit_days}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                    {customer.is_active ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenEdit(customer)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
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
                {editingId ? "Edit Customer" : "New Customer"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Code
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingId}
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tax ID
                    </label>
                    <input
                      type="text"
                      value={formData.tax_id}
                      onChange={(e) =>
                        setFormData({ ...formData, tax_id: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Credit Days
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.credit_days}
                    onChange={(e) =>
                      setFormData({ ...formData, credit_days: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
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
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    <label
                      htmlFor="is_active"
                      className="text-sm font-medium text-slate-900"
                    >
                      Active
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    Save
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
