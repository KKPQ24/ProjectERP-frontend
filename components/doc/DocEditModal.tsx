"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";
import { fmtMoney } from "./docUtils";

/* ฟอร์มแก้ไขเอกสารแบบร่าง ใช้ร่วมกันของ ใบเสนอราคา / ใบสั่งขาย / ใบขอซื้อ / ใบสั่งซื้อ */

export interface EditLineState {
  product_id: string;
  qty: number;
  unit_price: number;
  note: string;
}

export interface EditInitial {
  date: string;
  validUntil?: string;
  partyId?: string;
  note: string;
  lines: EditLineState[];
}

export interface EditResult {
  date: string;
  validUntil?: string;
  partyId?: number;
  note: string;
  subtotal: number;
  vat: number;
  total: number;
  lines: {
    product_id: number;
    qty: number;
    unit_price: number;
    line_amount: number;
    note?: string;
  }[];
}

interface Refs {
  parties: { id: number; label: string }[];
  products: Product[];
}

interface Props {
  title: string;
  /** priced = มีราคา/ยอดเงิน, qty-note = จำนวน + หมายเหตุ (ใบขอซื้อ) */
  mode: "priced" | "qty-note";
  dateLabel: string;
  withValidUntil?: boolean;
  partyLabel?: string;
  initial: EditInitial;
  loadRefs: () => Promise<Refs>;
  priceOf?: (p: Product) => number;
  onClose: () => void;
  onSave: (result: EditResult) => Promise<void>;
}

const VAT_RATE = 0.07;
const round2 = (n: number) => Math.round(n * 100) / 100;
const INPUT =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

