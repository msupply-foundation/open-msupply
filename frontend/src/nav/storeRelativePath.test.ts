import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * Issue #1141. The bug only ever showed on a NESTED mount, so every case runs
 * at BOTH mounts and expects the same store-relative path out — agreeing
 * across mounts is the derivation's whole job.
 *
 * `routerBase` is read from import.meta.env.BASE_URL when the module loads, so
 * the base has to be stubbed before importing it: vi.resetModules() drops the
 * cached copy and the dynamic import picks up the stubbed env. That exercises
 * the real constant rather than a test-only parameter.
 */
const at = async (base: string) => {
  vi.stubEnv('BASE_URL', base);
  vi.resetModules();
  return (await import('./storeRelativePath')).storeRelativePath;
};

afterEach(() => vi.unstubAllEnvs());

const mounts: [string, string][] = [
  ['root mount', '/'],
  ['nested mount', '/rc/'],
];

describe.each(mounts)('storeRelativePath (%s)', (_label, base) => {
  // What the browser's location.pathname reads at this mount.
  const url = (path: string) => `${base.replace(/\/$/, '')}${path}`;

  it('strips the mount and the store segment', async () => {
    const relative = await at(base);
    expect(relative(url('/STORE1/inventory/stocktakes'), 'STORE1')).toBe(
      'inventory/stocktakes'
    );
  });

  it('keeps a record screen under its list', async () => {
    const relative = await at(base);
    expect(
      relative(url('/STORE1/inventory/stocktakes/abc-123'), 'STORE1')
    ).toBe('inventory/stocktakes/abc-123');
  });

  it('resolves the store root to the empty path (the dashboard)', async () => {
    const relative = await at(base);
    expect(relative(url('/STORE1'), 'STORE1')).toBe('');
    expect(relative(url('/STORE1/'), 'STORE1')).toBe('');
  });

  // The regression: with the mount left in, the nested leg returned
  // 'rc/STORE1/inventory/stocktakes'. That matched no nav leaf (no highlight,
  // no breadcrumb glyph, no tab title) and no destination in routeAccess, so
  // every capability and permission route gate silently passed.
  it('leaves no trace of the mount or the store in the result', async () => {
    const relative = await at(base);
    const result = relative(url('/STORE1/inventory/stocktakes'), 'STORE1');
    expect(result.startsWith('rc')).toBe(false);
    expect(result).not.toContain('STORE1');
  });
});
