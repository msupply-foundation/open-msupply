import { beforeEach, describe, expect, it, vi } from 'vitest';

// The gates read runtime signals (store context + server info); the tests
// drive those directly so each registry rule is asserted against a controlled
// store/user/server shape (spec/navigation › behaviours; anchors
// OMS-REG-NAV-01.*).
const state = {
  dispensary: false,
  programModule: false,
  vaccineModule: false,
  procurement: false,
  central: false,
  // Most tests exercise the capability gates on destinations that also carry
  // a query permission, so permissions default to all-granted; tests about the
  // permission gates themselves opt out.
  grantAll: true,
  permissions: new Set<string>(),
};

vi.mock('../store/storeContext', () => ({
  isDispensary: () => state.dispensary,
  hasProgramModule: () => state.programModule,
  hasVaccineModule: () => state.vaccineModule,
  hasProcurement: () => state.procurement,
  hasPermission: (permission: string) =>
    state.grantAll || state.permissions.has(permission),
}));
vi.mock('../api/serverInfo', () => ({
  isCentralServer: () => state.central,
}));

import { navConfig } from './navConfig';
import { gateNav, routeAccess } from './navGates';

beforeEach(() => {
  state.dispensary = false;
  state.programModule = false;
  state.vaccineModule = false;
  state.procurement = false;
  state.central = false;
  state.grantAll = true;
  state.permissions = new Set();
});

const gatedPaths = () =>
  gateNav(navConfig).flatMap(item => [
    item.path,
    ...(item.children ?? []).map(child => child.path),
  ]);

describe('capability gates (OMS-REG-NAV-01.1–.14)', () => {
  it('offers R&R Forms only while the program module is on (.1/.2)', () => {
    expect(gatedPaths()).not.toContain('replenishment/r-and-r-forms');
    state.programModule = true;
    expect(gatedPaths()).toContain('replenishment/r-and-r-forms');
  });

  it('offers Encounters only while the program module is on (.3/.4)', () => {
    state.dispensary = true;
    expect(gatedPaths()).not.toContain('dispensary/encounter');
    state.programModule = true;
    expect(gatedPaths()).toContain('dispensary/encounter');
  });

  it('offers the Cold chain section only while the vaccine module is on (.5/.6)', () => {
    expect(gatedPaths()).not.toContain('cold-chain');
    state.vaccineModule = true;
    expect(gatedPaths()).toContain('cold-chain');
    expect(gatedPaths()).toContain('cold-chain/equipment');
  });

  it('offers Purchase Orders only while procurement is on (.7/.8)', () => {
    expect(gatedPaths()).not.toContain('replenishment/purchase-order');
    state.procurement = true;
    expect(gatedPaths()).toContain('replenishment/purchase-order');
  });

  it('offers the Dispensary section only in a dispensary-mode store (.9)', () => {
    expect(gatedPaths()).not.toContain('dispensary');
    state.dispensary = true;
    expect(gatedPaths()).toContain('dispensary');
    expect(gatedPaths()).toContain('dispensary/patients');
  });

  it('offers Manage only on the central server (.10)', () => {
    expect(gatedPaths()).not.toContain('manage');
    state.central = true;
    expect(gatedPaths()).toContain('manage');
    expect(gatedPaths()).toContain('manage/stores');
  });

  it('withholds the admin-only Manage entries without server-admin (.11)', () => {
    state.central = true;
    state.grantAll = false;
    for (const path of [
      'manage/custom-fields',
      'manage/sites',
      'manage/reports',
      'manage/sync-message',
      'manage/plugins',
      'manage/help-documents',
    ]) {
      expect(gatedPaths()).not.toContain(path);
    }
    state.permissions = new Set(['SERVER_ADMIN']);
    expect(gatedPaths()).toContain('manage/help-documents');
    expect(gatedPaths()).toContain('manage/sites');
  });

  it('gates Demographics and Manage › Equipment on the vaccine module (.12)', () => {
    state.central = true;
    expect(gatedPaths()).not.toContain('manage/indicators-demographics');
    expect(gatedPaths()).not.toContain('manage/equipment');
    state.vaccineModule = true;
    expect(gatedPaths()).toContain('manage/indicators-demographics');
    expect(gatedPaths()).toContain('manage/equipment');
  });

  it('offers Programs › Immunizations only on central with the vaccine module (.13)', () => {
    state.vaccineModule = true;
    expect(gatedPaths()).not.toContain('programs/immunisations');
    state.central = true;
    expect(gatedPaths()).toContain('programs/immunisations');
  });

  it('drops a section none of whose destinations are offered (.14)', () => {
    // Programs' only child is vaccine-gated: on central without the module,
    // the child goes and the section must go with it.
    state.central = true;
    expect(gatedPaths()).not.toContain('programs');
  });

  it('keeps section references stable when nothing under them changed', () => {
    const inventory = navConfig.find(item => item.path === 'inventory');
    expect(gateNav(navConfig)).toContain(inventory);
  });
});

describe('permission gates (OMS-REG-NAV-01.18/.20 — D94: hidden)', () => {
  it('hides a destination whose query permission the user lacks (.18)', () => {
    state.grantAll = false;
    expect(gatedPaths()).not.toContain('inventory/stocktakes');
    state.permissions = new Set(['STOCKTAKE_QUERY']);
    expect(gatedPaths()).toContain('inventory/stocktakes');
  });

  it('keeps an unpermissioned destination offered alongside hidden ones', () => {
    // Locations carries no query permission, so a user with none still gets it
    // — and its section with it.
    state.grantAll = false;
    expect(gatedPaths()).toContain('inventory/locations');
    expect(gatedPaths()).toContain('inventory');
  });

  it('drops a section left empty by permission gates (.20)', () => {
    // Cold chain's three destinations are all permission-gated: with the
    // vaccine module on but no permissions, the section itself must go.
    state.vaccineModule = true;
    state.grantAll = false;
    expect(gatedPaths()).not.toContain('cold-chain');
    state.permissions = new Set(['SENSOR_QUERY']);
    expect(gatedPaths()).toContain('cold-chain');
    expect(gatedPaths()).toContain('cold-chain/sensors');
    expect(gatedPaths()).not.toContain('cold-chain/equipment');
  });
});

