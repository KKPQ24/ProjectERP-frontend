"use client";

import { useEffect, useState, useCallback } from "react";
import { productApi, categoryApi, unitApi } from "@/lib/api/masterdata";
import type {
  Product,
  ProductCategory,
  Unit,
  CreateProductRequest,
} from "@/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    category_id: "",
    unit_id: "",
    sale_price: "",
    reorder_point: "",
    is_active: true,
  });

  const loadInitialData = useCallback(async () => {
    try {
      // loading is already true initially
      const [productsData, categoriesData, unitsData] = await Promise.all([
        productApi.getProducts(),
        categoryApi.getCategories(),
        unitApi.getUnits(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setUnits(unitsData);
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
    loadInitialData();
  }, [loadInitialData]);

  const refreshProducts = async () => {
    try {
      const productsData = await productApi.getProducts();
      setProducts(productsData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      }
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      sku: "",
      name: "",
      category_id: "",
      unit_id: "",
      sale_price: "",
      reorder_point: "0",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      sku: product.sku,
      name: product.name,
      category_id: product.category_id ? String(product.category_id) : "",
      unit_id: String(product.unit_id),
      sale_price: String(product.sale_price),
      reorder_point: String(product.reorder_point),
      is_active: product.is_active ?? true,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    try {
      await productApi.deleteProduct(id);
      await refreshProducts();
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
      const payload = {
        sku: formData.sku,
        name: formData.name,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        unit_id: Number(formData.unit_id),
        sale_price: Number(formData.sale_price),
        reorder_point: Number(formData.reorder_point),
        is_active: formData.is_active,
      };

      if (editingId) {
        await productApi.updateProduct(editingId, payload);
      } else {
        await productApi.createProduct(payload as CreateProductRequest);
      }
      setIsModalOpen(false);
      await refreshProducts();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("Failed to save: " + (err.message || "Unknown error"));
      } else {
        alert("Failed to save");
      }
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading products...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Products (Master Data)
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            A list of all products including their SKU, name, price, and stock
            info.
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
        >
          + Add Product
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
                  SKU
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
                  Category
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                >
                  Unit
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase"
                >
                  Price
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
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {product.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {product.category_name ||
                      product.product_category?.name ||
                      "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {product.unit_name || product.unit?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                    {Number(product.sale_price).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-center">
                    {product.is_active ? (
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
                      onClick={() => handleOpenEdit(product)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
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
                {editingId ? "Edit Product" : "New Product"}
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingId} // Usually SKU cannot be changed
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                  />
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category_id: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    >
                      <option value="">-- None --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Unit
                    </label>
                    <select
                      required
                      value={formData.unit_id}
                      onChange={(e) =>
                        setFormData({ ...formData, unit_id: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    >
                      <option value="">-- Select --</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sale Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.sale_price}
                      onChange={(e) =>
                        setFormData({ ...formData, sale_price: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Reorder Point
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.reorder_point}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reorder_point: e.target.value,
                        })
                      }
                      className="w-full border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm py-2 px-3 text-slate-900 disabled:opacity-50 disabled:bg-slate-100"
                    />
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
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    <label
                      htmlFor="is_active"
                      className="text-sm font-medium text-slate-900"
                    >
                      Active (Available for sales)
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
