import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Only ever point this at a disposable database with schema.sql and seed.sql applied.
const databaseUrl = process.env.TEST_DATABASE_URL;
if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
let server, base, pool;
if (databaseUrl) {
  before(async () => {
    const app = (await import('../src/app.js')).default;
    pool = (await import('../src/config/db.js')).pool;
    server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => { await new Promise(resolve => server.close(resolve)); await pool.end(); });
}
async function request(path, options) {
  const response = await fetch(base + path, options);
  return { status: response.status, body: await response.json() };
}
const patch = (salary, version) => ({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ annual_salary_minor: salary, version }) });
const options = { skip: !databaseUrl && 'Set TEST_DATABASE_URL to a disposable seeded PostgreSQL database.' };

test('employee search, filtering, pagination, sorting, and validation', options, async () => {
  let r = await request('/api/employees?search=example.com&country=US&page=2&limit=5&sort=id&order=desc');
  assert.equal(r.status, 200); assert.equal(r.body.employees.length, 5); assert.ok(r.body.total > 5);
  assert.ok(r.body.employees.every(e => e.country_code === 'US'));
  assert.ok(r.body.employees[0].id > r.body.employees[1].id);
  const employee = r.body.employees[0];
  r = await request(`/api/employees?search=${employee.id}&department=${employee.department_id}`);
  assert.ok(r.body.employees.some(e => e.id === employee.id));
  r = await request('/api/employees?search=%25');
  assert.equal(r.body.total, 0);
  for (const query of ['page=0', 'limit=101', 'sort=invalid', 'sort=salary', 'order=sideways', 'department=abc', 'search=a&search=b']) {
    assert.equal((await request('/api/employees?' + query)).status, 400, query);
  }
  assert.equal((await request('/api/employees?country=US&sort=salary')).status, 200);
  assert.equal((await request('/api/employees/99999999')).status, 404);
});

test('summary groups compensation without mixing currencies', options, async () => {
  const r = await request('/api/reports/summary');
  assert.equal(r.status, 200); assert.equal(r.body.employee_count, 10000);
  assert.equal(r.body.country_count, 6); assert.equal(r.body.department_count, 8);
  assert.equal(r.body.by_country.reduce((n, c) => n + c.employee_count, 0), 10000);
  assert.equal(r.body.by_department_currency.reduce((n, d) => n + d.employee_count, 0), 10000);
  const us = r.body.by_country.find(c => c.country_code === 'US');
  const db = await pool.query(`SELECT sum(e.annual_salary_minor)::float8 AS total FROM employees e WHERE e.country_code = 'US'`);
  assert.equal(us.currency, 'USD'); assert.equal(us.total_salary_minor, db.rows[0].total);
});

test('salary updates validate input, audit changes, and reject concurrent stale writes', options, async () => {
  const original = (await request('/api/employees/1')).body.employee;
  assert.equal((await request('/api/employees/1/salary', patch(-1, original.version))).status, 400);
  assert.equal((await request('/api/employees/1/salary', patch(1.5, original.version))).status, 400);
  const unchanged = await request('/api/employees/1/salary', patch(original.annual_salary_minor, original.version));
  assert.equal(unchanged.body.employee.version, original.version);
  const [a, b] = await Promise.all([
    request('/api/employees/1/salary', patch(original.annual_salary_minor + 100, original.version)),
    request('/api/employees/1/salary', patch(original.annual_salary_minor + 200, original.version))
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  const updated = (a.status === 200 ? a : b).body.employee;
  assert.equal(updated.version, original.version + 1);
  const history = (await request('/api/employees/1/salary-history')).body.history;
  assert.equal(history.length, 1); assert.equal(history[0].old_salary_minor, original.annual_salary_minor);
  assert.equal(history[0].new_salary_minor, updated.annual_salary_minor); assert.equal(history[0].currency, original.currency);
  assert.equal((await request('/api/employees/99999999/salary-history')).status, 404);
  assert.equal((await request('/api/employees/99999999/salary', patch(0, 1))).status, 404);
});
