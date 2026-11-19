import React from 'react';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, History, AlertCircle } from 'lucide-react';
import { getEmployee, getHistory, updateSalary } from '../api';
import { formatMoney, parseSalary, salaryInput } from '../format';

export default function SalaryDialog({ employee, onClose, onSaved }) {
  const [current, setCurrent] = useState(employee);
  const [value, setValue] = useState(salaryInput(employee.annual_salary_minor));
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    getHistory(employee.id, controller.signal).then(result => setHistory(result.history)).catch(err => { if (err.name !== 'AbortError') setHistoryError(err.message); });
    return () => controller.abort();
  }, [employee.id]);
  async function save(event) {
    event.preventDefault();
    const amount = parseSalary(value);
    if (amount === null) { setError('Enter a valid amount from 0 to 1,000,000,000, with up to two decimal places.'); return; }
    setBusy(true); setError('');
    try { await updateSalary(current.id, amount, current.version); onSaved(); }
    catch (err) { setError(err.message); setConflict(err.code === 'VERSION_CONFLICT'); }
    finally { setBusy(false); }
  }
  async function reload() {
    setBusy(true); setError('');
    try {
      const [result, changes] = await Promise.all([getEmployee(current.id), getHistory(current.id)]);
      setCurrent(result.employee); setValue(salaryInput(result.employee.annual_salary_minor)); setHistory(changes.history); setHistoryError(''); setConflict(false);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <Dialog.Root open onOpenChange={open => { if (!open && !busy) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content">
      <div className="dialog-heading"><div><div className="eyebrow">EMPLOYEE COMPENSATION</div><Dialog.Title>Edit annual salary</Dialog.Title><Dialog.Description>{current.first_name} {current.last_name} · {current.job_title}</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Close" disabled={busy}><X size={19}/></Dialog.Close></div>
      <form onSubmit={save}><label htmlFor="salary">Annual base salary <span>({current.currency})</span></label><div className="salary-input"><span>{current.currency}</span><input id="salary" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} autoFocus aria-describedby="salary-help"/></div><p className="help" id="salary-help">Enter the annual amount in {current.currency}. Changes are recorded in the salary history.</p>
        {error && <div className="inline-error" role="alert"><AlertCircle size={17}/><div>{error}{conflict && <button className="text-button" type="button" onClick={reload} disabled={busy}>Reload latest salary</button>}</div></div>}
        <div className="dialog-actions"><button className="button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="button primary" disabled={busy || conflict}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </form>
      <div className="history"><h3><History size={17}/> Salary history</h3>{historyError ? <p className="help" role="alert">Could not load history: {historyError}</p> : history === null ? <p className="help">Loading history…</p> : history.length === 0 ? <p className="help">No salary changes recorded yet.</p> : <ul>{history.map(item => <li key={item.id}><span>{formatMoney(item.old_salary_minor, item.currency)} <span className="history-separator">to</span> {formatMoney(item.new_salary_minor, item.currency)}</span><time dateTime={item.changed_at}>{new Date(item.changed_at).toLocaleString()}</time></li>)}</ul>}</div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
