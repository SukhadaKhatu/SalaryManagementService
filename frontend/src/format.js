export const formatNumber = (n) => new Intl.NumberFormat('en-US').format(n);
export const formatMoney = (minor, currency) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: minor % 100 ? 2 : 0,
}).format(minor / 100);
export function parseSalary(value) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const [major, decimals = ''] = value.trim().split('.');
  const amount = Number(major) * 100 + Number(decimals.padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount <= 100000000000 ? amount : null;
}
export function salaryInput(minor) { return (minor / 100).toFixed(2); }
