/*
 * The backend bridge (spec/plugins/sdk-contract.md § data access): a frontend
 * plugin calling its own backend half with plugin-defined payloads. The host
 * transports them opaquely — `Input`/`Output` are the plugin's contract between
 * its two halves, declared in a module it shares with them, never imported
 * from host source.
 */
import { createMemo, createResource, type Accessor } from 'solid-js';
import { graphqlFetch, type GraphqlResult } from '../api/graphql';
import { currentStoreId } from '../store/storeContext';
import { PluginBridgeCall } from './pluginBridge.generated';

export interface PluginBridge<Input, Output> {
  /**
   * One call to the plugin's backend half. Never throws: the result is the
   * host's discriminated `GraphqlResult` (kdd/state-management), so infra and
   * permission failures are matched on, not caught.
   */
  call: (input: Input) => Promise<GraphqlResult<Output>>;
}

export const pluginBridge = <Input, Output>(
  code: string
): PluginBridge<Input, Output> => ({
  call: async input => {
    const storeId = currentStoreId();
    if (storeId === undefined) {
      // Every slot renders inside the entered store's screens, so this is a
      // programming error (a call from outside the store guard), not a
      // condition a contribution renders for.
      console.error(`pluginBridge(${code}): called with no store entered`);
      return { kind: 'unexpectedError' };
    }
    // `background`: a failing plugin backend degrades its own contribution
    // (spec/plugins/rules.md § error isolation) — it must not raise the
    // app-global unexpected-error surface.
    const result = await graphqlFetch(
      PluginBridgeCall,
      { storeId, pluginCode: code, input },
      { background: true }
    );
    if (result.kind !== 'success') {
      console.warn(`pluginBridge(${code}):`, result.kind);
    }
    if (result.kind !== 'success') return result;
    // `as Output` — the JSON scalar is opaque to the host by design; the plugin
    // owns both ends of it. Trusted-layer cast (kdd/type-safety).
    return { kind: 'success', data: result.data.pluginGraphqlQuery as Output };
  },
});

export interface PluginQuery<Output> {
  /**
   * The latest response, or undefined before the first one lands and while the
   * input is paused. Never suspends — safe to read on an already-open screen
   * (kdd/solid-reactivity-pitfalls § no remounts on interaction).
   */
  data: Accessor<Output | undefined>;
  /**
   * True while a call is in flight — for a spinner, not for gating the read.
   */
  loading: Accessor<boolean>;
}

/**
 * A reactive bridge call, re-fetched when its input changes (the shape almost
 * every contribution wants).
 *
 * The cache key is the SERIALISED input, not the accessor's object identity: a
 * plugin builds its input fresh on every read (`() => ({ lines: [...] })`), so
 * an identity-keyed resource would refetch on every unrelated re-render, and a
 * key like a record id would collide when the same record's payload changes.
 * `undefined` from the accessor pauses the resource — a contribution gated off,
 * or one whose record cannot be queried yet, costs no request.
 *
 * Must be called under an owner (a component body): it creates a memo and a
 * resource.
 */
export const usePluginQuery = <Input, Output>(
  code: string,
  input: () => Input | undefined
): PluginQuery<Output> => {
  const bridge = pluginBridge<Input, Output>(code);

  type Request = { key: string; input: Input };
  // Re-using the previous object when the serialised input is unchanged is what
  // makes the resource's default identity check behave as a value check.
  const request = createMemo<Request | undefined>(previous => {
    const value = input();
    if (value === undefined) return undefined;
    const key = JSON.stringify({ storeId: currentStoreId(), input: value });
    return previous?.key === key ? previous : { key, input: value };
  });

  const [resource] = createResource(request, async ({ input: value }) => {
    const result = await bridge.call(value);
    return result.kind === 'success' ? result.data : undefined;
  });

  return {
    // Gating on `.state` (never a bare `.latest`, which suspends on the first
    // pending read) is what keeps an open modal or focused field alive.
    data: () =>
      resource.state === 'ready' || resource.state === 'refreshing'
        ? resource.latest
        : undefined,
    loading: () => resource.loading,
  };
};
