"use client";

import { useEffect, useState, useCallback } from "react";
import { productApi, categoryApi, unitApi } from "@/lib/api/masterdata";
import type { Product, ProductCategory, Unit, CreateProductRequest } from "@/types";

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
    if (!window.confirm("Are you sure you want to delete this product?")) return;
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-zinc-900 dark:text-white">Products (Master Data)</h1>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            A list of all products including their SKU, name, price, and stock info.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            onClick={handleOpenNew}
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Add Product
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-zinc-300 dark:divide-zinc-700">
                <thead className="bg-zinc-50 dark:bg-zinc-800">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100 sm:pl-6">
                      SKU
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Category
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Unit
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Price
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Status
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-700 dark:bg-zinc-900">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:pl-6">
                        {product.sku}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-300">
                        {product.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-300">
                        {product.category_name || product.product_category?.name || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-300">
                        {product.unit_name || product.unit?.name || "-"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-300 text-right">
                        {Number(product.sale_price).toLocaleString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-zinc-500 dark:text-zinc-300 text-center">
                        {product.is_active ? (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Active</span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">Inactive</span>
                        )}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-zinc-500 bg-opacity-75 transition-opacity"></div>
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-zinc-900 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div>
                  <h3 className="text-base font-semibold leading-6 text-zinc-900 dark:text-zinc-100" id="modal-title">
                    {editingId ? "Edit Product" : "New Product"}
                  </h3>
                  <div className="mt-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">SKU</label>
                        <input
                          type="text"
                          required
                          disabled={!!editingId} // Usually SKU cannot be changed
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                          className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">Name</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">Category</label>
                          <select
                            value={formData.category_id}
                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                          >
                            <option value="">-- None --</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">Unit</label>
                          <select
                            required
                            value={formData.unit_id}
                            onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                          >
                            <option value="">-- Select --</option>
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">Sale Price</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={formData.sale_price}
                            onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">Reorder Point</label>
                          <input
                            type="number"
                            required
                            value={formData.reorder_point}
                            onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                            className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                          />
                        </div>
                      </div>
                      {editingId && (
                        <div className="flex items-center gap-2 mt-4">
                          <input
                            type="checkbox"
                            id="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
                          />
                          <label htmlFor="is_active" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Active (Available for sales)
                          </label>
                        </div>
                      )}
                      
                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button
                          type="submit"
                          className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:col-start-2"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 sm:col-start-1 sm:mt-0"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}