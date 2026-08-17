import { createAction, type KeyAction } from '../ui/utils/keyActions';
import { navConfig, type NavItem } from '../nav/navConfig';
import { deniedPermission, gateNav } from '../nav/navGates';
import { reportPermissionDenied } from '../api/graphql';
import { t } from '../intl';
import { ALT_D, ALT_H, type Shortcut } from '../ui/utils/shortcuts';

/*
 * The palette's "Go to:" destinations (spec/keyboard KB-R1, ui-surface S1 §
 * Action names).
 *
 * DERIVED from navConfig, and derived WHOLESALE: every destination the registry
 * offers gets a row, named "Go to:" plus the menu's own label. There is no
 * opt-in list to keep in step, so a destination added to the menu — including
 * one a plugin contributes once plugin navigation lands — is browsable in the
 * palette by construction (D107). It previously carried a hand-listed allowlist
 * beside the derived tree, which had drifted exactly as you would expect:
 * customer returns was reachable by menu only.
 *
 * The gating is the shared `gateNav`, so the dispensary, vaccine-module and
 * central rules are applied once for both surfaces (AC-KB4).
 *
 * KB-R2's line about mode and module gates applies exactly here: they
 * "legitimately gate an action whose DESTINATION they gate — Prescriptions and
 * Patients need a dispensary store to go to". That is the opposite of gating a
 * generic action, which is the defect KB-R2 exists to forbid.
 */

/*
 * Every gated destination the palette lists, sections flattened into their
 * children.
 *
 * A SECTION WITH CHILDREN IS NOT ONE. Its landing page renders that section's
 * sub-menu, so "Go to: Inventory" would offer the user a menu from inside the
 * surface that exists to skip the menu. A section's children carry the reach;
 * a childless top-level entry (Dashboard, Reports, Settings, Help) is itself a
 * destination and is listed.
 */
const paletteDestinations = (): NavItem[] =>
  gateNav(navConfig).flatMap(item => item.children ?? [item]);

/**
 * The destination's palette row, complete with its "Go to:" prefix — the
 * override where the registry gives one, otherwise `cmdk.goto` interpolated
 * with the destination's own menu label.
 *
 * An ACCESSOR, not a resolved string: the registry outlives a language switch,
 * and the palette resolves names per open (see KeyAction.name), so this reads
 * the catalog at render time exactly as a bare locale key would.
 */
const paletteName = (destination: NavItem): (() => string) => {
  const override = destination.cmdkKey;
  return override === undefined
    ? () => t('cmdk.goto', { destination: t(destination.labelKey) })
    : () => t(override);
};

/*
 * The destinations that also carry a shortcut, per the binding table: `Alt+D` →
 * "Go to Dashboard" and `Alt+H` → Help. They belong HERE rather than among the
 * global commands, because both are DESTINATIONS in the navigation registry —
 * registering either in both places would put two rows in the palette, one with
 * the shortcut and one without.
 */
const DESTINATION_SHORTCUTS: Record<string, Shortcut> = {
  dashboard: ALT_D,
  help: ALT_H,
};

/**
 * Register one action per reachable destination, for as long as the caller's
 * owner lives.
 *
 * Called from KeyboardHost inside the store-scoped shell, so the gates read a
 * settled store context. It registers the set ONCE for the session rather than
 * tracking the gates: a store change re-enters through StoreGuardLayout, which
 * remounts the shell and so re-runs this with the new store's gates.
 */
export const createNavActions = (
  navigate: (path: string) => void
): KeyAction[] =>
  paletteDestinations().map(destination => {
    const shortcut = DESTINATION_SHORTCUTS[destination.path];
    return createAction({
      name: paletteName(destination),
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
