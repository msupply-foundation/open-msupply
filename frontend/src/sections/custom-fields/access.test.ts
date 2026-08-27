import { beforeEach, describe, expect, it, vi } from 'vitest';

// The screen's availability gate (spec/custom-fields rules § availability and
// permission). The gates read runtime signals (store context + server info);
// this drives those directly, as navGates.test.ts does, so each pairing is
// asserted against a controlled server/user shape.
//
// Behaviour anchors: spec/custom-fields/cases/OMS-REG-CF-02.

const state = { central: false, permissions: new Set<string>() };

vi.mock('../../store/storeContext', () => ({
  isDispensary: () => false,
  hasProgramModule: () => false,
  hasVaccineModule: () => false,
  hasProcurement: () => false,
  hasPermission: (permission: string) => state.permissions.has(permission),
  isPrescriberMode: () => false,
}));
vi.mock('../../api/serverInfo', () => ({
  isCentralServer: () => state.central,
}));

const { navConfig } = await import('../../nav/navConfig');
const { gateNav, routeAccess } = await import('../../nav/navGates');

const PATH = 'manage/custom-fields';

const offeredPaths = () =>
  gateNav(navConfig).flatMap(item => [
    item.path,
    ...(item.children ?? []).map(child => child.path),
  ]);

beforeEach(() => {
  state.central = false;
  state.permissions = new Set();
});

describe('only a server admin on the central server reaches it (OMS-REG-CF-02.1)', () => {
  it('registers the destination in the Manage group', () => {
    const manage = navConfig.find(item => item.path === 'manage');
    const entry = manage?.children?.find(child => child.path === PATH);
    expect(entry?.labelKey).toBe('custom-fields');
    // Admin plumbing hides like a capability rather than refusing like a
    // permission gate (spec/navigation § central administration).
    expect(entry?.gate).toBe('centralAdmin');
  });

  it('withholds the nav entry on a remote site, admin or not', () => {
    expect(offeredPaths()).not.toContain(PATH);
    state.permissions = new Set(['SERVER_ADMIN']);
    expect(offeredPaths()).not.toContain(PATH);
  });

  it('withholds the nav entry from a non-admin on the central server', () => {
    state.central = true;
    expect(offeredPaths()).not.toContain(PATH);
  });

  it('offers the nav entry to a server admin on the central server', () => {
    state.central = true;
    state.permissions = new Set(['SERVER_ADMIN']);
    expect(offeredPaths()).toContain(PATH);
  });
});

describe('the URL is no way in either (OMS-REG-CF-02.15)', () => {
  it('blocks the route off central and for a non-admin', () => {
    expect(routeAccess(PATH)).toEqual({ kind: 'blocked' });
    state.central = true;
    expect(routeAccess(PATH)).toEqual({ kind: 'blocked' });
    state.central = false;
    state.permissions = new Set(['SERVER_ADMIN']);
    expect(routeAccess(PATH)).toEqual({ kind: 'blocked' });
  });

  it('admits a server admin on the central server', () => {
    state.central = true;
    state.permissions = new Set(['SERVER_ADMIN']);
    expect(routeAccess(PATH)).toEqual({ kind: 'ok' });
  });
});
