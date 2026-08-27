import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The SDK's route/link primitives (spec/plugins/sdk-contract.md § SDK surface;
 * AC-PLUG-P3 for the link, AC-PLUG-P4 for the route).
 *
 * Two things they exist to stop a plugin getting wrong, and both are asserted
 * at BOTH mounts: the entered store, and the mount the app is served under. A
 * hand-built '/{store}/inventory/stock' is right at the root and a 404 on the
 * deployed /rc/ track, where the router declines to intercept a link that
 * doesn't start with its base (#1141) — so agreeing across mounts is the
 * primitive's whole job, exactly as it is for storeRelativePath, which takes
 * the same prefix back off.
 *
 * `routerBase` is read from import.meta.env.BASE_URL at module load, so the
 * base is stubbed before importing: resetModules drops the cached copy and the
 * dynamic import picks up the stub. That exercises the real constants rather
 * than test-only parameters.
 */

const state: { storeId: string | undefined } = { storeId: undefined };
const navigated = vi.fn();

vi.mock('../store/storeContext', () => ({
  currentStoreId: () => state.storeId,
}));
vi.mock('../nav/hostNavigate', () => ({
  hostNavigate: (href: string, options?: { replace?: boolean }) =>
    navigated(href, options),
}));

const at = async (base: string) => {
  vi.stubEnv('BASE_URL', base);
  vi.resetModules();
  return await import('./navigation');
};

const mounts: [string, string][] = [
  ['root mount', '/'],
  ['nested mount', '/rc/'],
];

beforeEach(() => {
  state.storeId = 'store-a';
  navigated.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe.each(mounts)('storeHref (%s)', (_name, base) => {
  // The mount prefix the router will insist on seeing: '' at the root, '/rc'
  // nested.
  const mount = base.replace(/\/$/, '');

  it('roots a registry path under the entered store, below the mount', async () => {
    const { storeHref } = await at(base);
    expect(storeHref('inventory/stock')).toBe(
      `${mount}/store-a/inventory/stock`
    );
  });

  it('tolerates a leading slash on the path', async () => {
    const { storeHref } = await at(base);
    expect(storeHref('/catalogue/items')).toBe(
      `${mount}/store-a/catalogue/items`
    );
  });

  it("addresses the store's landing screen for the empty path", async () => {
    const { storeHref } = await at(base);
    expect(storeHref('')).toBe(`${mount}/store-a`);
  });

  it("carries the path's own query string through", async () => {
    const { storeHref } = await at(base);
    // What a deep-link builder produces: the shared ?query= filter param
    // (kdd/url-structure).
    const filtered = 'inventory/stock?query=%7B%22filter%22%3A%7B%7D%7D';
    expect(storeHref(filtered)).toBe(`${mount}/store-a/${filtered}`);
  });

  it('joins a query-only path straight onto the store root', async () => {
    const { storeHref } = await at(base);
    // Not `${mount}/store-a/?query=…`: a slash before the `?` would be a
    // second spelling of the landing screen (OMS-REG-NAV-01.22).
    expect(storeHref('?query=%7B%22filter%22%3A%7B%7D%7D')).toBe(
      `${mount}/store-a?query=%7B%22filter%22%3A%7B%7D%7D`
    );
    expect(storeHref('/?query=abc')).toBe(`${mount}/store-a?query=abc`);
  });

  it('follows a store switch', async () => {
    const { storeHref } = await at(base);
    state.storeId = 'store-b';
    expect(storeHref('inventory/stock')).toBe(
      `${mount}/store-b/inventory/stock`
    );
  });

  it('falls back to the app root before a store is entered', async () => {
    const { storeHref } = await at(base);
    state.storeId = undefined;
    // Not '/undefined/inventory/stock': there is no in-store screen to
    // address yet, and the root's guard resolves a store and lands there.
    expect(storeHref('inventory/stock')).toBe(`${mount}/`);
  });
});

describe('navigateTo', () => {
  it('navigates to the resolved href, mount and store included', async () => {
    const { navigateTo } = await at('/rc/');
    navigateTo('dispensary/prescription');
    expect(navigated).toHaveBeenCalledWith(
      '/rc/store-a/dispensary/prescription',
      undefined
    );
  });

  it('passes the replace option through', async () => {
    const { navigateTo } = await at('/');
    navigateTo('catalogue/items', { replace: true });
    expect(navigated).toHaveBeenCalledWith('/store-a/catalogue/items', {
      replace: true,
    });
  });

  it('reports the root redirect it takes before a store is entered', async () => {
    const warned = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { navigateTo } = await at('/rc/');
    state.storeId = undefined;

    navigateTo('dispensary/prescription');

    // The redirect still happens (the root guard re-enters a store), but the
    // named path was dropped to get there — never silently: an href rendered
    // early re-resolves, a navigation TAKEN early is a programming error.
    expect(navigated).toHaveBeenCalledWith('/rc/', undefined);
    expect(warned).toHaveBeenCalledOnce();
    warned.mockRestore();
  });
});
