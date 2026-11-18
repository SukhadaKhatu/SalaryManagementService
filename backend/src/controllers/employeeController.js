import * as employees from '../services/employeeService.js';
import { AppError } from '../middleware/errorHandler.js';
const invalid = (message) => new AppError(400, 'INVALID_INPUT', message);
function positiveInteger(value, name, max) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) throw invalid(`${name} must be a positive integer no greater than ${max}.`);
  return Number(value);
}
function employeeId(req) { return positiveInteger(req.params.id, 'Employee ID', 2147483647); }
function scalar(value, name) {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw invalid(`${name} must be a single value.`);
  return value.trim();
}
export async function list(req, res) {
  const search = scalar(req.query.search, 'Search');
  const country = scalar(req.query.country, 'Country').toUpperCase();
  const departmentText = scalar(req.query.department, 'Department');
  const department = departmentText ? positiveInteger(departmentText, 'Department', 32767) : null;
  const page = req.query.page === undefined ? 1 : positiveInteger(req.query.page, 'Page', 100000);
  const limit = req.query.limit === undefined ? 20 : positiveInteger(req.query.limit, 'Limit', 100);
  const sort = scalar(req.query.sort, 'Sort') || 'name';
  const order = (scalar(req.query.order, 'Order') || 'asc').toLowerCase();
  if (search.length > 100) throw invalid('Search must be at most 100 characters.');
  if (country && !/^[A-Z]{2}$/.test(country)) throw invalid('Country must be a two-letter country code.');
  if (!['name', 'id', 'department', 'country', 'salary'].includes(sort)) throw invalid('Invalid sort field.');
  if (!['asc', 'desc'].includes(order)) throw invalid('Order must be asc or desc.');
  if (sort === 'salary' && !country) throw invalid('Filter by country when sorting by salary.');
  res.json(await employees.listEmployees({ search, country, department, page, limit, sort, order: order.toUpperCase() }));
}
export async function get(req, res) { res.json({ employee: await employees.getEmployee(employeeId(req)) }); }
export async function history(req, res) { res.json({ history: await employees.getSalaryHistory(employeeId(req)) }); }
export async function update(req, res) {
  const id = employeeId(req);
  const { annual_salary_minor: salary, version } = req.body || {};
  if (!Number.isSafeInteger(salary) || salary < 0 || salary > 100000000000) throw invalid('annual_salary_minor must be a whole number between 0 and 100000000000.');
  if (!Number.isSafeInteger(version) || version < 1 || version > 2147483647) throw invalid('version must be a positive integer.');
  res.json({ employee: await employees.updateSalary(id, salary, version) });
}
