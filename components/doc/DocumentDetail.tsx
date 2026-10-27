"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { canAccessPath } from "@/lib/access";
import { fmtDateLong, statusMeta } from "./docUtils";

/* ------------------------------------------------------------------ */
/*  ชนิดข้อมูลสำหรับอธิบายหน้า detail ของเอกสารแต่ละประเภท                  */
/* ------------------------------------------------------------------ */

export type Align = "left" | "right" | "center";

export interface DocField {
  label: string;
  value: ReactNode;
}

export interface DocColumn<R> {
  header: string;
  align?: Align;
  render: (row: R, index: number) => ReactNode;
}

export interface DocTable {
  title?: string;
  head: { label: string; align?: Align }[];
  rows: ReactNode[][];
  empty?: string;
}

export interface DocTotal {
  label: string;
  value: string;
  strong?: boolean;
}

/** ข้อมูลที่หน้า detail แสดง (แปลงมาจากเอกสารแต่ละชนิดแล้ว) */
export interface DocView {
  no: string;
  status: string;
  fields: DocField[];
  tables: DocTable[];
  totals?: DocTotal[];
  note?: string | null;
  createdAt?: string | null;
  /** ช่องลงนามท้ายใบเอกสารตอนพิมพ์ (ค่าเริ่มต้น: ผู้จัดทำ / ผู้อนุมัติ) */
  signatures?: string[];
}

export interface DocAction {
  key: string;
  label: string;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  /** ถ้ามี จะถามยืนยันก่อนทำ */
  confirm?: string;
  /** ทำงานกับ API แล้วหน้าจะโหลดข้อมูลใหม่ */
  run?: () => Promise<unknown>;
  /** ถ้ามี จะเป็นลิงก์ไปหน้าอื่น (เช่น สร้างเอกสารต่อเนื่อง) */
  href?: string;
}

export interface DocConfig<T> {
  /** ชื่อเอกสาร เช่น "ใบเสนอราคา" */
  docName: string;
  listHref: string;
  /** เปลี่ยนคำของสถานะเฉพาะเอกสารนี้ เช่น { posted: "บันทึกบัญชีแล้ว" } */
  statusLabels?: Record<string, string>;
  load: (id: string) => Promise<T>;
  view: (doc: T) => DocView;
  actions?: (doc: T) => DocAction[];
  edit?: {
    allowed: (doc: T) => boolean;
    render: (doc: T, onClose: () => void, onSaved: () => void) => ReactNode;
  };
  /** API ไม่มีการลบเอกสาร มีแต่ "ยกเลิก" (สถานะ cancelled) */
  cancel?: {
    allowed: (doc: T) => boolean;
    run: (doc: T) => Promise<unknown>;
    confirm: string;
  };
}

/** สร้างตารางแสดงผลจากรายการข้อมูล + นิยามคอลัมน์ */
export function makeTable<R>(
  rows: R[],
  columns: DocColumn<R>[],
  opts?: { title?: string; empty?: string },
): DocTable {
  return {
    title: opts?.title,
    empty: opts?.empty,
    head: columns.map((c) => ({ label: c.header, align: c.align })),
    rows: rows.map((row, i) => columns.map((c) => c.render(row, i))),
  };
}

/* ------------------------------------------------------------------ */
/*  ส่วนแสดงผล                                                          */
/* ------------------------------------------------------------------ */

const ALIGN: Record<Align, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

const TONE: Record<NonNullable<DocAction["tone"]>, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  success: "bg-green-600 text-white hover:bg-green-700",
  warning: "bg-amber-500 text-white hover:bg-amber-600",
  danger: "border border-red-300 bg-white text-red-600 hover:bg-red-50",
  neutral: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
};

const BTN =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

type State<T> =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; doc: T };

