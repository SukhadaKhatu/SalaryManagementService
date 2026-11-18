# Salary management API

Node.js, Express and PostgreSQL. Requires Node 18+ and PostgreSQL 14+. The API is a demo using synthetic data and has no authentication or authorization; do not expose it to real salary data or an untrusted network.

1. Create and seed a database as described in [db/README.md](db/README.md).
2. In `backend`, run `npm install`, copy `.env.example` to `.env`, and set `DATABASE_URL`. Optionally set `PORT` and `CORS_ORIGIN` (defaults: 3000 and `http://localhost:5173`).
3. Run `npm run dev` or `npm start`. `GET /health` checks that the HTTP process is running; it does not check database connectivity.

## API contract

All responses are JSON. Errors have the shape `{ "error": { "code": "...", "message": "..." } }`. Money values are annual base salaries in integer minor units (for example, USD cents); averages may contain fractional minor units. Do not add or compare different currencies. Timestamps are UTC ISO 8601 strings.

- `GET /api/employees`: server-side pagination and filters. Query parameters: `search` (name, email or ID; max 100 characters), `country` (two-letter code), `department` (numeric ID), `page` (default 1), `limit` (default 20, max 100), `sort` (`name`, `id`, `department`, `country`, `salary`), and `order` (`asc`, `desc`). Sorting by salary requires a country filter so unlike currencies are not compared. Response: `{ employees, total, page, limit }`.
- `GET /api/employees/:id`: `{ employee }`.
- `PATCH /api/employees/:id/salary`: body `{ "annual_salary_minor": 12000000, "version": 1 }`. Returns `{ employee }`. A stale version returns HTTP 409 with `VERSION_CONFLICT`; fetch the employee again before retrying. A changed amount and its audit record are committed together. An unchanged amount creates no audit record and does not increment the version.
- `GET /api/employees/:id/salary-history`: `{ history }`, newest first, up to 100 entries.
- `GET /api/reports/summary`: employee, country and department counts, compensation grouped by country and by department **and currency**, and country/department filter options. `total_salary_minor` and `average_salary_minor` always refer to the specified currency.

## Integration tests

Create a **disposable** database and apply the schema and seed as described in `db/README.md`. The tests change employee 1's salary and require a freshly seeded database. Then:

```sh
TEST_DATABASE_URL=postgresql://localhost:5432/salary_test npm test
```

Without `TEST_DATABASE_URL`, integration tests are skipped. Never point them at a database containing data you wish to keep.
