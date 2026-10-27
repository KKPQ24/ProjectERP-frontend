"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  สถานะคำค้นหา (ใช้ร่วมกันระหว่างช่องค้นหาใน Header และหน้ารายการ)      */
/* ------------------------------------------------------------------ */

interface SearchContextValue {
  query: string;
  setQuery: (q: string) => void;
}

const SearchContext = createContext<SearchContextValue>({
  query: "",
  setQuery: () => {},
});

export function SearchProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // เก็บคำค้นหาพร้อมหน้าที่พิมพ์ไว้ — พอเปลี่ยนหน้า คำค้นหาจะถูกล้างอัตโนมัติ
  const [state, setState] = useState({ path: "", query: "" });
  const query = state.path === pathname ? state.query : "";

  const setQuery = useCallback(
    (q: string) => setState({ path: pathname, query: q }),
    [pathname],
  );

  const value = useMemo(() => ({ query, setQuery }), [query, setQuery]);
  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}

/* ------------------------------------------------------------------ */
/*  การจับคู่คำค้นหา: ตรงทุกตัวอักษร หรือ "คล้าย" (พิมพ์ผิดเล็กน้อยได้)     */
/* ------------------------------------------------------------------ */

type SearchValue = string | number | null | undefined;

const normalize = (s: string) => s.normalize("NFC").toLowerCase();

/** หาว่า needle ปรากฏใน hay (ผิดพลาดได้ไม่เกิน maxEdits ตัวอักษร) หรือไม่ */
function approxIncludes(
  hay: string,
  needle: string,
  maxEdits: number,
): boolean {
  const m = needle.length;
  let prev = Array.from({ length: m + 1 }, (_, i) => i);
  if (prev[m] <= maxEdits) return true;
  for (let j = 0; j < hay.length; j++) {
    const cur = [0];
    for (let i = 1; i <= m; i++) {
      cur[i] = Math.min(
        prev[i] + 1,
        cur[i - 1] + 1,
        prev[i - 1] + (needle[i - 1] === hay[j] ? 0 : 1),
      );
    }
    if (cur[m] <= maxEdits) return true;
    prev = cur;
  }
  return false;
}

/**
 * ตรวจว่าข้อมูลหนึ่งแถว (values) ตรงกับคำค้นหาหรือไม่
 * - คำค้นหาว่าง → แสดงทุกแถว
 * - แยกคำด้วยช่องว่าง ทุกคำต้องเจอในข้อมูลแถวนั้น
 * - คำที่ยาว 4 ตัวอักษรขึ้นไป อนุโลมพิมพ์ผิด/คล้ายกันได้ (4-7 ตัว ผิดได้ 1, 8 ตัวขึ้นไป ผิดได้ 2)
 */
export function matchesSearch(query: string, values: SearchValue[]): boolean {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const hay = normalize(
    values.filter((v) => v !== null && v !== undefined && v !== "").join(" "),
  );

  return tokens.every((token) => {
    if (hay.includes(token)) return true;
    const len = [...token].length;
    const maxEdits = len >= 8 ? 2 : len >= 4 ? 1 : 0;
    return maxEdits > 0 && approxIncludes(hay, token, maxEdits);
  });
}

/* ------------------------------------------------------------------ */
/*  แถบสรุปผลการค้นหา แสดงเหนือตาราง (แสดงเฉพาะตอนมีการค้นหา)            */
/* ------------------------------------------------------------------ */

export function SearchSummary({
  query,
  shown,
  total,
}: {
  query: string;
  shown: number;
  total: number;
}) {
  if (!query.trim()) return null;
  return (
    <p className="mb-3 text-sm text-slate-500" aria-live="polite">
      ผลการค้นหา “
      <span className="font-medium text-slate-800">{query.trim()}</span>” พบ{" "}
      <span className="font-semibold text-brand-600">{shown}</span> จากทั้งหมด{" "}
      {total} รายการ
    </p>
  );
}
