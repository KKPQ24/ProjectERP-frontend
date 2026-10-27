import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

let policy;
function getPolicy() {
  if (policy) return policy;
  const file = new URL('../lib/access.ts', import.meta.url);
  assert.ok(fs.existsSync(file), 'Frontend must enforce the backend role policy');
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  policy = {};
  new Function('exports', outputText)(policy);
  return policy;
}

const protectedRoutes = {
  '/masterdata/users': ['ADMIN'],
  '/admin/audit-logs': ['ADMIN'],
  '/inventory/stock-movements': ['PURCHASING', 'ACCOUNTING'],
  '/masterdata/accounts': ['ACCOUNTING'],
  '/reports/trial-balance': ['ACCOUNTING'],
  '/purchasing/purchase-requisitions': ['PURCHASING'],
  '/purchasing/purchase-orders': ['PURCHASING'],
  '/purchasing/goods-receipts': ['PURCHASING'],
  '/purchasing/bills': ['PURCHASING', 'ACCOUNTING'],
  '/purchasing/payments': ['PURCHASING', 'ACCOUNTING'],
  '/sales/quotations': ['SALES'],
  '/sales/sales-orders': ['SALES'],
  '/sales/shipments': ['SALES'],
  '/sales/invoices': ['SALES', 'ACCOUNTING'],
  '/sales/receipts': ['SALES', 'ACCOUNTING'],
};

for (const role of ['ADMIN', 'SALES', 'PURCHASING', 'ACCOUNTING', 'UNKNOWN']) {
  test(`${role} follows backend permissions for list and detail pages`, () => {
    const { canAccessPath } = getPolicy();
    for (const [route, roles] of Object.entries(protectedRoutes)) {
      const allowed = role === 'ADMIN' || roles.includes(role);
      assert.equal(canAccessPath(route, [role]), allowed, route);
      assert.equal(canAccessPath(`${route}/42`, [role]), allowed, `${route}/42`);
    }
  });
}

test('shared master data is available without a special role; unknown routes are denied', () => {
  const { canAccessPath } = getPolicy();
  for (const route of ['/', '/auth/profile', '/masterdata/products', '/masterdata/customers', '/masterdata/suppliers', '/masterdata/units', '/masterdata/categories']) {
    assert.equal(canAccessPath(route, []), true, route);
  }
  assert.equal(canAccessPath('/sales/quotations', []), false);
  assert.equal(canAccessPath('/sales/quotations-other', ['SALES']), false);
  assert.equal(canAccessPath('/unknown', ['ADMIN']), false);
  assert.equal(canAccessPath('/purchasing/bills', ['SALES', 'ACCOUNTING']), true);
  assert.equal(canAccessPath('/sales/receipts?ref_inv=7', ['ACCOUNTING']), true);
  assert.equal(canAccessPath('/sales/shipments?ref_so=7', ['ACCOUNTING']), false);
});

test('dashboard and search never call an API outside the current role', async () => {
  const { fetchIfAllowed } = getPolicy();
  let calls = 0;
  const request = async () => { calls++; return ['document']; };
  assert.deepEqual(await fetchIfAllowed('/purchasing/purchase-orders', ['SALES'], request), []);
  assert.equal(calls, 0);
  assert.deepEqual(await fetchIfAllowed('/sales/quotations', ['SALES'], request), ['document']);
  assert.equal(calls, 1);
  await assert.rejects(fetchIfAllowed('/sales/quotations', ['SALES'], async () => { throw new Error('offline'); }), /offline/);
});

test('a previous session or cached search is not reused after logout or a different login', () => {
  const { isSessionCurrent } = getPolicy();
  const previousSession = { path: '/', token: 'user-a-token' };
  assert.equal(isSessionCurrent(previousSession, '/', 'user-a-token'), true);
  assert.equal(isSessionCurrent(previousSession, '/', 'user-b-token'), false);
  assert.equal(isSessionCurrent(previousSession, '/', null), false);
  assert.equal(isSessionCurrent(previousSession, '/sales/quotations', 'user-a-token'), false);
  assert.equal(isSessionCurrent({ path: '/', token: null }, '/', null), false);
});
