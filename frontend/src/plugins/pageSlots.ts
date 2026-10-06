/*
 * A plugin page's contribution SLOTS — the host side of the SDK's
 * `usePageTrail`, `usePageActions` and `usePageFooter` (sdk-contract § the page
 * contribution › rendering). The host owns the page frame; a page hands the
 * frame the pieces that belong to the frame's own regions — the trail below its
 * crumb, the header's action cluster, the bar pinned below the scrolling body —
 * and the frame renders each where the host's own pages put it.
 *
 * One signal each: one plugin page is on screen at a time.
 */
import {
  createRenderEffect,
  createSignal,
  onCleanup,
  type Accessor,
  type JSX,
} from 'solid-js';

export interface PageSlot<T> {
  /** What the frame renders. */
  value: Accessor<T>;
  /**
   * The SDK hook's whole body: publish what `next` yields, tracked, and give
   * the slot up when the calling page is disposed. Must be called under an
   * owner (a component body).
   */
  use: (next: () => T) => void;
}

/**
 * One frame region a plugin page may fill. `empty` is what the frame shows with
 * no page claiming it — the region absent, not a blank one.
 */
export const createPageSlot = <T>(empty: T): PageSlot<T> => {
  const [value, setValue] = createSignal<T>(empty);
  // Wrapped, because a slot's value may itself BE a render function: the
  // setter would call it rather than store it.
  const publish = (next: T) => setValue(() => next);

  return {
    value,
    use: next => {
      let claimed = empty;
      // A RENDER effect: the frame has the contribution in the pass that
      // mounts the page, the way setting it at call time used to, and the page
      // may still swap it reactively as the spec has it.
      createRenderEffect(() => publish((claimed = next())));
      onCleanup(() => {
        // Only while this page's contribution is still the one on screen: a
        // route transition may mount the next page before disposing this one,
        // and clearing then would blank the new page's region.
        if (value() === claimed) publish(empty);
      });
    },
  };
};

export interface PageTrailCrumb {
  /** Already translated. */
  label: string;
  /** A store-relative path for an ancestor crumb; the last crumb needs none. */
  path?: string;
}

/**
 * The breadcrumb trail below the page's own crumb: a page that interprets paths
 * below its own (a record screen under a list) names the record here, and the
 * frame renders the page's crumb as the parent link and these after it.
 */
export const pageTrail = createPageSlot<readonly PageTrailCrumb[]>([]);

/**
 * The header's action cluster, rendered top-end where every host page's actions
 * sit.
 */
export const pageActions = createPageSlot<(() => JSX.Element) | undefined>(
  undefined
);

/**
 * The action bar pinned below the scrolling body, where every host detail
 * screen's actions sit — so a page never fakes a footer with sticky
 * positioning inside its own body, which stops pinning once the body fits.
 */
export const pageFooter = createPageSlot<(() => JSX.Element) | undefined>(
  undefined
);
