import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * A crumb's `to` is router-space and the crumb adds the mount (#271). The
 * mount is read from import.meta.env.BASE_URL when storeRelativePath loads,
 * so each case stubs it and re-imports — the real constant, as
 * storeRelativePath.test.ts does.
 */
const at = async (base: string) => {
  vi.stubEnv('BASE_URL', base);
  vi.resetModules();
  return await import('./Breadcrumb');
};

afterEach(() => vi.unstubAllEnvs());

describe('crumbHref', () => {
  it('links a router-space path at the root mount', async () => {
    const { crumbHref } = await at('/');
    expect(crumbHref('/STORE1/catalogue/items')).toBe(
      '/STORE1/catalogue/items'
    );
  });

  it('puts a nested mount in front, so the link stays inside the app', async () => {
    const { crumbHref } = await at('/rc/');
    expect(crumbHref('/STORE1/catalogue/items')).toBe(
      '/rc/STORE1/catalogue/items'
    );
  });

  it('uses a hash-routed host’s fragment as it is', async () => {
    const { crumbHref } = await at('/rc/');
    expect(crumbHref('#/header')).toBe('#/header');
  });
});
