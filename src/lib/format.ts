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

/**
 * Valida número de WhatsApp brasileiro.
 * Aceita com ou sem prefixo 55 e com qualquer formatação.
 * Retorna `e164` com 55 + DDD + número (12 ou 13 dígitos).
 *
 * NOTA: não checa se o número está REGISTRADO no WhatsApp — isso só é
 * possível via WhatsApp Business API (paga) ou Twilio Lookup. Aqui
 * validamos apenas o FORMATO brasileiro (DDD válido + 8 ou 9 dígitos
 * + 9 obrigatório no início pra celular).
 */
export function validateWhatsappBR(raw: string): {
  valid: boolean;
  e164?: string;
  formatted?: string;
  error?: string;
} {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return { valid: false, error: 'Informe o WhatsApp.' };

  let local = digits;
  if (digits.startsWith('55') && digits.length >= 12) {
    local = digits.slice(2);
  } else if (digits.length > 11) {
    return { valid: false, error: 'Número muito longo.' };
  }

  if (local.length !== 10 && local.length !== 11) {
    return {
      valid: false,
      error: 'Número inválido. Use DDD + número (ex: 54 99999-9999).',
    };
  }

  const ddd = parseInt(local.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) {
    return { valid: false, error: 'DDD inválido.' };
  }

  // Celular brasileiro tem 9 dígitos no número e começa com 9
  if (local.length === 11 && local[2] !== '9') {
    return {
      valid: false,
      error: 'Celular brasileiro precisa começar com 9 (ex: 99999-9999).',
    };
  }

  return {
    valid: true,
    e164: '55' + local,
    formatted: maskWhatsappInput(local),
  };
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
