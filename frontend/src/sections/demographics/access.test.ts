import { beforeEach, describe, expect, it, vi } from 'vitest';

// The destination's two gates — central server, vaccine module — are
// navigation's (spec/navigation § central administration destinations), read
// off the registry by the menu, the palette and the router alike. This asserts
// the registry row the demographics spec relies on, and that no PERMISSION
// gates the destination: reading needs none (rules § access), the write
// permission is mirrored at the click, not the route.
//
// Behaviour anchors: spec/demographics/acceptance.md AC-A1 (the client half —
// see BUILD_REPORT.md for why a direct URL off-central is redirected here).

const state = {
  central: false,
  vaccineModule: false,
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

const PATH = 'manage/indicators-demographics';

const offeredPaths = () =>
  gateNav(navConfig).flatMap(item => [
    item.path,
    ...(item.children ?? []).map(child => child.path),
  ]);

beforeEach(() => {
  state.central = false;
  state.vaccineModule = false;
  state.permissions = new Set();
});

describe('the registry row (navigation § central administration destinations)', () => {
  it('sits in the central-gated Manage group, gated on the vaccine module, with no permission', () => {
    const manage = navConfig.find(item => item.path === 'manage');
    expect(manage?.gate).toBe('central');
    const entry = manage?.children?.find(child => child.path === PATH);
    expect(entry?.labelKey).toBe('indicators-demographics');
    expect(entry?.gate).toBe('vaccineModule');
    expect(entry?.permission).toBeUndefined();
  });
});

describe('where the destination is offered', () => {
  it('is withheld on a remote site, vaccine module or not', () => {
    expect(offeredPaths()).not.toContain(PATH);
    state.vaccineModule = true;
    expect(offeredPaths()).not.toContain(PATH);
  });

  it('is withheld on a central server whose store has the vaccine module off', () => {
    state.central = true;
    expect(offeredPaths()).not.toContain(PATH);
  });

  it('is offered to EVERY user on a central server with the vaccine module on — reading needs no permission', () => {
    state.central = true;
    state.vaccineModule = true;
    expect(offeredPaths()).toContain(PATH);
    state.permissions = new Set(['EDIT_CENTRAL_DATA']);
    expect(offeredPaths()).toContain(PATH);
  });
});

describe('the URL follows the same gates (D70: a capability gate redirects)', () => {
  it('blocks the route where either gate fails', () => {
    expect(routeAccess(PATH)).toEqual({ kind: 'blocked' });
    state.central = true;
    expect(routeAccess(PATH)).toEqual({ kind: 'blocked' });
    state.central = false;
    state.vaccineModule = true;
    expect(routeAccess(PATH)).toEqual({ kind: 'blocked' });
  });

  it('admits any user where both pass, the write permission or not', () => {
    state.central = true;
    state.vaccineModule = true;
    expect(routeAccess(PATH)).toEqual({ kind: 'ok' });
    state.permissions = new Set(['EDIT_CENTRAL_DATA']);
    expect(routeAccess(PATH)).toEqual({ kind: 'ok' });
  });
});
