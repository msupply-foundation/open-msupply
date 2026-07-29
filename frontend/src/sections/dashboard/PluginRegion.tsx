import { createEffect, createMemo, type JSX } from 'solid-js';
import { t } from '../../intl';
import type { SlotId } from '../../plugin-sdk/types';
import { recordPluginDiagnostic } from '../../plugins/diagnostics';
import { suppressedPieces } from '../../plugins/registry';
import { contributionId, visibleContributions } from '../../plugins/PluginSlot';
import { PluginRegionOutlet } from '../../ui/elements/plugins/PluginRegionOutlet';
import { dashboardGates } from './dashboardPreferences';
import {
  mergeRegion,
  type MergedEntry,
  type RegionContribution,
} from './regions';
import { panelBuiltIns, statBuiltIns, widgetBuiltIns } from './regionBuiltIns';

/*
 * The render integration of the dashboard's plugin-region semantics
 * (spec/dashboard/ui-surface.md § S3, closing the BUILD_REPORT deferral).
 *
 * The dashboard owns WHAT HAPPENS at its regions — `mergeRegion` (anchor →
 * order → id, missing-anchor fall-through, suppression of built-ins only) —
 * and the plugins vertical owns how contributions arrive. This component is
 * the seam: it reads the slot's visible contributions, hands them to
 * `mergeRegion` with the region's built-ins, and renders the plugin entries
 * through the outlet.
 *
 * Contributions render at the region's TAIL, in merged order. Interleaving
 * between built-ins stays deferred: the built-ins are explicit JSX (which is
 * what keeps the page remount-safe), so ordering AMONG contributions is what
 * the merge decides here, and the anchor still decides that — a contribution
 * anchored `before` an early built-in sorts ahead of one anchored at the end.
 *
 * Everything reactive goes through ONE memo, so a count update — or anything
 * else on the page — cannot tear down a live contribution's subtree
 * (kdd/solid-reactivity-pitfalls; the exact risk the dashboard's BUILD_REPORT
 * flagged when it deferred this).
 */

const builtInsFor = (slot: SlotId, container: string | undefined) => {
  const gates = dashboardGates();
  if (slot === 'dashboard.widget') return widgetBuiltIns();
  if (container === undefined) return [];
  return slot === 'dashboard.panel'
    ? panelBuiltIns(container, gates)
    : statBuiltIns(container, gates);
};

export const PluginRegion = (props: {
  slot: SlotId;
  /** The widget or panel whose region this is; omitted for the card grid. */
  container?: string;
}): JSX.Element => {
  const merged = createMemo(() => {
    const region: RegionContribution[] = visibleContributions(
      props.slot,
      props.container
    ).map(contribution => ({
      // The published id: plugin code + contribution id, never the bare id —
      // two plugins may both contribute a `greeting`.
      id: contributionId(contribution),
      order: contribution.order,
      anchor:
        contribution.anchor && !('end' in contribution.anchor)
          ? 'after' in contribution.anchor
            ? { position: 'after' as const, id: contribution.anchor.after }
            : { position: 'before' as const, id: contribution.anchor.before }
          : undefined,
      Component: contribution.Component,
    }));
    return mergeRegion(
      builtInsFor(props.slot, props.container),
      region,
      suppressedPieces()
    );
  });

  // Diagnostics out of the merge, not from inside it: recording is a write,
  // and a memo's body must stay a pure computation. Deduped per region instance
  // so a re-merge (a gate resolving, a plugin loading) cannot spam the same
  // broken anchor.
  const reported = new Set<string>();
  createEffect(() => {
    for (const diagnostic of merged().diagnostics) {
      const key = `${diagnostic.contributionId}:${diagnostic.message}`;
      if (reported.has(key)) continue;
      reported.add(key);
      recordPluginDiagnostic({
        level: 'warning',
        pluginCode: diagnostic.contributionId.split('.')[0],
        message: `${props.slot}: ${diagnostic.contributionId} — ${diagnostic.message}`,
      });
    }
  });

  const rendered = createMemo(() =>
    merged()
      .entries.filter(
        (entry): entry is Extract<MergedEntry, { kind: 'plugin' }> =>
          entry.kind === 'plugin'
      )
      .map(entry => ({ id: entry.id, Component: entry.Component }))
  );

  return (
    <PluginRegionOutlet
      contributions={rendered()}
      errorFallback={t('error.plugin-unavailable')}
    />
  );
};
