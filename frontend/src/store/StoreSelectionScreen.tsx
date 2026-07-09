import { createSignal, For } from 'solid-js';
import type { Component } from 'solid-js';
import type { StoreSummary } from './StoreGuardLayout';
import { t } from '../intl';
import styles from '../styles/shared.module.css';

const filterStores = (stores: StoreSummary[], searchTerm: string): StoreSummary[] => {
  const term = searchTerm.trim().toLowerCase();
  if (term === '') return stores;
  return stores.filter(
    s => s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term)
  );
};

// Spec (startup S3, [D8]): the store-selection screen — a routed page at
// /resolve-store, not an in-place modal. Reached by the guard pipeline whenever the
// URL does not resolve a store, and by the bottom-bar store selector to switch store
// (AC-SL8). Searchable; the caller has already ordered the previously logged-in and
// default stores to the top.
export const StoreSelectionScreen: Component<{
  stores: StoreSummary[];
  onSelect: (storeId: string) => void;
}> = props => {
  const [search, setSearch] = createSignal('');
  const visible = () => filterStores(props.stores, search());

  return (
    <div class={styles.page}>
      <div class={styles.card}>
        <h1 class={styles.modalTitle}>{t('store.select')}</h1>
        <input
          class={styles.input}
          placeholder={t('store.search')}
          value={search()}
          onInput={e => setSearch(e.currentTarget.value)}
        />
        <ul class={styles.list}>
          <For each={visible()}>
            {store => (
              <li>
                <button
                  class={styles.listButton}
                  type="button"
                  onClick={() => props.onSelect(store.id)}
                >
                  {store.name} ({store.code})
                </button>
              </li>
            )}
          </For>
        </ul>
      </div>
    </div>
  );
};