describe('routeAccess (OMS-REG-NAV-01.16, .19)', () => {
  it('blocks a capability-gated destination and its subpaths (.16)', () => {
    expect(routeAccess('cold-chain/equipment')).toEqual({ kind: 'blocked' });
    expect(routeAccess('cold-chain/equipment/some-asset-id')).toEqual({
      kind: 'blocked',
    });
    state.vaccineModule = true;
    state.permissions = new Set(['ASSET_QUERY']);
    expect(routeAccess('cold-chain/equipment')).toEqual({ kind: 'ok' });
  });

  it("blocks a child while its section's gate fails (inheritance)", () => {
    // Encounters' own gate passes, but Dispensary's store-mode gate does not.
    state.programModule = true;
    expect(routeAccess('dispensary/encounter')).toEqual({ kind: 'blocked' });
    state.dispensary = true;
    expect(routeAccess('dispensary/encounter')).toEqual({ kind: 'ok' });
  });

  it('denies a permission-gated destination the user lacks, in place (.19)', () => {
    state.programModule = true;
    state.grantAll = false;
    expect(routeAccess('replenishment/r-and-r-forms')).toEqual({
      kind: 'denied',
    });
    state.permissions = new Set(['RNR_FORM_QUERY']);
    expect(routeAccess('replenishment/r-and-r-forms')).toEqual({ kind: 'ok' });
  });

  it('blocks, not denies, when the capability gate fails too', () => {
    // The store has no program module AND the user lacks the read: the
    // capability verdict wins — a no-permission notice would send the user
    // chasing a permission for a function the store does not have.
    state.grantAll = false;
    expect(routeAccess('replenishment/r-and-r-forms')).toEqual({
      kind: 'blocked',
    });
  });

  it('passes unknown paths through (the not-found page owns them)', () => {
    expect(routeAccess('no-such-place')).toEqual({ kind: 'ok' });
    // The legacy Home address is no longer a destination — it redirects.
    expect(routeAccess('dashboard')).toEqual({ kind: 'ok' });
    // Home itself is ungated, reached at the store root.
    expect(routeAccess('')).toEqual({ kind: 'ok' });
  });
});

/*
 * The prescriber's vertical is an ORDINARY destination
 * (spec/prescription-requests § permissions).
 *
 * It used to be reached through a second registry, chosen by a permission that
 * took capability away. It is now one row of the one registry, gated by its own
 * read like every other row — so what a prescriber is offered follows from the
 * permissions they hold, and the cut-down menu is what NOT holding the others
 * produces (D94).
 */
describe('prescription requests, gated like anything else', () => {
  beforeEach(() => {
    state.dispensary = true;
    state.grantAll = false;
  });

  it('offers Prescriptions to whoever holds its read, and only them', () => {
    expect(gatedPaths()).not.toContain('dispensary/prescription-request');
    state.permissions = new Set(['PRESCRIPTION_REQUEST_QUERY']);
    expect(gatedPaths()).toContain('dispensary/prescription-request');
  });

  it('separates prescribing from dispensing', () => {
    // The two verticals sit side by side under Dispensary with a permission
    // each: a clinic user gets the prescriber's list without the dispenser's,
    // and a dispenser the reverse.
    state.permissions = new Set(['PRESCRIPTION_REQUEST_QUERY']);
    expect(gatedPaths()).toContain('dispensary/prescription-request');
    expect(gatedPaths()).not.toContain('dispensary/prescription');

    state.permissions = new Set(['PRESCRIPTION_QUERY']);
    expect(gatedPaths()).toContain('dispensary/prescription');
    expect(gatedPaths()).not.toContain('dispensary/prescription-request');
  });

  it('gates the route the same way, record screens included', () => {
    // A withheld read denies in place rather than redirecting (D94 as PR #466
    // settled it) — the vertical's own permission is no exception.
    expect(routeAccess('dispensary/prescription-request')).toEqual({
      kind: 'denied',
    });
    expect(routeAccess('dispensary/prescription-request/abc-123')).toEqual({
      kind: 'denied',
    });
    state.permissions = new Set(['PRESCRIPTION_REQUEST_QUERY']);
    expect(routeAccess('dispensary/prescription-request')).toEqual({
      kind: 'ok',
    });
    expect(routeAccess('dispensary/prescription-request/abc-123')).toEqual({
      kind: 'ok',
    });
  });

  it('leaves a clinic-only user the destinations that carry no read', () => {
    // What the old mode arranged by omission, permissions arrange by absence —
    // as far as gates reach. Home, Settings and Help carry no permission, so
    // they stay: chrome the user needs, not the app's functions.
    state.permissions = new Set(['PRESCRIPTION_REQUEST_QUERY']);
    const paths = gatedPaths();
    expect(paths).toContain('dispensary/prescription-request');
    expect(paths).not.toContain('inventory/stock');
    expect(paths).not.toContain('reports');
    expect(paths).toContain('');
    expect(paths).toContain('settings');
    expect(paths).toContain('help');
  });
});
