import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * Issue #1141. Five consumers read this derivation, and a mount left in the
 * string disabled all five at once: the menu highlight and its collapsed
 * marker (chrome OMS-REG-FTR-02.4/.19/.21), the tab title (.27), the
 * breadcrumb's section glyph (chrome § app bar), the keyboard's navigate-up
 * (keyboard KB-X5), and the route gates (navigation OMS-REG-NAV-01.16/.20) —
 * which fail OPEN when no destination matches, so these cases are the only
 * guard standing behind them at a nested mount.
 *
 * The bug only ever showed on a NESTED mount, so every case runs at BOTH
 * mounts and expects the same store-relative path out — agreeing across
 * mounts is the derivation's whole job.
 *
 * `routerBase` is read from import.meta.env.BASE_URL when the module loads, so
 * the base has to be stubbed before importing it: vi.resetModules() drops the
 * cached copy and the dynamic import picks up the stubbed env. That exercises
 * the real constants rather than test-only parameters.
 */
const at = async (base: string) => {
  vi.stubEnv('BASE_URL', base);
  vi.resetModules();
  return await import('./storeRelativePath');
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
    const { storeRelativePath } = await at(base);
    expect(
      storeRelativePath(url('/STORE1/inventory/stocktakes'), 'STORE1')
    ).toBe('inventory/stocktakes');
  });

  it('keeps a record screen under its list', async () => {
    const { storeRelativePath } = await at(base);
    expect(
      storeRelativePath(url('/STORE1/inventory/stocktakes/abc-123'), 'STORE1')
    ).toBe('inventory/stocktakes/abc-123');
  });

  it('resolves the store root to the empty path (the dashboard)', async () => {
    const { storeRelativePath } = await at(base);
    expect(storeRelativePath(url('/STORE1'), 'STORE1')).toBe('');
    expect(storeRelativePath(url('/STORE1/'), 'STORE1')).toBe('');
  });

  /*
   * The mount comes off even when the store segment doesn't match, which is
   * the failure direction that matters: routeAccess reads "no destination
   * matched" as { kind: 'ok' }, so a string still carrying the mount would
   * pass every capability and permission gate (OMS-REG-NAV-01.16/.20) rather
   * than fail closed. Same expectation at both mounts, which is the point.
   */
  it('drops the mount even when the store segment does not match', async () => {
    const { storeRelativePath } = await at(base);
    expect(
      storeRelativePath(url('/OTHER/inventory/stocktakes'), 'STORE1')
    ).toBe('OTHER/inventory/stocktakes');
  });

  /*
   * App.tsx hands this straight to <Router base>. solid-router concatenates it
   * with an absolute `to` without normalising, so a trailing slash here
   * becomes '/rc//id' — a path that matches no route and drops the base. The
   * trim has no test of its own otherwise, and nothing but a manual check on a
   * nested mount would catch losing it.
   */
  it('exposes a mount prefix the router cannot double-slash', async () => {
    const { routerBase } = await at(base);
    expect(routerBase.endsWith('/')).toBe(false);
    expect(`${routerBase}/STORE1`).not.toContain('//');
  });
});
