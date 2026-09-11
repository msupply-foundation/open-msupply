import { beforeEach, describe, expect, it, vi } from 'vitest';

// The screen's availability gates (spec/cold-chain-sensors rules §
// permissions, ui-surface § cross-cutting). Both are the destination's, not
// this vertical's: the store's vaccine module hides it as a capability, and
// SENSOR_QUERY refuses it as a permission. The gates read runtime signals
// (store context + server info); this drives those directly, as
// navGates.test.ts does.
//
// The client half only. The server stays the real guard — rules § permissions
// names the server refusal, and that leg is recorded as a C2 gap in
// BUILD_REPORT. The gate itself is navigation's, so it carries no
// OMS-REG-CCE-03 behaviour of its own (spec/cold-chain-sensors/acceptance.md,
// where the retired AC-G1/AC-G2 are mapped).

const state = { vaccineModule: false, permissions: new Set<string>() };

vi.mock('../../store/storeContext', () => ({
  isDispensary: () => false,
  hasProgramModule: () => false,
  hasVaccineModule: () => state.vaccineModule,
  hasProcurement: () => false,
  hasPermission: (permission: string) => state.permissions.has(permission),
}));
vi.mock('../../api/serverInfo', () => ({
  isCentralServer: () => false,
}));

const { navConfig } = await import('../../nav/navConfig');
const { gateNav, routeAccess } = await import('../../nav/navGates');

const PATH = 'cold-chain/sensors';

const offeredPaths = () =>
  gateNav(navConfig).flatMap(item => [
    item.path,
    ...(item.children ?? []).map(child => child.path),
  ]);

beforeEach(() => {
  state.vaccineModule = false;
  state.permissions = new Set();
});

describe('the destination declares both of its gates', () => {
  it('sits in the Cold chain group, which carries the vaccine-module gate', () => {
    const section = navConfig.find(item => item.path === 'cold-chain');
    expect(section?.gate).toBe('vaccineModule');
    const entry = section?.children?.find(child => child.path === PATH);
    expect(entry?.labelKey).toBe('sensors');
    expect(entry?.permission).toBe('SENSOR_QUERY');
  });
});

describe('the screen is withheld without the sensor read permission', () => {
  it('withholds the nav entry from a user who lacks it', () => {
    state.vaccineModule = true;
    expect(offeredPaths()).not.toContain(PATH);
  });

  it('refuses the URL rather than redirecting — the address stays as typed', () => {
    state.vaccineModule = true;
    expect(routeAccess(PATH)).toEqual({ kind: 'denied' });
  });

  it('offers it once the user holds the permission', () => {
    state.vaccineModule = true;
    state.permissions = new Set(['SENSOR_QUERY']);
    expect(offeredPaths()).toContain(PATH);
    expect(routeAccess(PATH)).toEqual({ kind: 'ok' });
  });
});

describe('the vaccine module hides the destination entirely', () => {
  it('withholds it on a store without the module, permission or not', () => {
    expect(offeredPaths()).not.toContain(PATH);
    state.permissions = new Set(['SENSOR_QUERY']);
    expect(offeredPaths()).not.toContain(PATH);
  });

  it('blocks the URL — a capability the store has not got is a dead address', () => {
    state.permissions = new Set(['SENSOR_QUERY']);
    expect(routeAccess(PATH)).toEqual({ kind: 'blocked' });
  });
});
