export function formatBRL(n: number): string {
  return (
    'R$ ' +
    (Number(n) || 0)
      .toFixed(2)
      .replace('.', ',')
      .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
  );
}

export function parseBRL(s: string): number {
  const v = String(s || '').replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(v) || 0;
}

export function maskBRLInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const v = (parseInt(digits, 10) / 100)
    .toFixed(2)
    .replace('.', ',')
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  return 'R$ ' + v;
}

export function maskCPFInput(raw: string): string {
  let v = raw.replace(/\D/g, '').slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return v;
}

/** Formata CPF (aceita só dígitos OU já formatado) → "000.000.000-00". */
export function formatCPF(raw: string): string {
  const d = (raw || '').replace(/\D/g, '');
  if (d.length !== 11) return raw;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function formatLongDate(iso?: string): string {
  const d = new Date(iso || Date.now());
  return `Caxias do Sul, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function maskWhatsappInput(raw: string): string {
  let v = raw.replace(/\D/g, '').slice(0, 11);
  if (v.length === 0) return '';
  if (v.length <= 2) return `(${v}`;
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
}

/** Constrói URL wa.me com prefixo Brasil 55 e somente dígitos. */
export function whatsappLink(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const e164 = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${e164}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
