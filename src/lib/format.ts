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
