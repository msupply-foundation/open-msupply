import { createMemo, type JSX } from 'solid-js';
import type { DashboardSlotId, SlotId } from '../plugin-sdk/types';
import { t } from '../intl';
import { PluginRegionOutlet } from '../ui/elements/plugins/PluginRegionOutlet';
import { contributionsFor, type RegisteredContribution } from './registry';
import { slotContext } from './slotContext';

/*
 * The host side of a slot (spec/plugins/rules.md § contributions).
 *
 * ONE `createMemo` is the load-bearing part. `contributionsFor` returns a
 * fresh array on every read, so feeding it straight to a `<For>` would tear
 * down and remount every live contribution on any unrelated update — losing
 * their signals and re-running their fetches (kdd/solid-reactivity-pitfalls).
 * The memo recomputes only when the registry or the slot context actually
 * changes, so the array identity — and therefore every mounted contribution —
 * is stable across everything else the screen does.
 */

/**
 * The visible contributions for a slot: registered, `when`-gated, in the
 * registry's deterministic order.
 *
 * Reads the registry and the slot context, so a caller MUST call it inside its
 * own single `createMemo` — that is what makes the returned array's identity
 * stable and keeps mounted contributions alive.
 *
 * `when` sees session facts only, so a hidden contribution costs nothing: it
 * never renders, and never gets the chance to fetch (AC-PLUG-K3).
 */
export const visibleContributions = <S extends SlotId>(
  slot: S,
  /** Optional narrowing to one container — a dashboard widget or panel id. */
  container?: string
): readonly RegisteredContribution<S>[] => {
  const ctx = slotContext();
  return contributionsFor(slot)().filter(contribution => {
    if (contribution.when && !contribution.when(ctx)) return false;
    if (container === undefined) return true;
    // A panel names the widget it joins and a stat names the panel; a
    // contribution naming neither belongs to no container's region.
    const declared =
      'panel' in contribution
        ? contribution.panel
        : 'widget' in contribution
          ? contribution.widget
          : undefined;
    return declared === container;
  });
};

/**
 * The published identity of a contribution — plugin code plus contribution id.
 * Global and collision-free, so it is safe as a render key, an anchor target,
 * and (where a host surface persists per-column state) a stored id.
 */
export const contributionId = (contribution: {
  pluginCode: string;
  id: string;
}): string => `${contribution.pluginCode}.${contribution.id}`;

/**
 * A slot region for surfaces with no placement semantics of their own:
 * contributions render in the registry's order, each in its own error boundary.
 *
 * Where a host region publishes anchor ids for its built-ins — the dashboard's
 * three regions — that region owns the merge instead and composes
 * `visibleContributions` itself.
 */
export const PluginSlot = (props: { slot: DashboardSlotId }): JSX.Element => {
  const rendered = createMemo(() =>
    visibleContributions(props.slot).map(contribution => ({
      id: contributionId(contribution),
      Component: contribution.Component,
    }))
  );
  return (
    <PluginRegionOutlet
      contributions={rendered()}
      errorFallback={t('error.plugin-unavailable')}
    />
  );
};
