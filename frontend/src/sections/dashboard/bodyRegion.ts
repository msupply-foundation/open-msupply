import type { Component } from 'solid-js';
import { contributionId, visibleContributions } from '../../plugins/PluginSlot';
import type { RegionDiagnostic } from './regions';

/*
 * The dashboard's BODY region — the screen-level slot
 * (spec/dashboard/ui-surface.md § body-region semantics, OMS-REG-DB-02.12–.16).
 *
 * The three piece regions add to a container of host siblings, so their
 * semantics are a merge (`regions.ts`). This one is a swap: its occupant is the
 * dashboard body, not a piece within one. There is nothing to anchor to, no
 * published id inside it, and no `suppress` needed to clear what it replaces —
 * which leaves exactly one question, "which contribution renders", and that is
 * what this module answers.
 *
 * Pure over its candidate list, so the whole rule is unit-testable as data in
 * the node test env; the render integration (the fall back to the built-in
 * body, the error boundary around the occupant) is `DashboardBody.tsx`.
 */

/** The one contribution that renders as the body, as the host renders it. */
export interface BodyOccupant {
  /** The published id — plugin code + contribution id (the render key). */
  id: string;
  Component: Component;
}

export interface BodyRegion {
  /**
   * The occupant, or `undefined` for "nobody claimed it" — which is the
   * built-in dashboard, unchanged and reserving no space.
   */
  occupant: BodyOccupant | undefined;
  diagnostics: RegionDiagnostic[];
}

/**
 * Choose the body's single occupant from the contributions visible in this
 * store (OMS-REG-DB-02.15).
 *
 * `candidates` arrive in the registry's deterministic order — contribution
 * `order`, then plugin code, then contribution id — so the choice is the first
 * of them, and is identical on every reload and independent of which bundle
 * finished loading first. Every candidate passed over is NAMED in diagnostics:
 * two plugins both claiming the body is a deployment mistake, and it degrades
 * loudly rather than by one of them silently disappearing.
 */
export const selectBodyOccupant = (
  candidates: readonly BodyOccupant[]
): BodyRegion => {
  const [occupant, ...passedOver] = candidates;
  if (!occupant) return { occupant: undefined, diagnostics: [] };
  return {
    occupant,
    diagnostics: passedOver.map(candidate => ({
      contributionId: candidate.id,
      message: `passed over: the dashboard body holds one contribution, and "${occupant.id}" claimed it first`,
    })),
  };
};

/**
 * The body region as the page reads it: the visible `dashboard.body`
 * contributions, resolved to one occupant.
 *
 * Reads the registry and the slot context, so — like every other slot region —
 * the caller MUST call it inside its own single `createMemo`
 * (src/plugins/PluginSlot.tsx).
 *
 * A contribution the store's `when(ctx)` excludes is never a candidate, so that
 * store shows the built-in body and pays none of the contribution's data cost
 * (OMS-REG-DB-02.14). The gate reads session facts the store guard has already
 * resolved before this screen mounts, so the answer is known before the
 * dashboard first paints: a replaced body never appears after the built-ins
 * have shown.
 */
export const bodyRegion = (): BodyRegion =>
  selectBodyOccupant(
    visibleContributions('dashboard.body').map(contribution => ({
      id: contributionId(contribution),
      Component: contribution.Component,
    }))
  );
