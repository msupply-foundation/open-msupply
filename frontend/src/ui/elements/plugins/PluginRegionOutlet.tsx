import { ErrorBoundary, For, type Component } from 'solid-js';
import styles from './PluginRegionOutlet.module.css';

/*
 * A plugin contribution as the outlet receives it: already merged into its
 * region and bound to its slot props by the dashboard's `mergeRegion` — the
 * outlet never sees anchors, `order`, or suppression. Contributions arriving
 * as data (component + region) is the sanctioned exception to explicit
 * composition, same as the data table's config-driven columns (ui-standards §
 * Dashboard).
 */
export interface PluginRegionContribution {
  /**
   * Unique within the region (plugin code + contribution id) — the render key.
   */
  id: string;
  /** The contribution's component, already bound to its slot props. */
  Component: Component;
}

export interface PluginRegionOutletProps {
  /**
   * The region's contributions, in final render order (ordering is the
   * caller's).
   */
  contributions: PluginRegionContribution[];
  /**
   * Fallback text shown in a contribution's own slot when it throws, already
   * translated.
   */
  errorFallback: string;
}

/*
 * The mount point where plugin contributions render inside a dashboard
 * container — the last child of each card grid, widget panel column, and
 * panel stat list (dashboard ui-surface § slot regions). It renders exactly
 * what it is given, in the order it is given: merging and sorting live in the
 * dashboard's `mergeRegion`, not here. No wrapper element — each contribution
 * becomes a direct child of the surrounding container, adopting its geometry —
 * so an empty region renders nothing and reserves no space. Each contribution
 * sits in its own error boundary: one throwing contribution shows a neutral
 * muted text line in its own slot only, and every sibling keeps working
 * (dashboard AC-D6, plugins rules § error isolation).
 */
export const PluginRegionOutlet = (props: PluginRegionOutletProps) => (
  <For each={props.contributions}>
    {contribution => (
      <ErrorBoundary
        fallback={err => {
          console.error(
            `Dashboard plugin contribution "${contribution.id}" failed to render`,
            err
          );
          return <p class={styles.fallback}>{props.errorFallback}</p>;
        }}
      >
        <contribution.Component />
      </ErrorBoundary>
    )}
  </For>
);
