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
  permissions: new Set<string>(),
  prescriber: false,
};

vi.mock('../store/storeContext', () => ({
  isDispensary: () => state.dispensary,
  hasProgramModule: () => state.programModule,
  hasVaccineModule: () => state.vaccineModule,
  hasProcurement: () => state.procurement,
  hasPermission: (permission: string) => state.permissions.has(permission),
  isPrescriberMode: () => state.prescriber,
}));
vi.mock('../api/serverInfo', () => ({
  isCentralServer: () => state.central,
}));

import { navConfig } from './navConfig';
import {
  activeNavConfig,
  deniedPermission,
  gateNav,
  navHomePath,
  routeAccess,
} from './navGates';

beforeEach(() => {
  state.dispensary = false;
  state.programModule = false;
  state.vaccineModule = false;
  state.procurement = false;
  state.central = false;
  state.permissions = new Set();
  state.prescriber = false;
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

  it('never hides a permission-gated destination (D94: visible, refused)', () => {
    // No permissions at all — Stocktakes (STOCKTAKE_QUERY) stays offered.
    expect(gatedPaths()).toContain('inventory/stocktakes');
  });

  it('keeps section references stable when nothing under them changed', () => {
    const inventory = navConfig.find(item => item.path === 'inventory');
    expect(gateNav(navConfig)).toContain(inventory);
  });
});

describe('routeAccess (OMS-REG-NAV-01.16, .19/.20)', () => {
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

  it('refuses a permission-gated destination with the PascalCase name (.20)', () => {
    state.programModule = true;
    expect(routeAccess('replenishment/r-and-r-forms')).toEqual({
      kind: 'forbidden',
      permission: 'RnrFormQuery',
    });
    state.permissions = new Set(['RNR_FORM_QUERY']);
    expect(routeAccess('replenishment/r-and-r-forms')).toEqual({ kind: 'ok' });
  });

  it('passes unknown paths through (the not-found page owns them)', () => {
    expect(routeAccess('no-such-place')).toEqual({ kind: 'ok' });
    // The legacy Home address is no longer a destination — it redirects.
    expect(routeAccess('dashboard')).toEqual({ kind: 'ok' });
    // Home itself is ungated, reached at the store root.
    expect(routeAccess('')).toEqual({ kind: 'ok' });
  });
});

describe('deniedPermission (D94 refusal names)', () => {
  it('converts the enum name to the PascalCase the modal humanises', () => {
    expect(deniedPermission({ permission: 'OUTBOUND_SHIPMENT_QUERY' })).toBe(
      'OutboundShipmentQuery'
    );
    expect(deniedPermission({ permission: undefined })).toBeUndefined();
    state.permissions = new Set(['OUTBOUND_SHIPMENT_QUERY']);
    expect(
      deniedPermission({ permission: 'OUTBOUND_SHIPMENT_QUERY' })
    ).toBeUndefined();
  });
});

/*
 * Prescriber mode: the second registry (spec/prescription-requests §
 * prescriber mode, PM-1..PM-6).
 *
 * These assert the REGISTRY SWAP, which is the whole mechanism: every surface
 * reads the registry in force through these helpers, so what the gated tree
 * contains is what the menu shows, what the palette lists and what the router
 * admits — the three cannot disagree because there is nothing for them to
 * disagree with.
 */
