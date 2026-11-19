const API = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Unable to complete the request.');
    error.code = data.error?.code;
    throw error;
  }
  return data;
}
export const getSummary = (signal) => request('/reports/summary', { signal });
export const getEmployees = (params, signal) => request(`/employees?${new URLSearchParams(params)}`, { signal });
export const getEmployee = (id, signal) => request(`/employees/${id}`, { signal });
export const getHistory = (id, signal) => request(`/employees/${id}/salary-history`, { signal });
export const updateSalary = (id, salary, version) => request(`/employees/${id}/salary`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ annual_salary_minor: salary, version }),
});