export default function DocEditModal({
  title,
  mode,
  dateLabel,
  withValidUntil,
  partyLabel,
  initial,
  loadRefs,
  priceOf,
  onClose,
  onSave,
}: Props) {
  const [load] = useState(() => loadRefs);
  const [refs, setRefs] = useState<Refs | null>(null);
  const [refsError, setRefsError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: initial.date,
    validUntil: initial.validUntil ?? "",
    partyId: initial.partyId ?? "",
    note: initial.note,
  });
  const [lines, setLines] = useState<EditLineState[]>(
    initial.lines.length > 0
      ? initial.lines
      : [{ product_id: "", qty: 1, unit_price: 0, note: "" }],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    load()
      .then((r) => {
        if (alive) setRefs(r);
      })
      .catch((err: unknown) => {
        if (alive) {
          setRefsError(err instanceof Error ? err.message : "โหลดข้อมูลอ้างอิงไม่สำเร็จ");
        }
      });
    return () => {
      alive = false;
    };
  }, [load]);

  const priced = mode === "priced";
  const lineAmount = (l: EditLineState) => round2(Number(l.qty) * Number(l.unit_price));
  const subtotal = round2(lines.reduce((sum, l) => sum + lineAmount(l), 0));
  const vat = round2(subtotal * VAT_RATE);
  const total = round2(subtotal + vat);

  const changeLine = (index: number, patch: Partial<EditLineState>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const changeProduct = (index: number, productId: string) => {
    const product = refs?.products.find((p) => String(p.id) === productId);
    changeLine(index, {
      product_id: productId,
      ...(priced && product && priceOf ? { unit_price: priceOf(product) } : {}),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const valid = lines.filter((l) => Number(l.product_id) > 0);
    if (valid.length === 0) {
      alert("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
      return;
    }
    if (valid.some((l) => !(Number(l.qty) > 0))) {
      alert("จำนวนต้องมากกว่า 0");
      return;
    }
    if (partyLabel && !form.partyId) {
      alert(`กรุณาเลือก${partyLabel}`);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        date: form.date,
        validUntil: withValidUntil ? form.validUntil || undefined : undefined,
        partyId: partyLabel ? Number(form.partyId) : undefined,
        note: form.note,
        subtotal,
        vat,
        total,
        lines: valid.map((l) => ({
          product_id: Number(l.product_id),
          qty: Number(l.qty),
          unit_price: Number(l.unit_price),
          line_amount: lineAmount(l),
          note: l.note || undefined,
        })),
      });
    } catch (err: unknown) {
      alert("บันทึกการแก้ไขไม่สำเร็จ: " + (err instanceof Error ? err.message : "เกิดข้อผิดพลาด"));
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-slate-500 hover:text-slate-600"
            aria-label="ปิด"
          >
            &times;
          </button>
        </div>

        {refsError ? (
          <p className="p-6 text-sm text-red-600">{refsError}</p>
        ) : !refs ? (
          <p className="p-6 text-sm text-slate-500">กำลังโหลด...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {partyLabel && (
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {partyLabel}
                    </label>
                    <select
                      required
                      value={form.partyId}
                      onChange={(e) => setForm({ ...form, partyId: e.target.value })}
                      className={INPUT}
                    >
                      <option value="">-- เลือก{partyLabel} --</option>
                      {refs.parties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    {dateLabel}
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={INPUT}
                  />
                </div>
                {withValidUntil && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      ใช้ได้ถึงวันที่
                    </label>
                    <input
                      type="date"
                      value={form.validUntil}
                      onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">รายการสินค้า</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLines((prev) => [
                        ...prev,
                        { product_id: "", qty: 1, unit_price: 0, note: "" },
                      ])
                    }
                    className="text-sm font-medium text-brand-600 hover:text-brand-800"
                  >
                    + เพิ่มรายการ
                  </button>
                </div>
                <div className="space-y-2">
                  {lines.map((l, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 items-center gap-2 rounded-md border border-slate-200 p-2"
                    >
                      <select
                        value={l.product_id}
                        onChange={(e) => changeProduct(i, e.target.value)}
                        className={`${INPUT} col-span-12 ${priced ? "sm:col-span-5" : "sm:col-span-6"}`}
                        aria-label="สินค้า"
                      >
                        <option value="">-- เลือกสินค้า --</option>
                        {refs.products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={l.qty}
                        onChange={(e) => changeLine(i, { qty: Number(e.target.value) })}
                        className={`${INPUT} col-span-4 sm:col-span-2`}
                        aria-label="จำนวน"
                        placeholder="จำนวน"
                      />
                      {priced ? (
                        <>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={l.unit_price}
                            onChange={(e) => changeLine(i, { unit_price: Number(e.target.value) })}
                            className={`${INPUT} col-span-4 sm:col-span-2`}
                            aria-label="ราคาต่อหน่วย"
                            placeholder="ราคา"
                          />
                          <span className="col-span-3 text-right text-sm text-slate-700 sm:col-span-2">
                            {fmtMoney(lineAmount(l))}
                          </span>
                        </>
                      ) : (
                        <input
                          type="text"
                          value={l.note}
                          onChange={(e) => changeLine(i, { note: e.target.value })}
                          className={`${INPUT} col-span-7 sm:col-span-3`}
                          aria-label="หมายเหตุรายการ"
                          placeholder="หมายเหตุ"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setLines((prev) =>
                            prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev,
                          )
                        }
                        className="col-span-1 text-center text-lg leading-none text-red-500 hover:text-red-700"
                        aria-label="ลบรายการนี้"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {priced && (
                <dl className="ml-auto w-full max-w-xs text-sm">
                  <div className="flex justify-between py-0.5">
                    <dt className="text-slate-500">รวมเป็นเงิน</dt>
                    <dd>{fmtMoney(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <dt className="text-slate-500">ภาษีมูลค่าเพิ่ม 7%</dt>
                    <dd>{fmtMoney(vat)}</dd>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-slate-300 pt-2 text-base font-bold">
                    <dt>ยอดรวมทั้งสิ้น</dt>
                    <dd>{fmtMoney(total)}</dd>
                  </div>
                </dl>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">หมายเหตุ</label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className={INPUT}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
