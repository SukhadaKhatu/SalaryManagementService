# Salary database

Requires PostgreSQL 14 or later. Create a new database named `salary_management` using your usual PostgreSQL administration tool, then run from the project root:

```sh
psql -v ON_ERROR_STOP=1 -d salary_management -f backend/db/schema.sql
psql -v ON_ERROR_STOP=1 -d salary_management -f backend/db/seed.sql
```

Set `PGHOST`, `PGPORT`, `PGUSER`, and other standard PostgreSQL connection settings as needed. Both scripts are transactional. The schema is for a new database and is not a migration system. The seed creates exactly 10,000 deterministic, fictional employees and refuses to run if any of its tables contain data; it never deletes existing records. Use a separate empty database to reseed.

Salaries are annual base pay in minor currency units. The country determines the employee's currency; the included currencies each have two decimal places. Amounts in different currencies must be grouped separately, not added or averaged together. Salary change rows preserve the currency at the time of the change; the future API must write the employee update and audit row in one transaction and use `version` for optimistic concurrency.

Run the database checks against a freshly seeded database:

```sh
psql -v ON_ERROR_STOP=1 -d salary_management -f backend/tests/db.test.sql
```
