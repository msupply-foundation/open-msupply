import { createSignal } from 'solid-js';
import type {
  AnyContribution,
  DashboardPieceId,
  PluginModule,
  SlotId,
} from '../plugin-sdk/types';

/*
 * The loaded-plugin registry (spec/plugins/rules.md § contributions).
 *
 * ONE signal of loaded plugins is the whole state model — the codebase's
 * resource-signal style (kdd/state-management), not a cache keyed by anything.
 * Everything else here is a derived accessor over it, so a plugin that loads
 * late (or not at all) is just a value change every reader already tracks.
 *
 * The registry holds only what LOADED: a refused plugin never reaches it, so no
 * reader has to know about compatibility gates or validation.
 */

/**
 * A plugin that passed validation, paired with the code it was discovered as.
 */
export interface LoadedPlugin {
  code: string;
  module: PluginModule;
}

/**
 * A validated contribution narrowed to one slot (its props and placement
 * fields).
 */
export type SlotContribution<S extends SlotId> = Extract<
  AnyContribution,
  { slot: S }
>;

/**
 * A contribution as the host renders it: the plugin's own declaration plus the
 * code that supplied it. The code is what makes a contribution's identity
 * global — `${pluginCode}.${id}` is the published id two plugins can never
 * collide on.
 */
export type RegisteredContribution<S extends SlotId> = SlotContribution<S> & {
  pluginCode: string;
};

const [plugins, setPlugins] = createSignal<readonly LoadedPlugin[]>([]);

/** Every loaded plugin, in load-completion order. Reactive. */
export const loadedPlugins = plugins;

/**
 * Add a validated plugin to the registry. Called once per plugin by the loader;
 * a second registration of the same code replaces the first, so a dev-mode
 * hot reload cannot double-register.
 */
export const registerPlugin = (plugin: LoadedPlugin): void => {
  setPlugins(current => [
    ...current.filter(existing => existing.code !== plugin.code),
    plugin,
  ]);
};

/** Drop every registration. Tests and the dev loader only. */
export const clearPlugins = (): void => {
  setPlugins([]);
};

/**
 * The contributions for one slot, in final deterministic order — a plain
 * accessor, so callers compose it into their own single `createMemo` (the value
 * is a fresh array each read; reading it straight into a `<For>` would tear the
 * region down on every unrelated update — kdd/solid-reactivity-pitfalls).
 *
 * Order is `order` (unset last), then plugin code, then contribution id:
 * total, independent of which bundle happened to finish loading first, and
 * identical on every reload (rules § contributions). Where a host region
 * publishes anchors, the region's own merge re-places these against its
 * built-ins; this ordering is what breaks ties inside that.
 */
export const contributionsFor =
  <S extends SlotId>(slot: S) =>
  // Returning an accessor IS the contract here: the reactivity is the caller's
  // to track, inside its own memo.
  // eslint-disable-next-line solid/reactivity
  (): readonly RegisteredContribution<S>[] => {
    const found: RegisteredContribution<S>[] = [];
    for (const plugin of plugins()) {
      for (const contribution of plugin.module.contributions ?? []) {
        if (contribution.slot === slot) {
          found.push({
            ...(contribution as SlotContribution<S>),
            pluginCode: plugin.code,
          });
        }
      }
    }
    return found.sort(
      (a, b) =>
        (a.order ?? Number.POSITIVE_INFINITY) -
          (b.order ?? Number.POSITIVE_INFINITY) ||
        (a.pluginCode < b.pluginCode
          ? -1
          : a.pluginCode > b.pluginCode
            ? 1
            : 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    );
  };

/**
 * The built-in dashboard pieces the loaded plugins ask to hide, by published id
 * (spec/plugins/sdk-contract.md § the dashboard region slot). Suppression is
 * additive across plugins and applies to built-ins only — a plugin can never
 * suppress another plugin's contribution, so nothing here is matched against a
 * contribution id.
 */
export const suppressedPieces = (): ReadonlySet<DashboardPieceId> => {
  const suppressed = new Set<DashboardPieceId>();
  for (const plugin of plugins()) {
    for (const id of plugin.module.suppress ?? []) suppressed.add(id);
  }
  return suppressed;
};
