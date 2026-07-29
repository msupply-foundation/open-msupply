/*
 * The contribution registry (spec/plugins/rules.md § contributions). The
 * loader registers each plugin it successfully evaluated; host slot regions ask
 * for the contributions targeting them.
 *
 * Contributions arriving as DATA (a component + a slot id) is the one sanctioned
 * exception to explicit composition (kdd/explicit-composition, whose guardrail
 * otherwise resists exactly this shape). It is sanctioned because the
 * contributions come from out-of-tree bundles — there is no call site to click
 * through to, so the indirection IS the product feature rather than a way of
 * avoiding one. The precedent is recorded in
 * `src/ui/elements/plugins/PluginRegionOutlet.tsx`, which takes the same
 * exception for the dashboard's regions.
 *
 * The price is paid down the same way it is there: everything around it stays
 * direct — the loader calls `registerPlugin`, a slot calls `contributionsFor`,
 * both traceable by grep — and the ordering logic is pure and unit-tested.
 *
 * Registry state is a module-level signal (kdd/state-management): plugins load
 * once during startup, so a slot that mounts later reads a settled list, and a
 * slot already on screen when a plugin registers picks it up reactively.
 */
import { createSignal } from 'solid-js';
import type { SlotContribution, SlotId } from './sdk/types';

/** A plugin the loader accepted, with the code its rows and namespace use. */
export interface RegisteredPlugin {
  code: string;
  version: string;
  contributions: SlotContribution[];
}

/** The contributions that target one slot id, narrowed off the tagged union. */
export type ContributionOf<S extends SlotId> = Extract<
  SlotContribution,
  { slot: S }
>;

/**
 * One contribution ready for a slot region: the plugin's own contribution plus
 * the globally-unique render key the outlet needs. `key` is
 * `<pluginCode>.<contributionId>` — unique because a contribution id is unique
 * within its (plugin, slot) pair and a plugin code is unique per server.
 *
 * Narrowed by slot, so a slot region's outlet gets a `Component` typed to
 * exactly that slot's prop DTO and nothing else.
 */
export interface ResolvedContribution<S extends SlotId> {
  key: string;
  pluginCode: string;
  contribution: ContributionOf<S>;
}

const [registered, setRegistered] = createSignal<RegisteredPlugin[]>([]);

/** Every plugin currently registered — for diagnostics and the showcase. */
export const registeredPlugins = registered;

/**
 * Register a loaded plugin. Re-registering the same code REPLACES the previous
 * entry rather than duplicating it, so a dev-time hot reload of a plugin module
 * doesn't render its contributions twice.
 */
export const registerPlugin = (plugin: RegisteredPlugin): void => {
  setRegistered(previous => [
    ...previous.filter(entry => entry.code !== plugin.code),
    plugin,
  ]);
};

/** Drop everything — tests, and a store/session teardown. */
export const clearPlugins = (): void => {
  setRegistered([]);
};

/**
 * The contributions targeting `slot`, in final render order.
 *
 * Order is deterministic and independent of LOAD timing (the rule): `order`
 * ascending, then plugin code, then contribution id — all three from the
 * contribution's own data, never from the sequence plugins happened to arrive
 * in. Two plugins contributing to one slot therefore render the same way on
 * every reload.
 *
 * Visibility (`when`) is deliberately NOT applied here: filtering a reactive
 * gate at this level would rebuild the array and remount every sibling when one
 * contribution appears. The slot region gates each contribution individually
 * (see PluginSlot).
 */
export const contributionsFor = <S extends SlotId>(
  slot: S
): ResolvedContribution<S>[] =>
  registered()
    .flatMap(plugin =>
      plugin.contributions
        .filter(
          (contribution): contribution is ContributionOf<S> =>
            contribution.slot === slot
        )
        .map(contribution => ({
          key: `${plugin.code}.${contribution.id}`,
          pluginCode: plugin.code,
          contribution,
        }))
    )
    .sort(
      (a, b) =>
        (a.contribution.order ?? 0) - (b.contribution.order ?? 0) ||
        a.pluginCode.localeCompare(b.pluginCode) ||
        a.contribution.id.localeCompare(b.contribution.id)
    );