function ScreenTable({ table }: { table: DocTable }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {table.title && (
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-800">
          {table.title}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {table.head.map((h) => (
                <th
                  key={h.label}
                  scope="col"
                  className={`px-6 py-3 text-xs font-medium uppercase text-slate-500 ${ALIGN[h.align ?? "left"]}`}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {table.rows.length === 0 && (
              <tr>
                <td
                  colSpan={table.head.length}
                  className="px-6 py-8 text-center text-sm text-slate-500"
                >
                  {table.empty ?? "ไม่มีรายการ"}
                </td>
              </tr>
            )}
            {table.rows.map((cells, r) => (
              <tr key={r} className="hover:bg-slate-50">
                {cells.map((cell, c) => (
                  <td
                    key={c}
                    className={`whitespace-nowrap px-6 py-3 text-sm text-slate-700 ${ALIGN[table.head[c]?.align ?? "left"]}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Totals({ totals, print }: { totals: DocTotal[]; print?: boolean }) {
  return (
    <div className={`flex ${print ? "mt-3" : ""} justify-end`}>
      <dl
        className={
          print
            ? "w-72 text-sm"
            : "w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 text-sm shadow-sm"
        }
      >
        {totals.map((t) => (
          <div
            key={t.label}
            className={`flex justify-between py-1 ${
              t.strong ? "mt-1 border-t border-slate-300 pt-2 text-base font-bold" : ""
            }`}
          >
            <dt className={t.strong ? "" : "text-slate-500"}>{t.label}</dt>
            <dd>{t.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** ใบเอกสารสำหรับพิมพ์ (แสดงเฉพาะตอนพิมพ์ ไม่เห็นบนหน้าจอ) */
function PrintSheet({ docName, view }: { docName: string; view: DocView }) {
  if (typeof document === "undefined") return null;
  const meta = statusMeta(view.status);
  const signatures = view.signatures ?? ["ผู้จัดทำ", "ผู้อนุมัติ"];
  const printedAt = new Date().toLocaleString("th-TH", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return createPortal(
    <div id="print-root" className="hidden text-[13px] text-slate-900 print:block">
      <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
        <div>
          <p className="text-xs text-slate-500">ระบบ ERP</p>
          <h1 className="mt-1 text-2xl font-bold">{docName}</h1>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">เลขที่ {view.no}</p>
          <p className="text-xs text-slate-600">สถานะ: {meta.label}</p>
        </div>
      </div>

      <table className="mt-4 w-full border-collapse">
        <tbody>
          {view.fields.map((f) => (
            <tr key={f.label} className="break-inside-avoid">
              <th
                scope="row"
                className="w-1/4 border border-slate-300 bg-slate-100 px-3 py-1.5 text-left font-medium [-webkit-print-color-adjust:exact] [print-color-adjust:exact]"
              >
                {f.label}
              </th>
              <td className="border border-slate-300 px-3 py-1.5 whitespace-pre-line">
                {f.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {view.tables.map((t, i) => (
        <div key={i} className="mt-5">
          {t.title && <p className="mb-1 font-semibold">{t.title}</p>}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {t.head.map((h) => (
                  <th
                    key={h.label}
                    className={`border border-slate-300 bg-slate-100 px-3 py-1.5 font-medium [-webkit-print-color-adjust:exact] [print-color-adjust:exact] ${ALIGN[h.align ?? "left"]}`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={t.head.length}
                    className="border border-slate-300 px-3 py-3 text-center text-slate-500"
                  >
                    {t.empty ?? "ไม่มีรายการ"}
                  </td>
                </tr>
              )}
              {t.rows.map((cells, r) => (
                <tr key={r} className="break-inside-avoid">
                  {cells.map((cell, c) => (
                    <td
                      key={c}
                      className={`border border-slate-300 px-3 py-1.5 ${ALIGN[t.head[c]?.align ?? "left"]}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {view.totals && view.totals.length > 0 && <Totals totals={view.totals} print />}

      {view.note && (
        <p className="mt-4 whitespace-pre-line">
          <span className="font-semibold">หมายเหตุ: </span>
          {view.note}
        </p>
      )}

      <div
        className="mt-14 grid gap-8 break-inside-avoid"
        style={{ gridTemplateColumns: `repeat(${signatures.length}, minmax(0, 1fr))` }}
      >
        {signatures.map((s) => (
          <div key={s} className="text-center">
            <div className="h-12 border-b border-slate-500" />
            <p className="mt-1">{s}</p>
            <p className="text-xs text-slate-500">วันที่ ____ / ____ / ________</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-right text-[11px] text-slate-500">พิมพ์เมื่อ {printedAt}</p>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  หน้ารายละเอียดเอกสาร                                                */
/* ------------------------------------------------------------------ */

export default function DocumentDetail<T>({
  id,
  config,
}: {
  id: string;
  config: DocConfig<T>;
}) {
  const { user } = useAuth();
  const [state, setState] = useState<State<T>>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const reload = useCallback(async () => {
    const doc = await config.load(id);
    setState({ kind: "ready", doc });
  }, [config, id]);

  useEffect(() => {
    let alive = true;
    config
      .load(id)
      .then((doc) => {
        if (alive) setState({ kind: "ready", doc });
      })
      .catch((err: unknown) => {
        if (alive) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ",
          });
        }
      });
    return () => {
      alive = false;
    };
  }, [config, id]);

  const run = async (
    label: string,
    confirmText: string | undefined,
    fn: () => Promise<unknown>,
  ) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (err: unknown) {
      alert("เกิดข้อผิดพลาด: " + (err instanceof Error ? err.message : `${label}ไม่สำเร็จ`));
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <Link
      href={config.listHref}
      className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-800"
    >
      <span aria-hidden="true">←</span> กลับไปรายการ{config.docName}
    </Link>
  );

  if (state.kind === "loading") {
    return (
      <div className="mx-auto max-w-5xl">
        {back}
        <p className="mt-6 text-slate-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mx-auto max-w-5xl">
        {back}
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          โหลด{config.docName}ไม่สำเร็จ: {state.message}
        </div>
      </div>
    );
  }

  const doc = state.doc;
  const view = config.view(doc);
  const meta = statusMeta(view.status, config.statusLabels);
  const actions = (config.actions?.(doc) ?? []).filter((action) => !action.href || canAccessPath(action.href, user?.roles ?? []));
  const canEdit = !!config.edit?.allowed(doc);
  const canCancel = !!config.cancel?.allowed(doc);

  return (
    <div className="mx-auto max-w-5xl">
      {back}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{config.docName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{view.no}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>
              {meta.label}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions.map((a) => {
            const cls = `${BTN} ${TONE[a.tone ?? "neutral"]}`;
            return a.href ? (
              <Link key={a.key} href={a.href} className={cls}>
                {a.label}
              </Link>
            ) : (
              <button
                key={a.key}
                type="button"
                disabled={busy}
                className={cls}
                onClick={() => a.run && run(a.label, a.confirm, a.run)}
              >
                {a.label}
              </button>
            );
          })}
          {canEdit && (
            <button
              type="button"
              disabled={busy}
              className={`${BTN} ${TONE.neutral}`}
              onClick={() => setEditOpen(true)}
            >
              แก้ไข
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={busy}
              className={`${BTN} ${TONE.danger}`}
              onClick={() =>
                config.cancel &&
                run("ยกเลิกเอกสาร", config.cancel.confirm, () => config.cancel!.run(doc))
              }
            >
              ยกเลิกเอกสาร
            </button>
          )}
          <button
            type="button"
            className={`${BTN} ${TONE.neutral}`}
            onClick={() => window.print()}
          >
            พิมพ์เอกสาร
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {view.fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs font-medium text-slate-500">{f.label}</dt>
                <dd className="mt-1 whitespace-pre-line text-sm text-slate-900">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {view.tables.map((t, i) => (
          <ScreenTable key={i} table={t} />
        ))}

        {view.totals && view.totals.length > 0 && <Totals totals={view.totals} />}

        {view.note && (
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xs font-medium text-slate-500">หมายเหตุ</h2>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-900">{view.note}</p>
          </section>
        )}

        {view.createdAt && (
          <p className="text-xs text-slate-500">สร้างเมื่อ {fmtDateLong(view.createdAt)}</p>
        )}
      </div>

      {editOpen &&
        config.edit?.render(
          doc,
          () => setEditOpen(false),
          () => {
            setEditOpen(false);
            void reload();
          },
        )}

      <PrintSheet docName={config.docName} view={view} />
    </div>
  );
}
