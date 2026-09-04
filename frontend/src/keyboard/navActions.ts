import { createAction, type KeyAction } from '../ui/utils/keyActions';
import { navConfig, type NavItem } from '../nav/navConfig';
import { gateNav } from '../nav/navGates';
import {
  pluginOfferedPaths,
  pluginPaletteDestinations,
} from '../plugins/pluginPages';
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
 * The gating is the shared `gateNav`, so the dispensary, vaccine-module,
 * central, and query-permission rules are applied once for both surfaces
 * (AC-KB4; spec/navigation § permission gates, D94).
 *
 * KB-R2's line about mode and module gates applies exactly here: they
 * "legitimately gate an action whose DESTINATION they gate — Prescriptions and
 * Patients need a dispensary store to go to". That is the opposite of gating a
 * generic action, which is the defect KB-R2 exists to forbid.
 */

// The pick of NavItem a palette row actually consumes — plugin destinations
// supply exactly this shape, so one row builder serves both registries.
type PaletteDestination = Pick<NavItem, 'path' | 'labelKey' | 'cmdkKey'>;

/*
 * Every destination the registry holds — host sections flattened into their
 * children, plus every page a loaded plugin contributes (D107: the set is
 * settled before the shell mounts, behind the boot gate) — UNGATED here; the
 * gates are each row's `disabled` (below).
 *
 * A SECTION WITH CHILDREN IS NOT ONE. Its landing page renders that section's
 * sub-menu, so "Go to: Inventory" would offer the user a menu from inside the
 * surface that exists to skip the menu. A section's children carry the reach;
 * a childless top-level entry (Home, Reports, Settings, Help) is itself a
 * destination and is listed. The same rule gives a plugin SECTION no row —
 * its pages carry the reach (pluginPaletteDestinations).
 */
const paletteDestinations = (): PaletteDestination[] => [
  ...navConfig.flatMap(item => item.children ?? [item]),
  ...pluginPaletteDestinations(),
];

/**
 * The leaf paths the gates offer RIGHT NOW — the menu's set, recomputed per
 * read so the palette and the menu agree at the moment of asking, not the
 * moment of registration.
 */
const offeredPaths = (): ReadonlySet<string> =>
  new Set([
    ...gateNav(navConfig).flatMap(item =>
      (item.children ?? [item]).map(destination => destination.path)
    ),
    // Plugin pages, through their own two gates — the same menu set, so the
    // palette and the menu agree about contributed destinations too
    // (spec/navigation § plugin destinations; AC-KB4).
    ...pluginOfferedPaths(),
  ]);

/**
 * The destination's palette row, complete with its "Go to:" prefix — the
 * override where the registry gives one, otherwise `cmdk.goto` interpolated
 * with the destination's own menu label.
 *
 * An ACCESSOR, not a resolved string: the registry outlives a language switch,
 * and the palette resolves names per open (see KeyAction.name), so this reads
 * the catalog at render time exactly as a bare locale key would.
 */
const paletteName = (destination: PaletteDestination): (() => string) => {
  const override = destination.cmdkKey;
  return override === undefined
    ? () => t('cmdk.goto', { destination: t(destination.labelKey) })
    : () => t(override);
};

/*
 * The destinations that also carry a shortcut, per the binding table: `Alt+D` →
 * "Go to Home" and `Alt+H` → Help. They belong HERE rather than among the
 * global commands, because both are DESTINATIONS in the navigation registry —
 * registering either in both places would put two rows in the palette, one with
 * the shortcut and one without.
 */
const DESTINATION_SHORTCUTS: Record<string, Shortcut> = {
  // Keyed by the destination's PATH; Home's is the store root, so ''.
  '': ALT_D,
  help: ALT_H,
};

/**
 * Register one action per registry destination, for as long as the caller's
 * owner lives.
 *
 * Called from KeyboardHost inside the store-scoped shell, so the gates read a
 * settled store context. The SET is registered once per shell mount — a store
 * change re-enters through StoreGuardLayout, which remounts the shell and so
 * re-runs this with the registry the new store puts in force. The GATES are
 * not baked into that set: each row's `disabled` re-reads them, and the
 * palette evaluates it per open (the dispatcher per keypress) — so a
 * permission withdrawn mid-session, e.g. by the post-sync context refresh, is
 * gone from the palette at its next open, exactly as the menu's reactive memo
 * drops the entry (AC-KB4; OMS-REG-NAV-01.15). Gating at registration time
 * was the defect: the row outlived the permission.
 */
export const createNavActions = (
  navigate: (path: string) => void
): KeyAction[] =>
  // ONE map over the merged destination list: a plugin page's row is built by
  // exactly the code a host row is, so a palette-row feature (a shortcut, a
  // cmdk override) can never land on one half of the registry only.
  // DESTINATION_SHORTCUTS and cmdkKey simply never match a plugin row.
  paletteDestinations().map(destination => {
    const shortcut = DESTINATION_SHORTCUTS[destination.path];
    return createAction({
      name: paletteName(destination),
      ...(shortcut ? { shortcut } : {}),
      disabled: () => !offeredPaths().has(destination.path),
      run: () => navigate(destination.path),
    });
  });
