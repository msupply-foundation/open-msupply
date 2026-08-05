import { createAction, type KeyAction } from '../ui/utils/keyActions';
import { navConfig, type NavItem } from '../nav/navConfig';
import { deniedPermission, gateNav } from '../nav/navGates';
import { reportPermissionDenied } from '../api/graphql';
import { ALT_D, type Shortcut } from '../ui/utils/shortcuts';

/*
 * The palette's "Go to:" destinations (spec/keyboard KB-R1, ui-surface S1 §
 * Action names) — every one reachable by NAME only, none carrying a shortcut.
 *
 * DERIVED from navConfig, not hand-listed: the menu and the palette must agree
 * about where the user can go, and a second list would drift the first time a
 * destination moved. The gating is the shared `gateNav`, so the dispensary,
 * vaccine-module and central rules are applied once for both surfaces (AC-KB4).
 *
 * KB-R2's line about mode and module gates applies exactly here: they
 * "legitimately gate an action whose DESTINATION they gate — Prescriptions and
 * Patients need a dispensary store to go to". That is the opposite of gating a
 * generic action, which is the defect KB-R2 exists to forbid.
 */

// Every gated destination carrying a palette name, sections and children alike.
// The final flatMap both filters and narrows, so `cmdkKey` is a LocaleKey below
// with no cast (kdd/type-safety: `as` only in trusted layers).
const paletteDestinations = (): {
  name: NonNullable<NavItem['cmdkKey']>;
  path: string;
  permission?: NavItem['permission'];
}[] =>
  gateNav(navConfig)
    .flatMap(item => [item, ...(item.children ?? [])])
    .flatMap(item =>
      item.cmdkKey === undefined
        ? []
        : [{ name: item.cmdkKey, path: item.path, permission: item.permission }]
    );

/**
 * Register one action per reachable destination, for as long as the caller's
 * owner lives.
 *
 * Called from KeyboardHost inside the store-scoped shell, so the gates read a
 * settled store context. It registers the set ONCE for the session rather than
 * tracking the gates: a store change re-enters through StoreGuardLayout, which
 * remounts the shell and so re-runs this with the new store's gates.
 */
/*
 * The one destination that also carries a shortcut, per the binding table:
 * `Alt+D` → "Go to Dashboard". It belongs HERE rather than among the global
 * commands, because Dashboard is a DESTINATION (ui-surface S1 lists it under
 * Destinations, not Commands) and registering it in both places would put two
 * "Go to: Dashboard" rows in the palette — one with the shortcut, one without.
 */
const DESTINATION_SHORTCUTS: Record<string, Shortcut> = {
  dashboard: ALT_D,
};

export const createNavActions = (
  navigate: (path: string) => void
): KeyAction[] =>
  paletteDestinations().map(destination => {
    const shortcut = DESTINATION_SHORTCUTS[destination.path];
    return createAction({
      name: destination.name,
      ...(shortcut ? { shortcut } : {}),
      // A permission-gated destination is listed but refuses at run time, the
      // same refusal as the menu (spec/navigation § permission gates, D94) —
      // checked when fired, not at registration, so a permission granted after
      // login is honoured without re-registering.
      run: () => {
        const denied = deniedPermission(destination);
        if (denied !== undefined) {
          reportPermissionDenied([denied]);
          return;
        }
        navigate(destination.path);
      },
    });
  });
