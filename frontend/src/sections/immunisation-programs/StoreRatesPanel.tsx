import { createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { t } from '@/intl';
import { generateUUID } from '@/uuid';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { TextField } from '@/ui/elements/inputs/TextField';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { Table } from '@/ui/elements/table/Table';
import { Button } from '@/ui/elements/buttons/Button';
import { OkButton } from '@/ui/elements/buttons/StandardButtons';
import { storePageFetcher, type StoreOption } from '@/domain/store';
import { createPaginatedSearch } from '@/ui/utils/createPaginatedSearch';
import {
  MAX_WASTAGE_RATE,
  setStoreRate,
  storeRate,
  type RateField,
  type StoreConfigNode,
} from './courseEditor';

// S3a — the per-store rates panel (spec/immunisation-programs ui-surface
// S3a; rules § per-store rates): for any store on the SERVER, an overriding
// wastage and/or coverage rate for the course being edited. A second dialog
// layered over the editor. Its edits are local until OK hands them back into
// the course draft; Back discards them. Neither writes — the course's Save
// does.

export interface StoreRatesPanelProps {
  /** The course draft's overrides as the panel opens. */
  configs: StoreConfigNode[];
  /** Back — the panel's edits are discarded. */
  onBack: () => void;
  /** OK — the panel's edits go into the course draft (still unsaved). */
  onOk: (configs: StoreConfigNode[]) => void;
}

export const StoreRatesPanel: Component<StoreRatesPanelProps> = props => {
  // The panel's own copy, seeded once on mount (the owner mounts this only
  // while open): OK hands it back, Back drops it (OMS-REG-IMM-01.48,
  // OMS-REG-IMM-01.49).
  // eslint-disable-next-line solid/reactivity
  const initial = [...props.configs];
  const [configs, setConfigs] = createSignal<StoreConfigNode[]>(initial);
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
  ) => setConfigs(setStoreRate(configs(), storeId, field, value, generateUUID));

  return (
    <Dialog
      open
      testId="store-rates-panel"
      title={t('heading.configure-rates-per-store')}
      onClose={props.onBack}
      width="form"
      actions={
        <>
          {/* Back, not Cancel: it reverts the panel's edits and returns to the
              editor (S3a § footer actions). */}
          <Button
            variant="secondary"
            confirms="cancel"
            data-testid="dialog-button-back"
            onClick={props.onBack}
          >
            {t('button.back')}
          </Button>
          {/* OK is the confirm here because keeping panel edits is not a save
              (controls › footer button identity). */}
          <OkButton
            data-testid="dialog-button-ok"
            onClick={() => props.onOk(configs())}
          />
        </>
      }
    >
      <>
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
          >
            <thead>
              <tr>
                <th>{t('label.store')}</th>
                <th data-numeric>{t('label.wastage-rate')}</th>
                <th data-numeric>{t('label.coverage-rate')}</th>
              </tr>
            </thead>
            <tbody>
              <For each={stores.items()}>
                {store => (
                  <tr data-testid="store-rate-row">
                    <td>{store.storeName}</td>
                    <td data-numeric>
                      <NumberField
                        label={`${store.storeName} ${t('label.wastage-rate')}`}
                        hideLabel
                        size="small"
                        width="compact"
                        endAdornment="%"
                        min={0}
                        max={MAX_WASTAGE_RATE}
                        decimalLimit={1}
                        data-testid={`store-rate-wastage-${store.id}`}
                        value={storeRate(configs(), store.id, 'wastageRate')}
                        onChange={value =>
                          setRate(store.id, 'wastageRate', value)
                        }
                      />
                    </td>
                    <td data-numeric>
                      <NumberField
                        label={`${store.storeName} ${t('label.coverage-rate')}`}
                        hideLabel
                        size="small"
                        width="compact"
                        endAdornment="%"
                        min={0}
                        decimalLimit={1}
                        data-testid={`store-rate-coverage-${store.id}`}
                        value={storeRate(configs(), store.id, 'coverageRate')}
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
      </>
    </Dialog>
  );
};
