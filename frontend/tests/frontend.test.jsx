import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SalaryDialog from '../src/components/SalaryDialog';
import Directory from '../src/components/Directory';
import { parseSalary, formatMoney } from '../src/format';
import * as api from '../src/api';

vi.mock('../src/api', () => ({ getHistory: vi.fn(), getEmployee: vi.fn(), updateSalary: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const employee = { id: 1, first_name: 'Ana', last_name: 'Lee', job_title: 'Engineer', department: 'Engineering', country: 'United States', currency: 'USD', annual_salary_minor: 1200050, version: 1, email: 'ana@example.com' };
describe('salary input', () => {
  it('converts decimal amounts exactly and rejects invalid input', () => {
    expect(parseSalary('12000.50')).toBe(1200050);
    expect(parseSalary('0.01')).toBe(1);
    for (const bad of ['', '-1', '1.234', '1e2', '1000000000.01']) expect(parseSalary(bad)).toBeNull();
    expect(formatMoney(1200050, 'USD')).toBe('$12,000.50');
  });
});
describe('employee directory', () => {
  it('displays the API data and selects an employee to edit', async () => {
    const onEdit = vi.fn();
    render(<Directory data={{ employees: [employee], total: 1 }} loading={false} error="" filters={{ countries: [], departments: [] }} query={{ search: '', country: '', department: '', sort: 'name', order: 'asc', page: 1 }} setQuery={vi.fn()} onEdit={onEdit} onRetry={vi.fn()}/>);
    expect(screen.getByText('$12,000.50')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Edit salary for Ana Lee' }));
    expect(onEdit).toHaveBeenCalledWith(employee);
  });
});
describe('salary editing', () => {
  it('saves minor units with the employee version', async () => {
    api.getHistory.mockResolvedValue({ history: [] }); api.updateSalary.mockResolvedValue({ employee });
    const onSaved = vi.fn();
    render(<SalaryDialog employee={employee} onClose={vi.fn()} onSaved={onSaved}/>);
    const input = screen.getByLabelText('Annual base salary (USD)');
    await userEvent.clear(input); await userEvent.type(input, '15000.75');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.updateSalary).toHaveBeenCalledWith(1, 1500075, 1));
    expect(onSaved).toHaveBeenCalled();
  });
  it('handles a conflicting update by loading the latest version', async () => {
    api.getHistory.mockResolvedValue({ history: [] });
    api.updateSalary.mockRejectedValue(Object.assign(new Error('This employee was updated elsewhere.'), { code: 'VERSION_CONFLICT' }));
    api.getEmployee.mockResolvedValue({ employee: { ...employee, version: 2, annual_salary_minor: 1300000 } });
    render(<SalaryDialog employee={employee} onClose={vi.fn()} onSaved={vi.fn()}/>);
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Reload latest salary' }));
    await waitFor(() => expect(screen.getByLabelText('Annual base salary (USD)').value).toBe('13000.00'));
  });
});
