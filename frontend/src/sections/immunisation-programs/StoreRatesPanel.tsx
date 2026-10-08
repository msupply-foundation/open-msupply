import { createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { t } from '@/intl';
import { generateUUID } from '@/uuid';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { TextField } from '@/ui/elements/inputs/TextField';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { Table } from '@/ui/elements/table/Table';
import { Stack } from '@/ui/layout/Stack/Stack';
import { storePageFetcher, type StoreOption } from '@/domain/store';
import { createPaginatedSearch } from '@/ui/utils/createPaginatedSearch';
import {
  MAX_WASTAGE_RATE,
  setStoreRate,
  storeRate,
  type RateField,
  type StoreConfigNode,
} from './courseEditor';
import styles from './StoreRatesPanel.module.css';

// S3a — the per-store rates tab (spec/immunisation-programs ui-surface S3a;
// rules § per-store rates): for any store on the SERVER, an overriding
// wastage and/or coverage rate for the course being edited. The editor's
// second tab (#984). Its edits go straight into the course draft like every
// other field: the course's Save writes them, Cancel drops them with the rest.

export interface StoreRatesPanelProps {
  /** The course draft's overrides. */
  configs: readonly StoreConfigNode[];
  /** An edit — the whole override list, for the course draft. */
  onChange: (configs: StoreConfigNode[]) => void;
  /** A save is in flight: nothing may change under it. */
  disabled?: boolean;
}

export const StoreRatesPanel: Component<StoreRatesPanelProps> = props => {
  const [searchText, setSearchText] = createSignal('');

  // Every store on the SERVER (not the session's), through the shared store
  // lookup (domain/store): searched on code-or-name BY THE SERVER, debounced,
  // in name order, a page at a time as the list scrolls. A single big read
  // filtered in memory would put every store past its page beyond reach —
  // both invisible and unfindable (PR #749 review, F1) — which is exactly
  // what tables › pagination & scale forbids over an open-ended set.
  const stores = createPaginatedSearch<StoreOption>({
    fetchPage: storePageFetcher(),
  });

  // Nothing to show yet: the first page is still coming. Later searches keep
  // the rows they have until the new page lands, so the list never blanks
  // under the user's own typing.
  const firstLoad = () => stores.loading() && stores.items().length === 0;
  // A settled empty answer — not the gap between a keystroke and its fetch.
  const noMatches = () => !stores.pending() && stores.items().length === 0;

  const setRate = (
    storeId: string,
    field: RateField,
    value: number | undefined
  ) =>
    props.onChange(
      setStoreRate(props.configs, storeId, field, value, generateUUID)
    );

  return (
    // Fills the tab, so the table below takes the height that is left and
    // scrolls its rows inside it: the search stays put above them.
    <Stack class={styles.panel} data-testid="store-rates-panel">
      <TextField
        label={t('placeholder.filter-by-store-name')}
        hideLabel
        placeholder={t('placeholder.filter-by-store-name')}
        width="full"
        data-testid="store-rates-search"
        value={searchText()}
        onInput={event => {
          setSearchText(event.currentTarget.value);
          stores.setSearch(event.currentTarget.value);
        }}
      />
      <Show when={!firstLoad()} fallback={<Spinner />}>
        <Table
          label={t('heading.configure-rates-per-store')}
          fill
          onReachEnd={stores.loadMore}
          density="comfortable"
        >
          <thead>
            <tr>
              <th>{t('label.store')}</th>
              <th data-numeric data-control>
                {t('label.wastage-rate')}
              </th>
              <th data-numeric data-control>
                {t('label.coverage-rate')}
              </th>
            </tr>
          </thead>
          <tbody>
            <For each={stores.items()}>
              {store => (
                <tr data-testid="store-rate-row">
                  <td>{store.storeName}</td>
                  <td data-control>
                    <NumberField
                      label={`${store.storeName} ${t('label.wastage-rate')}`}
                      hideLabel
                      size="small"
                      endAdornment="%"
                      min={0}
                      max={MAX_WASTAGE_RATE}
                      decimalLimit={1}
                      data-testid={`store-rate-wastage-${store.id}`}
                      disabled={props.disabled}
                      value={storeRate(props.configs, store.id, 'wastageRate')}
                      onChange={value =>
                        setRate(store.id, 'wastageRate', value)
                      }
                    />
                  </td>
                  <td data-control>
                    <NumberField
                      label={`${store.storeName} ${t('label.coverage-rate')}`}
                      hideLabel
                      size="small"
                      endAdornment="%"
                      min={0}
                      decimalLimit={1}
                      data-testid={`store-rate-coverage-${store.id}`}
                      disabled={props.disabled}
                      value={storeRate(props.configs, store.id, 'coverageRate')}
                      onChange={value =>
                        setRate(store.id, 'coverageRate', value)
                      }
                    />
                  </td>
                </tr>
              )}
            </For>
            {/* A settled empty answer, and the next page on its way — both
                  as rows, so the table keeps its header and its height. */}
            <Show when={noMatches()}>
              <tr>
                <td colSpan={3} data-muted data-testid="store-rates-empty">
                  {t('store.no-results')}
                </td>
              </tr>
            </Show>
            <Show when={stores.loadingMore()}>
              <tr>
                <td colSpan={3}>
                  <Spinner sizeRem={1.1} />
                </td>
              </tr>
            </Show>
          </tbody>
        </Table>
      </Show>
    </Stack>
  );
};
