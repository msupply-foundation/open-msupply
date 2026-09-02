import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The palette's destinations are DERIVED from the navigation registry (D18,
 * spec/keyboard KB-R1), and the value of that is a guarantee no reviewer should
 * have to re-check by eye: a destination added to the menu is in the palette.
 * So these assert the derivation itself — the rule — rather than a transcript
 * of today's rows, which would be the enumeration the change removed.
 *
 * The gates read runtime signals; drive them directly, as navGates.test does.
 */
const state = {
  dispensary: false,
  programModule: false,
  vaccineModule: false,
  procurement: false,
  central: false,
  // Permissions default to all-granted so the capability-gate tests read
  // clean; the permission-gate test opts out (navGates.test does the same).
  grantAll: true,
  permissions: new Set<string>(),
  prescriber: false,
};

vi.mock('../store/storeContext', () => ({
  isDispensary: () => state.dispensary,
  hasProgramModule: () => state.programModule,
  hasVaccineModule: () => state.vaccineModule,
  hasProcurement: () => state.procurement,
  hasPermission: (permission: string) =>
    state.grantAll || state.permissions.has(permission),
  isPrescriberMode: () => state.prescriber,
}));
vi.mock('../api/serverInfo', () => ({
  isCentralServer: () => state.central,
}));

import { navConfig } from '../nav/navConfig';
import { gateNav } from '../nav/navGates';
import { setDictionaries, setLocale } from '../intl/intl';
import commonEn from '../intl/locales/en/common.json';
import { actionName, type KeyAction } from '../ui/utils/keyActions';
import { ALT_D, ALT_H } from '../ui/utils/shortcuts';
import { createNavActions } from './navActions';

// Seed the catalog, as intl.test does: a derived name is COMPOSED from two
// catalog reads, so an unseeded translator would leave every row reading
// 'cmdk.goto' and the naming assertions would pass on nothing.
setDictionaries({ en: commonEn });
setLocale('en');

beforeEach(() => {
  state.dispensary = false;
  state.programModule = false;
  state.vaccineModule = false;
  state.procurement = false;
  state.central = false;
  state.grantAll = true;
  state.permissions = new Set();
});

// Registration is ownerless here, so each test disposes what it made — the
// registry is module-level and would otherwise leak into the next one.
const withActions = (
  run: (actions: KeyAction[], navigate: ReturnType<typeof vi.fn>) => void
) => {
  const navigate = vi.fn();
  const actions = createNavActions(navigate);
  try {
    run(actions, navigate);
  } finally {
    actions.forEach(action => action.dispose());
  }
};

// The rows the palette LISTS — its own per-open rule: a disabled action is
// inert and unlisted. The gates live in `disabled` and are read here, at
// asking time, so these names track the state as it is NOW, not as it was
// when the set was registered.
const names = (actions: KeyAction[]) =>
  actions
    .filter(action => action.disabled?.() !== true)
    .map(actionName);

// What the menu offers this store, leaves only — the same shape navActions
// derives, computed here from the registry rather than transcribed.
const offeredLeafPaths = () =>
  gateNav(navConfig).flatMap(item =>
    item.children ? item.children.map(child => child.path) : [item.path]
  );

