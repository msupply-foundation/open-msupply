import type { Component } from 'solid-js';
import type { StoreSummary } from './StoreGuardLayout';
import { StoreSelector } from '../ui/elements/selectors/StoreSelector';
import styles from '../ui/styles/shared.module.css';

// Spec (startup S3, [D14]): the store-selection screen — a routed page at
// /resolve-store, not an in-place modal. Reached by the guard pipeline
// whenever the URL does not resolve a store, and by the bottom-bar store
// selector to switch store (AC-SL8). The page frame is the "screen"; its
// content is the shared StoreSelector panel (search + list with Default /
// Last-used chips + Continue). The caller has already ordered the previously
// logged-in and default stores to the top and names them so the chips show.
export const StoreSelectionScreen: Component<{
  stores: StoreSummary[];
  defaultStoreId?: string;
  lastUsedStoreId?: string;
  onSelect: (storeId: string) => void;
}> = props => (
  <div class={styles.page}>
    <div class={styles.card}>
      <StoreSelector
        stores={props.stores}
        defaultStoreId={props.defaultStoreId}
        lastUsedStoreId={props.lastUsedStoreId}
        onConfirm={props.onSelect}
      />
    </div>
  </div>
);
