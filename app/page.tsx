"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { productApi, customerApi } from "@/lib/api/masterdata";
import { salesOrderApi } from "@/lib/api/sales";
import { getStoredToken } from "@/lib/api/client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    // async function fetchData() {
    //   try {
    //     const [products, customers, salesOrders] = await Promise.all([
    //       productApi.getProducts(),
    //       customerApi.getCustomers(),
    //       salesOrderApi.getSalesOrders(),
    //     ]);

    //     console.log("สินค้า:", products);
    //     console.log("ลูกค้า:", customers);
    //     console.log("ใบสั่งขาย:", salesOrders);
    //   } catch (error) {
    //     console.error("โหลดข้อมูลไม่สำเร็จ:", error);
    //   }
    // }

    // fetchData();
  }, [router]);

  return (
   <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
  <div className="max-w-7xl mx-auto space-y-6">
    {/* Header */}
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold text-slate-800">
          Hi, Welcome ช์๋อเดี๋ยวใส่
        </h1>
        <p className="text-sm text-slate-500">your Dashboard ERP</p>
      </div>
      <span className="text-sm text-slate-400">
        {new Date().toLocaleDateString("th-TH", { dateStyle: "long" })}
      </span>
    </header>

    {/* KPI cards */}
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: "ยอดขายรวม", color: "bg-blue-500" },
        { label: "รออนุมัติ", color: "bg-amber-500" },
        { label: "สินค้าเหลือน้อย", color: "bg-red-500" },
        { label: "ลูกค้าทั้งหมด", color: "bg-emerald-500" },
      ].map((k) => (
        <div
          key={k.label}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4"
        >
          <div className={`w-1.5 self-stretch rounded-full ${k.color}`} />
          <div>
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className="text-2xl font-semibold text-slate-800">-</p>
          </div>
        </div>
      ))}
    </section>

    {/* Main grid */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* เอกสารที่รออนุมัติ */}
      <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">เอกสารที่รออนุมัติ</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
            0 รายการ
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">เลขที่เอกสาร</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">ลูกค้า</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">ช่องทาง</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">ยอดรวม</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  ไม่มีเอกสารที่รออนุมัติ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* สินค้าที่เหลือน้อย */}
      <section className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">สินค้าที่เหลือน้อย</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
            0 รายการ
          </span>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-slate-500">ชื่อสินค้า</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">จำนวนที่เหลือ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* ข้อมูลเดี๋ยวใส่ */}
            <tr>
              <td colSpan={2} className="px-4 py-10 text-center text-sm text-slate-400">
                สต็อกปกติ
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* เอกสารล่าสุด */}
      <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">เอกสารล่าสุด</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">เลขที่เอกสาร</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">ลูกค้า</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">ยอดรวม</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  ยังไม่มีเอกสาร
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* เอกสารที่ค้าง */}
      <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">เอกสารที่ค้าง</h2>
          <span className="text-xs text-slate-400">ค้างเกิน 3 วัน</span>
        </div>
        <div className="px-5 py-10 text-center text-sm text-slate-400">
          ไม่มีเอกสารค้าง
        </div>
      </section>
    </div>
  </div>
</div>
  );
}
