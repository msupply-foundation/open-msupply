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

describe('crumbHref (OMS-REG-NAV-02.5)', () => {
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

describe('parentOf — where Escape goes (spec/keyboard KB-X5)', () => {
  it('is the crumb before the current page (OMS-REG-KBD-02.6, .43)', async () => {
    const { parentOf } = await at('/');
    expect(
      parentOf([
        { label: 'Patients', to: '/S/dispensary/patients' },
        { label: 'Jo', to: '/S/dispensary/patients/p1' },
        {
          label: 'Vaccinations',
          to: '/S/dispensary/patients/p1?tab=vaccinations',
        },
        { label: 'Card' },
      ])
    ).toBe('/S/dispensary/patients/p1?tab=vaccinations');
  });

  it('is nothing for a single-crumb trail — a list (OMS-REG-KBD-02.42)', async () => {
    const { parentOf } = await at('/');
    expect(parentOf([{ label: 'Stocktakes' }])).toBeUndefined();
  });

  it('is nothing when the crumb before the page has nowhere to go', async () => {
    const { parentOf } = await at('/');
    expect(
      parentOf([{ label: 'Loading' }, { label: 'Record' }])
    ).toBeUndefined();
  });
});
