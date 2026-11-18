import { pool } from '../config/db.js';

export async function getSummary() {
  const [overview, countries, departments, filters] = await Promise.all([
    pool.query(`SELECT count(*)::int AS employee_count, count(DISTINCT country_code)::int AS country_count, count(DISTINCT department_id)::int AS department_count FROM employees`),
    pool.query(`SELECT c.code AS country_code, c.name AS country, c.currency, count(*)::int AS employee_count, sum(e.annual_salary_minor)::float8 AS total_salary_minor, round(avg(e.annual_salary_minor), 2)::float8 AS average_salary_minor FROM employees e JOIN countries c ON c.code = e.country_code GROUP BY c.code, c.name, c.currency ORDER BY c.name`),
    pool.query(`SELECT d.id AS department_id, d.name AS department, c.currency, count(*)::int AS employee_count, sum(e.annual_salary_minor)::float8 AS total_salary_minor, round(avg(e.annual_salary_minor), 2)::float8 AS average_salary_minor FROM employees e JOIN departments d ON d.id = e.department_id JOIN countries c ON c.code = e.country_code GROUP BY d.id, d.name, c.currency ORDER BY d.name, c.currency`),
    Promise.all([pool.query('SELECT code, name, currency FROM countries ORDER BY name'), pool.query('SELECT id, name FROM departments ORDER BY name')])
  ]);
  return { ...overview.rows[0], by_country: countries.rows, by_department_currency: departments.rows, filters: { countries: filters[0].rows, departments: filters[1].rows } };
}
