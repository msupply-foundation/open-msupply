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
};

vi.mock('../store/storeContext', () => ({
  isDispensary: () => state.dispensary,
  hasProgramModule: () => state.programModule,
  hasVaccineModule: () => state.vaccineModule,
  hasProcurement: () => state.procurement,
  hasPermission: (permission: string) => state.permissions.has(permission),
}));
vi.mock('../api/serverInfo', () => ({
  isCentralServer: () => state.central,
}));

import { navConfig } from './navConfig';
import { deniedPermission, gateNav, routeAccess } from './navGates';

beforeEach(() => {
  state.dispensary = false;
  state.programModule = false;
  state.vaccineModule = false;
  state.procurement = false;
  state.central = false;
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
    expect(routeAccess('dashboard')).toEqual({ kind: 'ok' });
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
