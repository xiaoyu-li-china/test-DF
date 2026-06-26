import dayjs from 'dayjs';

export function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

export function formatDate(date: string, format: string = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format);
}

export function formatDateTime(date: string): string {
  return dayjs(date).format('MM-DD HH:mm');
}

export function formatPhone(phone: string): string {
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3');
}

export function maskName(name: string): string {
  if (name.length <= 1) return name;
  return name[0] + '*'.repeat(name.length - 1);
}
