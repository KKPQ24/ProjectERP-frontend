// Match MiniProjectERP_BackEnd/src/routes/index.js and middleware/auth.js.
const routeRoles: Record<string, readonly string[]> = {
  "/masterdata/products": [],
  "/masterdata/customers": [],
  "/masterdata/suppliers": [],
  "/masterdata/units": [],
  "/masterdata/categories": [],
  "/masterdata/users": ["ADMIN"],
  "/admin/audit-logs": ["ADMIN"],
  "/inventory/stock-movements": ["PURCHASING", "ACCOUNTING"],
  "/masterdata/accounts": ["ACCOUNTING"],
  "/reports/trial-balance": ["ACCOUNTING"],
  "/purchasing/purchase-requisitions": ["PURCHASING"],
  "/purchasing/purchase-orders": ["PURCHASING"],
  "/purchasing/goods-receipts": ["PURCHASING"],
  "/purchasing/bills": ["PURCHASING", "ACCOUNTING"],
  "/purchasing/payments": ["PURCHASING", "ACCOUNTING"],
  "/sales/quotations": ["SALES"],
  "/sales/sales-orders": ["SALES"],
  "/sales/shipments": ["SALES"],
  "/sales/invoices": ["SALES", "ACCOUNTING"],
  "/sales/receipts": ["SALES", "ACCOUNTING"],
};

export function canAccessPath(pathname: string, roles: readonly string[]): boolean {
  pathname = pathname.split(/[?#]/, 1)[0];
  if (pathname === "/" || pathname === "/auth/profile") return true;
  const route = Object.keys(routeRoles).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (!route) return false;
  const allowed = routeRoles[route];
  return roles.includes("ADMIN") || allowed.length === 0 || allowed.some((role) => roles.includes(role));
}

export function fetchIfAllowed<T>(
  pathname: string,
  roles: readonly string[],
  request: () => Promise<T[]>,
): Promise<T[]> {
  return canAccessPath(pathname, roles) ? request() : Promise.resolve([]);
}

export function isSessionCurrent(
  session: { path: string; token: string | null },
  pathname: string,
  token: string | null,
): boolean {
  return token !== null && session.path === pathname && session.token === token;
}
