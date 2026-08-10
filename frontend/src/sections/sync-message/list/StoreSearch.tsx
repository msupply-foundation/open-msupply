import type { JSX } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { AsyncCombobox } from '@/ui/elements/selectors/AsyncCombobox';
import type { Page } from '@/ui/utils/createPaginatedSearch';
import { SyncMessageStores } from './syncMessages.generated';
import { storeSearchFilter, type StoreOption } from './syncMessageCreate';

/*
 * The STORE LOOKUP role (spec/ui-standards/components.md § selects & lookups):
 * the SERVER's stores — not the session's accessible ones — each option
 * showing its code above its store name, ordered by name and searched on
 * code-or-name. Distinct from the shell's store SELECTOR (the active-store
 * affordance) and from the store-selection screen.
 *
 * The registry maps the role to `AsyncCombobox` "by configuration", so this is
 * a thin binding: it supplies the `stores` fetcher and the option row, and the
 * library component owns the combobox, the paging loop and the deferred first
 * fetch. It excludes nothing, so the active store is itself offerable
 * (OMS-REG-MNG-04.10/.14).
 */

const PAGE_SIZE = 30;

const fetchPage = async (
  search: string,
  offset: number
): Promise<Page<StoreOption> | undefined> => {
  const result = await graphqlFetch(SyncMessageStores, {
    filter: storeSearchFilter(search),
    // Sorted by name in the document itself — stable across pages, so
    // infinite scroll never reshuffles rows as new pages append.
    page: { first: PAGE_SIZE, offset },
  });
  if (result.kind !== 'success') return undefined;
  return {
    nodes: result.data.stores.nodes,
    totalCount: result.data.stores.totalCount,
  };
};

// One option row: the store's CODE above its NAME (ui-surface S2
// § destination). Two separately-marked nodes, following the code-or-name
// option convention the other pickers use (e2e/TESTIDS.md
// item-option-code / -name).
const renderRow = (store: StoreOption): JSX.Element => (
  <span style={{ display: 'flex', 'flex-direction': 'column' }}>
    <span
      data-testid="item-option-code"
      style={{ 'font-weight': 'var(--weight-bold)' }}
    >
      {store.code}
    </span>
    <span data-testid="item-option-name">{store.storeName}</span>
  </span>
);

export interface StoreSearchProps {
  label: string;
  /** The picked store, held as the whole node — an async picker has no local
   *  list to resolve a bare id against. */
  selected?: StoreOption;
  onSelect: (store: StoreOption | null) => void;
  disabled?: boolean;
  inputTestId?: string;
}

export const StoreSearch = (props: StoreSearchProps): JSX.Element => (
  <AsyncCombobox<StoreOption>
    label={props.label}
    disabled={props.disabled}
    inputTestId={props.inputTestId ?? 'store-search-input'}
    fetchPage={fetchPage}
    // The input shows the store's name; the dropdown row shows code + name.
    itemToString={store => store.storeName}
    itemToValue={store => store.id}
    renderItem={renderRow}
    selected={props.selected}
    onSelect={props.onSelect}
  />
);
