import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { t } from '@/intl';
import { generateUUID } from '@/uuid';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import { Stack } from '@/ui/layout/Stack/Stack';
import { TextField } from '@/ui/elements/inputs/TextField';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { Table } from '@/ui/elements/table/Table';
import { Button } from '@/ui/elements/buttons/Button';
import { OkButton } from '@/ui/elements/buttons/StandardButtons';
import {
  StoresForRates,
  type StoresForRatesResult,
} from './immunisationPrograms.generated';
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

type StoreRow = StoresForRatesResult['stores']['nodes'][number];

const loadStores = async () => {
  const result = await graphqlFetch(StoresForRates, {});
  if (result.kind !== 'success') return undefined;
  return result.data.stores;
};

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
  // while open): OK hands it back, Back drops it (OMS-REG-IMM-01.48, OMS-REG-IMM-01.49).
  // eslint-disable-next-line solid/reactivity
  const initial = [...props.configs];
  const [configs, setConfigs] = createSignal<StoreConfigNode[]>(initial);
  const [search, setSearch] = createSignal('');

  // Every store on the server, one generous page in name order (contract §
  // per-store rates). Read NON-SUSPENDING: this panel sits inside an open
  // dialog on an open screen.
  const [stores] = createResource(loadStores);
  const rows = (): StoreRow[] => gated(stores)?.nodes ?? [];

  // The search matches store code or name, case-insensitively, on the loaded
  // set.
  const shown = createMemo(() => {
    const needle = search().trim().toLocaleLowerCase();
    if (!needle) return rows();
    return rows().filter(
      store =>
        store.storeName.toLocaleLowerCase().includes(needle) ||
        store.code.toLocaleLowerCase().includes(needle)
    );
  });

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
      <Stack>
        <TextField
          label={t('placeholder.filter-by-store-name')}
          hideLabel
          placeholder={t('placeholder.filter-by-store-name')}
          width="full"
          data-testid="store-rates-search"
          value={search()}
          onInput={event => setSearch(event.currentTarget.value)}
        />
        <Show when={!stores.loading} fallback={<Spinner />}>
          <Table label={t('heading.configure-rates-per-store')}>
            <thead>
              <tr>
                <th>{t('label.store')}</th>
                <th data-numeric>{t('label.wastage-rate')}</th>
                <th data-numeric>{t('label.coverage-rate')}</th>
              </tr>
            </thead>
            <tbody>
              <For each={shown()}>
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
            </tbody>
          </Table>
        </Show>
      </Stack>
    </Dialog>
  );
};
