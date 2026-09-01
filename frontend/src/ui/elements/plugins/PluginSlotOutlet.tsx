import {
  createComponent,
  ErrorBoundary,
  For,
  untrack,
  type Accessor,
  type Component,
} from 'solid-js';

/*
 * A plugin contribution as the props-carrying outlet receives it: already
 * `when`-filtered and ordered by the caller, and identified by its published id
 * (plugin code + contribution id) — the render key. Contributions arriving as
 * data is the sanctioned exception to explicit composition, same as the data
 * table's config-driven columns (ui-standards § Dashboard).
 */
export interface PluginSlotContribution<P extends Record<string, unknown>> {
  /** `${pluginCode}.${contributionId}` — globally unique, so a stable key. */
  id: string;
  /** The contribution's component; the outlet binds the slot's props to it. */
  Component: Component<P>;
}

export interface PluginSlotOutletProps<P extends Record<string, unknown>> {
  /** The region's contributions, in final render order (the caller's). */
  contributions: readonly PluginSlotContribution<P>[];
  /**
   * The slot's props, as an ACCESSOR. The outlet binds each of its keys to a
   * getter over this accessor, so the contribution reads every prop fresh at
   * its own render — which is what lets a new DTO reach a LIVE contribution.
   */
  slotProps: Accessor<P>;
  /** Shown in place of a contribution that threw, already translated. */
  errorFallback: string;
}

/**
 * The slot props as a stable object of per-key getters.
 *
 * The key set is resolved ONCE, untracked (a slot's prop DTO has a fixed
 * shape); each value is read through the accessor at access time. Both halves
 * matter:
 *
 * - reading a value lazily is what makes a prop change reach the contribution's
 *   own tracking scope instead of the outlet's;
 * - resolving the KEYS untracked is what stops that same change from
 *   invalidating whatever computation the props were built in — the trap that
 *   makes `<Dynamic {...mergeProps(() => slotProps())} />` remount: a function
 *   source has to be called to be enumerated, and `Dynamic`'s `splitProps`
 *   enumerates inside a tracked memo, so every prop change tears the
 *   contribution down and builds a new one (proven by this file's test).
 */
const bindSlotProps = <P extends Record<string, unknown>>(
  read: Accessor<P>
): P => {
  const bound = {} as Record<string, unknown>;
  for (const key of untrack(() => Object.keys(read()))) {
    Object.defineProperty(bound, key, {
      get: () => read()[key],
      enumerable: true,
    });
  }
  return bound as P;
};

/*
 * The mount point for plugin contributions that receive PROPS (the
 * internal-order line editor's info panel; spec/plugins/ui-surface § S1). The
 * props-less sibling is PluginRegionOutlet — the dashboard's regions.
 *
 * Three things it guarantees, in order of consequence:
 *
 * 1. NO REMOUNT ON A PROP CHANGE. Contributions are constructed once, with
 *    getter-bound props (above), so stepping through lines with Save & next
 *    updates the panel IN PLACE — keeping its signals, its resources, and
 *    (critically) the open <dialog> around it (AC-PLUG-N2,
 *    kdd/solid-reactivity-pitfalls § no remounts on interaction). The `<For>`
 *    is reference-keyed on the contribution objects, which is why the caller
 *    must hand over a memoised array.
 * 2. NO SEAM. No wrapper element, no heading, no border: each contribution
 *    becomes a direct child of the surrounding region and adopts its geometry,
 *    so an empty contribution set renders nothing and reserves no space
 *    (AC-PLUG-N1).
 * 3. ISOLATION. Each contribution is constructed INSIDE its own error boundary,
 *    so one that throws — while rendering or on any later update — is replaced
 *    by a neutral line of text in its own place only, and every sibling keeps
 *    working (AC-PLUG-E1). The fallback is bare text rather than an element for
 *    the same reason there is no wrapper: the region imposes no box of its own
 *    (a contributed table cell fails the same way — see the line table's
 *    `mergeLineColumns`).
 */
export const PluginSlotOutlet = <P extends Record<string, unknown>>(
  props: PluginSlotOutletProps<P>
) => (
  <For each={props.contributions}>
    {contribution => (
      <ErrorBoundary
        fallback={error => {
          console.error(
            `[plugins] ${contribution.id}: contribution failed to render`,
            error
          );
          return props.errorFallback;
        }}
      >
        {/* `() => props.slotProps()` rather than the accessor itself, so each
            bound getter re-reads the PROP — a caller that hands over a fresh
            closure per render is still read through its latest one. */}
        {createComponent(
          contribution.Component,
          bindSlotProps(() => props.slotProps())
        )}
      </ErrorBoundary>
    )}
  </For>
);
