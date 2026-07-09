import { createSignal, For } from 'solid-js';
import type { Component } from 'solid-js';
import type { StoreSummary } from './StoreGuardLayout';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';

const filterStores = (stores: StoreSummary[], searchTerm: string): StoreSummary[] => {
  const term = searchTerm.trim().toLowerCase();
  if (term === '') return stores;
  return stores.filter(
    s => s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term)
  );
};

// Spec (Store Login, Guard 2): the selection modal, presented whenever the URL does
// not resolve to a store. Searchable; previously logged-in store and default store
// are already ordered to the top by the caller.
export const StoreSelectionModal: Component<{
  stores: StoreSummary[];
  onSelect: (storeId: string) => void;
}> = props => {
  const [search, setSearch] = createSignal('');
  const visible = () => filterStores(props.stores, search());

  return (
    <div class={styles.overlay}>
      <div class={styles.modal}>
        <h2>{t('store.select')}</h2>
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
