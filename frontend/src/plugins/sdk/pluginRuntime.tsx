/*
 * The per-contribution runtime: what a plugin's components can reach that is
 * scoped to the plugin ITSELF rather than to the slot.
 *
 * It travels as a Solid context, and that is the point: the plugin's `code` is
 * supplied by the host (the loader knows it — it is the code the bundle was
 * installed under), never passed in by the plugin. So "a plugin reads and
 * writes its own data" (spec/plugins/rules.md § plugin data) is structural — a
 * plugin has no way to name another plugin's code. The old client took a
 * `pluginCode: 'civ_plugins'` argument at every call site instead; a stale
 * literal there silently orphaned rows.
 *
 * A context crossing the host↔plugin module boundary works only because
 * `solid-js` is a genuine singleton — the whole reason this repo loads plugins
 * as native ESM against a host import map rather than through module federation
 * (kdd/plugin-loading § decision 1).
 */
import { createContext, useContext, type JSX } from 'solid-js';
import type { PluginDataStore } from '../pluginData';
import type { SlotContext } from './types';

export interface PluginRuntime {
  /** The plugin's own code — the identity its rows and namespace use. */
  code: string;
  /** This plugin's slice of the plugin-data store, code- and store-scoped. */
  data: PluginDataStore;
  /** The session facts, the same ones a `when` gate sees. */
  context: SlotContext;
}

const PluginRuntimeContext = createContext<PluginRuntime>();

export const PluginRuntimeProvider = (props: {
  runtime: PluginRuntime;
  children: JSX.Element;
}): JSX.Element => (
  // A context value is captured once, by design; the runtime object is cached
  // per plugin code and never replaced, so there is nothing to track.
  // eslint-disable-next-line solid/reactivity
  <PluginRuntimeContext.Provider value={props.runtime}>
    {props.children}
  </PluginRuntimeContext.Provider>
);

/*
 * Throwing (rather than returning undefined) is deliberate: a component
 * rendered outside a slot is a plugin-authoring mistake, and every contribution
 * renders inside an error boundary, so the throw degrades that one contribution
 * with a legible message instead of handing back a broken half-runtime.
 */
const runtime = (): PluginRuntime => {
  const value = useContext(PluginRuntimeContext);
  if (!value)
    throw new Error(
      'plugin-sdk: used outside a plugin slot — a plugin component may only render through a contribution'
    );
  return value;
};

/** This plugin's plugin-data store (its own rows, in the entered store). */
export const usePluginData = (): PluginDataStore => runtime().data;

/** The session facts: store id, permissions, store preferences. */
export const usePluginContext = (): SlotContext => runtime().context;

/** This plugin's code — for diagnostics and log lines. */
export const usePluginCode = (): string => runtime().code;