describe('prescriber mode registry (PM-1, PM-3, PM-4)', () => {
  const prescriberPaths = () =>
    gateNav(activeNavConfig()).flatMap(item => [
      item.path,
      ...(item.children ?? []).map(child => child.path),
    ]);

  beforeEach(() => {
    state.prescriber = true;
    state.dispensary = true;
    state.permissions = new Set(['PRESCRIPTION_QUERY', 'PATIENT_QUERY']);
  });

  it('offers prescriptions, patients, items, settings and help — and nothing else', () => {
    expect(prescriberPaths().sort()).toEqual(
      [
        'catalogue',
        'catalogue/items',
        'dispensary',
        'dispensary/patients',
        'dispensary/prescription-request',
        'help',
        'settings',
      ].sort()
    );
  });

  it('withholds dispensing, stock, reports and Home', () => {
    const paths = prescriberPaths();
    expect(paths).not.toContain('dispensary/prescription');
    expect(paths).not.toContain('inventory/stock');
    expect(paths).not.toContain('reports');
    // Home is the empty path, and prescriber mode has none (PM-5).
    expect(paths).not.toContain('');
  });

  it('leaves the full registry alone for everyone else', () => {
    state.prescriber = false;
    expect(activeNavConfig()).toBe(navConfig);
    expect(prescriberPaths()).toContain('dispensary/prescription');
  });

  it('keeps prescription requests OUT of the full registry (PM-9)', () => {
    // Prescriber mode is the only way in, so the destination is absent from
    // the menu and the palette of every other user in the same dispensary.
    state.prescriber = false;
    expect(prescriberPaths()).not.toContain('dispensary/prescription-request');
  });

  it('reshapes when the flag changes, without anything being rebuilt', () => {
    // PM-2: switching to a store where the user is a prescriber changes the
    // registry in place — the accessor is read fresh, never captured.
    expect(activeNavConfig()).not.toBe(navConfig);
    state.prescriber = false;
    expect(activeNavConfig()).toBe(navConfig);
  });
});

describe('prescriber mode routing (PM-5)', () => {
  beforeEach(() => {
    state.prescriber = true;
    state.dispensary = true;
    state.permissions = new Set(['PRESCRIPTION_QUERY', 'PATIENT_QUERY']);
  });

  it('admits the three offered destinations and their record screens', () => {
    expect(routeAccess('dispensary/prescription-request')).toEqual({
      kind: 'ok',
    });
    expect(routeAccess('dispensary/prescription-request/abc-123')).toEqual({
      kind: 'ok',
    });
    expect(routeAccess('dispensary/patients')).toEqual({ kind: 'ok' });
    expect(routeAccess('catalogue/items')).toEqual({ kind: 'ok' });
  });

  it('blocks a destination the registry does not offer', () => {
    // Reachable for an ordinary user in the same store; absent here.
    expect(routeAccess('dispensary/prescription')).toEqual({ kind: 'blocked' });
    expect(routeAccess('inventory/stock')).toEqual({ kind: 'blocked' });
    expect(routeAccess('reports')).toEqual({ kind: 'blocked' });
  });

  it('blocks Home and unknown paths rather than showing a dead end', () => {
    // The full registry passes these to the not-found page; prescriber mode
    // has no Home to fall back to, so they redirect to the landing screen.
    expect(routeAccess('')).toEqual({ kind: 'blocked' });
    expect(routeAccess('no-such-place')).toEqual({ kind: 'blocked' });
  });

  it('sends a blocked route to the request list, not the store root', () => {
    expect(navHomePath()).toBe('dispensary/prescription-request');
    state.prescriber = false;
    expect(navHomePath()).toBe('');
  });

  it('refuses the prescriber destinations to everyone else (PM-9)', () => {
    // A dispensary user with every prescription permission still cannot reach
    // the prescriber's screens — by address any more than by menu. The refusal
    // names the mode, not the reads the user does hold.
    state.prescriber = false;
    state.permissions = new Set([
      'PRESCRIPTION_QUERY',
      'PRESCRIPTION_MUTATE',
      'PATIENT_QUERY',
    ]);
    expect(routeAccess('dispensary/prescription-request')).toEqual({
      kind: 'forbidden',
      permission: 'PrescriberMode',
    });
    expect(routeAccess('dispensary/prescription-request/abc-123')).toEqual({
      kind: 'forbidden',
      permission: 'PrescriberMode',
    });
    // The destinations the two registries SHARE stay reachable.
    expect(routeAccess('dispensary/patients')).toEqual({ kind: 'ok' });
    expect(routeAccess('catalogue/items')).toEqual({ kind: 'ok' });
    expect(routeAccess('dispensary/prescription')).toEqual({ kind: 'ok' });
  });

  it('still refuses a permission the user lacks (PM-8)', () => {
    state.permissions = new Set(['PATIENT_QUERY']);
    expect(routeAccess('dispensary/prescription-request')).toEqual({
      kind: 'forbidden',
      permission: 'PrescriptionQuery',
    });
  });
});
