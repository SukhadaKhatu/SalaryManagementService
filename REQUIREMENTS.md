# Salary management — requirements

## Goal
Give ACME's HR manager a dependable way to explore and maintain salary data for 10,000 employees across countries, replacing manual spreadsheet analysis.

## Scope
- Browse and search employees by name, email or ID; filter by country and department; sort and paginate on the server.
- View compensation distributions and totals by country and department, with employee counts and average salaries. Salaries are stored in local currency and amounts in different currencies are never summed or averaged together.
- Edit an employee's annual base salary with validation and an audit trail. Use optimistic concurrency to prevent silently overwriting another edit.
- Seed a deterministic, realistic dataset of 10,000 employees across multiple countries and currencies. Provide repeatable local setup and automated tests.
- Provide accessible, responsive UI, loading and error states, and clear currency and annual-pay labels.

## Deliberately out of scope
- Authentication, authorization and encryption at rest: the demo uses synthetic data and must not be exposed to real salary data until organizational identity, access controls and security review are in place.
- Currency conversion: exchange rates change and cross-currency comparisons can mislead; show separate currency groups instead.
- Payroll processing, benefits, bonuses, historical imports and approval workflows: these require organization-specific policy and integration decisions beyond the core salary-management task.
- Cloud deployment and production operations depend on a hosting account and secrets; the project will include deployment guidance and a self-contained local demo.
