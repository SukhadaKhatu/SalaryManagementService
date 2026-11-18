import { pool } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

const employeeColumns = `e.id, e.first_name, e.last_name, e.email, e.job_title,
  d.id AS department_id, d.name AS department, c.code AS country_code,
  c.name AS country, c.currency, e.annual_salary_minor::float8 AS annual_salary_minor,
  e.version, e.created_at, e.updated_at`;
const joins = `FROM employees e JOIN departments d ON d.id = e.department_id JOIN countries c ON c.code = e.country_code`;
const sorts = { name: 'e.last_name', id: 'e.id', department: 'd.name', country: 'c.name', salary: 'e.annual_salary_minor' };

export async function listEmployees({ search, country, department, page, limit, sort, order }) {
  const clauses = [], values = [];
  if (search) {
    values.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
    const p = `$${values.length}`;
    clauses.push(`(concat_ws(' ', e.first_name, e.last_name) ILIKE ${p} OR e.email ILIKE ${p} OR e.id::text ILIKE ${p})`);
  }
  if (country) { values.push(country); clauses.push(`e.country_code = $${values.length}`); }
  if (department) { values.push(department); clauses.push(`d.id = $${values.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const count = await pool.query(`SELECT count(*)::int AS total ${joins} ${where}`, values);
  const result = await pool.query(`SELECT ${employeeColumns} ${joins} ${where} ORDER BY ${sorts[sort]} ${order}, e.id ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, (page - 1) * limit]);
  return { employees: result.rows, total: count.rows[0].total, page, limit };
}

export async function getEmployee(id) {
  const result = await pool.query(`SELECT ${employeeColumns} ${joins} WHERE e.id = $1`, [id]);
  if (!result.rowCount) throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found.');
  return result.rows[0];
}

export async function getSalaryHistory(id) {
  await getEmployee(id);
  const result = await pool.query(`SELECT id, old_salary_minor::float8 AS old_salary_minor, new_salary_minor::float8 AS new_salary_minor, currency, changed_at FROM salary_changes WHERE employee_id = $1 ORDER BY changed_at DESC, id DESC LIMIT 100`, [id]);
  return result.rows;
}

export async function updateSalary(id, salary, version) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`SELECT e.annual_salary_minor::float8 AS salary, e.version, c.currency FROM employees e JOIN countries c ON c.code = e.country_code WHERE e.id = $1 FOR UPDATE OF e`, [id]);
    if (!result.rowCount) throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found.');
    const employee = result.rows[0];
    if (employee.version !== version) throw new AppError(409, 'VERSION_CONFLICT', 'This employee was updated elsewhere. Refresh and try again.');
    if (employee.salary !== salary) {
      await client.query('UPDATE employees SET annual_salary_minor = $1, version = version + 1, updated_at = now() WHERE id = $2', [salary, id]);
      await client.query('INSERT INTO salary_changes (employee_id, old_salary_minor, new_salary_minor, currency) VALUES ($1, $2, $3, $4)', [id, employee.salary, salary, employee.currency]);
    }
    const updated = await client.query(`SELECT ${employeeColumns} ${joins} WHERE e.id = $1`, [id]);
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
