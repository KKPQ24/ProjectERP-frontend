"use client";

import { useId } from "react";

interface DocumentSearchProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  shown: number;
  total: number;
}

export default function DocumentSearch({ label, value, onChange, shown, total }: DocumentSearchProps) {
  const id = useId();

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full sm:max-w-sm">
        <label htmlFor={id} className="sr-only">{label}</label>
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={label} autoComplete="off" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100" />
      </div>
      <p className="text-xs tabular-nums text-slate-500" role="status">{shown} / {total} รายการ</p>
    </div>
  );
}
