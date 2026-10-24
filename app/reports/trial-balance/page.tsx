"use client";

import { useCallback, useEffect, useState } from "react";
import { reportApi } from "@/lib/api/reports";
import type { TrialBalanceReport } from "@/types";

function formatAmount(value: number | string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "-";
}

const accountTypeLabels: Record<string, string> = {
  asset: "สินทรัพย์",
  liability: "หนี้สิน",
  equity: "ส่วนของเจ้าของ",
  revenue: "รายได้",
  expense: "ค่าใช้จ่าย",
};

export default function TrialBalancePage() {
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    try {
      const data = await reportApi.getTrialBalance();
      if (!data || !Array.isArray(data.rows)) {
        throw new Error("รูปแบบข้อมูลที่ได้รับไม่ถูกต้อง หรือไม่มีรายการบัญชี");
      }

      setReport(data);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "ไม่สามารถโหลดงบทดลองได้"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReport();
  }, [loadReport]);

  const handleRefresh = () => {
    setLoading(true);
    loadReport();
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">งบทดลอง</h1>
          <p className="mt-2 text-sm text-slate-600">
            สรุปยอดเดบิตและเครดิตของบัญชีที่ใช้งาน
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "กำลังโหลด..." : "โหลดข้อมูลใหม่"}
        </button>
      </div>

      {loading && !report ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
          กำลังโหลดงบทดลอง...
        </div>
      ) : error && !report ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700" role="alert">
            โหลดงบทดลองไม่สำเร็จ: {error}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-4 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
          >
            ลองอีกครั้ง
          </button>
        </div>
      ) : report ? (
        <>
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${
              report.balanced
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
            role="status"
          >
            {report.balanced
              ? "งบทดลองสมดุล"
              : "งบทดลองไม่สมดุล กรุณาตรวจสอบยอดเดบิตและเครดิต"}
          </div>

          {error && (
            <p className="mb-4 text-sm text-amber-700" role="alert">
              โหลดข้อมูลล่าสุดไม่สำเร็จ: {error}
            </p>
          )}

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500"
                    >
                      รหัสบัญชี
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500"
                    >
                      ชื่อบัญชี
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500"
                    >
                      ประเภทบัญชี
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500"
                    >
                      เดบิต
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500"
                    >
                      เครดิต
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium uppercase text-slate-500"
                    >
                      ยอดคงเหลือ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.rows.map((account) => (
                    <tr key={account.code} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                        {account.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {account.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {accountTypeLabels[account.type] ?? account.type}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm tabular-nums text-slate-700">
                        {formatAmount(account.debit)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm tabular-nums text-slate-700">
                        {formatAmount(account.credit)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm tabular-nums text-slate-700">
                        {formatAmount(account.balance)}
                      </td>
                    </tr>
                  ))}
                  {report.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-slate-500"
                      >
                        ไม่มีข้อมูลบัญชีสำหรับงบทดลอง
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <th
                      scope="row"
                      colSpan={3}
                      className="px-6 py-4 text-left text-sm font-semibold text-slate-900"
                    >
                      รวมทั้งสิ้น
                    </th>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {formatAmount(report.totalDebit)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {formatAmount(report.totalCredit)}
                    </td>
                    <td className="px-6 py-4" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
