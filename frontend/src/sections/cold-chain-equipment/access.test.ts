import { beforeEach, describe, expect, it, vi } from 'vitest';

// The screen's availability gates (spec/cold-chain-equipment rules §
// permissions, ui-surface § cross-cutting). Both are the destination's, not
// this vertical's: the store's vaccine module hides it as a capability, and
// ASSET_QUERY refuses it as a permission. The gates read runtime signals
// (store context + server info); this drives those directly, as
// navGates.test.ts does.
//
// The client half only. The server stays the real guard — AC-G1 names a server
// refusal, and that leg is recorded as a C2 gap in BUILD_REPORT.

const state = {
  vaccineModule: false,
  central: false,
  permissions: new Set<string>(),
};

vi.mock('../../store/storeContext', () => ({
  isDispensary: () => false,
  hasProgramModule: () => false,
  hasVaccineModule: () => state.vaccineModule,
  hasProcurement: () => false,
  hasPermission: (permission: string) => state.permissions.has(permission),
}));
vi.mock('../../api/serverInfo', () => ({
  isCentralServer: () => state.central,
}));

const { navConfig } = await import('../../nav/navConfig');
const { gateNav, routeAccess } = await import('../../nav/navGates');

const COLD_CHAIN = 'cold-chain/equipment';
const MANAGE = 'manage/equipment';

const offeredPaths = () =>
  gateNav(navConfig).flatMap(item => [
    item.path,
    ...(item.children ?? []).map(child => child.path),
  ]);

beforeEach(() => {
  state.vaccineModule = false;
  state.central = false;
  state.permissions = new Set();
});

describe('the destination declares both of its gates', () => {
  it('sits in the Cold chain group, which carries the vaccine-module gate', () => {
    const section = navConfig.find(item => item.path === 'cold-chain');
    expect(section?.gate).toBe('vaccineModule');
    const entry = section?.children?.find(child => child.path === COLD_CHAIN);
    expect(entry?.labelKey).toBe('equipment');
    expect(entry?.permission).toBe('ASSET_QUERY');
  });

  it('names the second destination under Manage, behind the same capability', () => {
    // The two are the same screens; only the store scope differs (rules › the
    // two destinations).
    const section = navConfig.find(item => item.path === 'manage');
    const entry = section?.children?.find(child => child.path === MANAGE);
    expect(entry?.gate).toBe('vaccineModule');
  });
});

describe('AC-G1 the screen is withheld without the asset read permission', () => {
  it('withholds the nav entry from a user who lacks it', () => {
    state.vaccineModule = true;
    expect(offeredPaths()).not.toContain(COLD_CHAIN);
  });

  it('refuses the URL rather than redirecting — the address stays as typed', () => {
    state.vaccineModule = true;
    expect(routeAccess(COLD_CHAIN)).toEqual({ kind: 'denied' });
  });

  it('offers it once the user holds the permission', () => {
    state.vaccineModule = true;
    state.permissions = new Set(['ASSET_QUERY']);
    expect(offeredPaths()).toContain(COLD_CHAIN);
    expect(routeAccess(COLD_CHAIN)).toEqual({ kind: 'ok' });
  });
});

describe('the vaccine module gates the whole Cold chain section', () => {
  it('withholds the destination from a store without it, permission or not', () => {
    state.permissions = new Set(['ASSET_QUERY']);
    expect(offeredPaths()).not.toContain(COLD_CHAIN);
  });
});

describe('AC-S6 Manage › Equipment is a central-server destination', () => {
  it('is withheld on a site that is not central', () => {
    state.vaccineModule = true;
    state.permissions = new Set(['ASSET_QUERY']);
    expect(offeredPaths()).not.toContain(MANAGE);
  });

  it('is offered on a central server with the vaccine module', () => {
    state.central = true;
    state.vaccineModule = true;
    state.permissions = new Set(['ASSET_QUERY']);
    expect(offeredPaths()).toContain(MANAGE);
  });
});

describe('AC-G5 the register is reachable with the read permission held', () => {
  it('offers the destination and admits the URL', () => {
    state.vaccineModule = true;
    state.permissions = new Set(['ASSET_QUERY', 'ASSET_MUTATE']);
    expect(offeredPaths()).toContain(COLD_CHAIN);
    expect(routeAccess(COLD_CHAIN)).toEqual({ kind: 'ok' });
  });
});
