// Helpers for reading from the read-only id pools discovered in setup() and shared to every VU.

// Deterministically pick one entry, spreading access across VUs/iterations via the salts.
export function pick(pool, ...salts) {
  if (!pool || pool.length === 0) return undefined;
  const sum = salts.reduce((a, b) => a + (Number(b) || 0), 0);
  return pool[Math.abs(sum) % pool.length];
}

// Take up to `n` entries starting at a salt-derived offset, wrapping around the pool.
export function take(pool, n, ...salts) {
  if (!pool || pool.length === 0) return [];
  const count = Math.min(n, pool.length);
  const sum = salts.reduce((a, b) => a + (Number(b) || 0), 0);
  const start = Math.abs(sum) % pool.length;
  const out = [];
  for (let i = 0; i < count; i++) out.push(pool[(start + i) % pool.length]);
  return out;
}
