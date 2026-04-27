/**
 * Rate limit em memória — protege endpoints de auth contra brute force.
 * Funciona por instance do server. Em deploy single-container (Dokploy padrão),
 * isso é suficiente. Pra múltiplos pods precisaria Redis.
 */

interface Bucket {
  count: number;
  firstAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Identificador (ex: IP ou IP+endpoint). */
  key: string;
  /** Máximo de tentativas dentro da janela. */
  max?: number;
  /** Tamanho da janela em ms. */
  windowMs?: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec?: number;
  remaining?: number;
}

export function rateLimit({
  key,
  max = 8,
  windowMs = 15 * 60 * 1000,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.firstAt > windowMs) {
    buckets.set(key, { count: 1, firstAt: now });
    return { ok: true, remaining: max - 1 };
  }

  bucket.count++;
  if (bucket.count > max) {
    const retryAfterSec = Math.ceil((windowMs - (now - bucket.firstAt)) / 1000);
    return { ok: false, retryAfterSec };
  }
  return { ok: true, remaining: max - bucket.count };
}

/** Reset (após login bem-sucedido). */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/** Pega IP do request (Traefik/Dokploy injeta x-forwarded-for). */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

/**
 * GC simples — periodicamente remove buckets expirados pra evitar leak.
 * 1h por padrão, threshold de 1h pra remoção.
 */
if (typeof setInterval === 'function') {
  setInterval(() => {
    const now = Date.now();
    const cutoff = 60 * 60 * 1000;
    for (const [k, b] of buckets) {
      if (now - b.firstAt > cutoff) buckets.delete(k);
    }
  }, 60 * 60 * 1000).unref?.();
}
