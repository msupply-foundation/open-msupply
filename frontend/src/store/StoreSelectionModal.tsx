import { createSignal, For } from 'solid-js';
import type { Component } from 'solid-js';
import type { StoreSummary } from './StoreGuardLayout';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { TextField } from '../ui/elements/inputs/TextField';
import { t } from '../intl';
import styles from '../ui/styles/shared.module.css';

const filterStores = (
  stores: StoreSummary[],
  searchTerm: string
): StoreSummary[] => {
  const term = searchTerm.trim().toLowerCase();
  if (term === '') return stores;
  return stores.filter(
    s =>
      s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term)
  );
};

// Spec (Store Login, Guard 2): the selection modal, presented whenever the URL
// does not resolve to a store. Searchable; previously logged-in store and
// default store are already ordered to the top by the caller. Not dismissable —
// there is no store behind it to fall back to; picking one is the only way
// forward.
export const StoreSelectionModal: Component<{
  stores: StoreSummary[];
  onSelect: (storeId: string) => void;
}> = props => {
  const [search, setSearch] = createSignal('');
  const visible = () => filterStores(props.stores, search());

  return (
    <Dialog
      open
      dismissable={false}
      onClose={() => {}}
      title={t('store.select')}
    >
      <TextField
        label={t('store.search')}
        width="full"
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
    </Dialog>
  );
};
