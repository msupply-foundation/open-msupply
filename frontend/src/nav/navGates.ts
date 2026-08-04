import {
  hasPermission,
  hasVaccineModule,
  isDispensary,
} from '../store/storeContext';
import { isCentralServer } from '../api/serverInfo';

/*
 * Which destinations this store and user can reach. Extracted from ShellLayout
 * so the MENU and the COMMAND PALETTE gate identically — the palette lists
 * destinations by name (spec/keyboard KB-R1, ui-surface S1) and a destination
 * absent from the menu must be absent there too, or the two surfaces disagree
 * about where the user can go.
 *
 * These read runtime signals the static nav model cannot, so they live here
 * rather than in navConfig, which stays a plain declarative tree. Reactive:
 * call them inside a memo or a render.
 *
 * The three gates, and why each is legitimate (spec/keyboard KB-R2 — module and
 * mode may gate an action whose DESTINATION they gate, never a generic action):
 *
 *   dispensary  Prescriptions and Patients need a dispensary store to go to.
 *   vaccine     Cold chain needs the module to have anything behind it.
 *   central     Manage › Help documents exists only on a central server, to a
 *               server admin (spec/help S2).
 */

/** A server admin on a central server — the `central` flag's audience. */
export const centralAdmin = (): boolean =>
  isCentralServer() && hasPermission('SERVER_ADMIN');

/** Top-level nav section ids that a runtime gate can remove entirely. */
const GATED_SECTIONS: Record<string, () => boolean> = {
  dispensary: isDispensary,
  'cold-chain': hasVaccineModule,
};

/**
 * Whether a top-level section is reachable at all. A section with no entry in
 * `GATED_SECTIONS` is always reachable.
 */
export const sectionVisible = (id: string): boolean =>
  GATED_SECTIONS[id]?.() ?? true;

/** Whether a `central`-flagged destination is reachable. */
export const centralVisible = (item: { central?: boolean }): boolean =>
  item.central !== true || centralAdmin();

/**
 * Gate a nav tree: drop unreachable sections, drop `central` destinations
 * outside a central server, and drop `central` children from a section that
 * otherwise stays.
 *
 * Generic over the item shape so it serves both `navModel`'s presentation
 * `NavItem` (with icons, for the menu) and `navConfig`'s plain one (for the
 * palette) without either growing a dependency on the other.
 */
export const gateNav = <
  T extends { id: string; central?: boolean; children?: C[] },
  C extends { central?: boolean },
>(
  items: T[]
): T[] =>
  items
    .filter(item => sectionVisible(item.id))
    .filter(centralVisible)
    .map(item =>
      item.children?.some(child => child.central === true) && !centralAdmin()
        ? { ...item, children: item.children.filter(centralVisible) }
        : item
    );