describe('palette destinations', () => {
  it('lists exactly the leaf destinations the menu offers', () => {
    // Whatever the registry is made to hold, the two counts move together —
    // which is the guarantee, and what an enumerated allowlist could not give.
    withActions(actions => {
      expect(names(actions)).toHaveLength(offeredLeafPaths().length);
    });

    state.dispensary = true;
    state.vaccineModule = true;
    state.central = true;
    state.procurement = true;
    withActions(actions => {
      expect(names(actions)).toHaveLength(offeredLeafPaths().length);
    });
  });

  it('does not list a section landing page', () => {
    // Its page renders the sub-menu the palette exists to skip.
    withActions(actions => {
      expect(names(actions)).not.toContain('Go to: Inventory');
      expect(names(actions)).not.toContain('Go to: Replenishment');
    });
  });

  it('includes the destinations the old allowlist had dropped', () => {
    withActions(actions => {
      // Customer returns is the one that surfaced the defect; the others were
      // menu-only for the same reason.
      expect(names(actions)).toEqual(
        expect.arrayContaining([
          'Go to: Customer Returns',
          'Go to: Supplier Returns',
          'Go to: Stock movements',
          'Go to: Assets',
        ])
      );
    });
  });

  it('names a destination after its own menu label, or its override', () => {
    withActions(actions => {
      expect(names(actions)).toContain('Go to: Stocktakes');
      // The overrides earn their place: the menu's column is not in the row.
      expect(names(actions)).toContain('Go to: View Stock');
      expect(names(actions)).not.toContain('Go to: Stock');
    });
  });

  it('carries Alt+D for Home and Alt+H for Help', () => {
    withActions(actions => {
      // Alt+D is keyed on the destination's PATH, which CK-1.7 moved from
      // 'dashboard' to '' (Home IS the store root). The binding moved with it,
      // so the shortcut a user's fingers know is unchanged while the row it
      // names is the renamed one.
      const home = actions.find(a => actionName(a) === 'Go to: Home');
      const help = actions.find(a => actionName(a) === 'Go to: Help');
      expect(home?.shortcut).toBe(ALT_D);
      expect(help?.shortcut).toBe(ALT_H);
      // One row each — the defect that comes of registering a destination in
      // both navActions and globalActions.
      expect(names(actions).filter(n => n === 'Go to: Help')).toHaveLength(1);
    });
  });

  it('drops a destination whose capability gate fails, with the menu', () => {
    withActions(actions => {
      expect(names(actions)).not.toContain('Go to: Dispensing');
    });
    state.dispensary = true;
    withActions(actions => {
      expect(names(actions)).toContain('Go to: Dispensing');
    });
  });

  it('omits the prescriber-only destinations (spec/prescription-requests PM-9)', () => {
    // Prescriptions — the prescriber's own list — is not in this registry at
    // all, so a dispensary user's palette cannot offer it. The palette derives
    // from the registry in force, which is the whole point of D107.
    state.dispensary = true;
    withActions(actions => {
      expect(names(actions)).not.toContain('Go to: Prescriptions');
    });
  });

  it('drops a permission-gated destination the user lacks, with the menu', () => {
    // D94: hidden, exactly as the menu hides it — no listed-but-refused rows.
    state.grantAll = false;
    withActions(actions => {
      expect(names(actions)).not.toContain('Go to: Stocktakes');
    });

    state.permissions = new Set(['STOCKTAKE_QUERY']);
    withActions((actions, navigate) => {
      actions.find(a => actionName(a) === 'Go to: Stocktakes')?.run();
      expect(navigate).toHaveBeenCalledWith('inventory/stocktakes');
    });
  });

  it('drops a destination whose permission is withdrawn AFTER registration', () => {
    // The sync scenario: the actions are registered once for the shell's
    // lifetime, then the post-sync context refresh revokes a permission. The
    // menu's memo re-runs; the palette must agree at its next open — which it
    // does because the gate is each row's `disabled`, read per open, never a
    // fact baked in at registration (OMS-REG-NAV-01.15/.17).
    state.grantAll = false;
    state.permissions = new Set(['STOCKTAKE_QUERY']);
    withActions(actions => {
      expect(names(actions)).toContain('Go to: Stocktakes');

      state.permissions = new Set();
      expect(names(actions)).not.toContain('Go to: Stocktakes');
      // The row is withheld, not gone: granting the permission back (another
      // sync, another login) re-lists it without any re-registration.
      state.permissions = new Set(['STOCKTAKE_QUERY']);
      expect(names(actions)).toContain('Go to: Stocktakes');
    });
  });

  it('drops a destination whose capability gate turns off after registration', () => {
    // Same mechanism, other gate class: a store preference switched off by
    // sync takes the row with it at the palette's next open.
    state.vaccineModule = true;
    withActions(actions => {
      expect(names(actions)).toContain('Go to: Cold chain equipment');
      state.vaccineModule = false;
      expect(names(actions)).not.toContain('Go to: Cold chain equipment');
    });
  });
});
