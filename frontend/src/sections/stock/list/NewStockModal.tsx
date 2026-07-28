import { createResource, createSignal, Show, type JSX } from 'solid-js';
import { createStore } from 'solid-js/store';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { CurrencyField } from '../../../ui/elements/inputs/CurrencyField';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { Checkbox } from '../../../ui/elements/inputs/Checkbox';
import { Combobox } from '../../../ui/elements/selectors/Combobox';
import { ContentContainer } from '../../../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { FormRow } from '../../../ui/layout/Form/FormRow';
import { XCircleIcon, CheckIcon } from '../../../ui/icons';
import { ItemSearch, type ItemOption } from '../../../domain/item';
import { LocationSelect } from '../../../domain/location';
import { NameSearch } from '../../../domain/name';
import { VvmStatusSelect } from '../../../domain/vvmStatus';
import { ReasonSelect, reasonsOfKind } from '../../../domain/reasonOptions';
import { CampaignOrProgramSelect } from '../../../domain/campaign';
import { stockPreferences } from '../../../store/storeContext';
import { runInsertStockLine } from '../stockApi';
import { localTodayIso } from '../../../ui/elements/inputs/dateTimeConvert';
import { fetchStockLocations, locationsForItem } from '../stockLocations';
import {
  NewStockItem,
  type NewStockItemResult,
  type InsertStockLineVariables,
} from './newStock.generated';

// The new-stock modal (spec/stock S3, FL5). Item-first: the rest of the form
// appears once an item is chosen (its defaults seed pack size + sell price; its
// variants are offered). Mechanically a finalised inventory addition
// (insertStockLine). Follows the shared dialog lifecycle (busy OK, close on
// success + navigate to the new line's S2, in-dialog error on failure — no
// toast). Field validations that the wire reports only as Internal errors
// (contract trap) are pre-validated here (pack size >= 1, pack count >= 0,
// future manufacture date, location-type restriction).

type ItemNode = Extract<
  NewStockItemResult['items'],
  { __typename: 'ItemConnector' }
>['nodes'][number];
type ItemVariant = ItemNode['variants'][number];
type Reason = { id: string; type: string; reason: string };

interface Draft {
  numberOfPacks?: number;
  packSize?: number;
  costPricePerPack?: number;
  sellPricePerPack?: number;
  batch: string;
  barcode: string;
  expiryDate: string | null;
  manufactureDate: string | null;
  onHold: boolean;
  location: { id: string; code: string; name: string } | null;
  volumePerPack?: number;
  manufacturer: { id: string; name: string } | null;
  itemVariantId: string | null;
  vvmStatus: { id: string; description: string; code: string } | null;
  donorId: string | null;
  donorName: string | null;
  reasonOption: Reason | null;
  // Campaign and program are one mutually-exclusive field (the campaign-or-
  // program lookup) — never both set at once.
  campaignId: string | null;
  programId: string | null;
}

const EMPTY_DRAFT: Draft = {
  batch: '',
  barcode: '',
  expiryDate: null,
  manufactureDate: null,
  onHold: false,
  location: null,
  manufacturer: null,
  itemVariantId: null,
  vvmStatus: null,
  donorId: null,
  donorName: null,
  reasonOption: null,
  campaignId: null,
  programId: null,
};

export interface NewStockModalProps {
  open: boolean;
  storeId: string;
  onClose: () => void;
  onCreated: (stockLineId: string) => void;
}

export const NewStockModal = (props: NewStockModalProps): JSX.Element => (
  // Keyed so each open starts from a fresh draft/content (no stale state).
  <Show when={props.open} keyed>
    <NewStockContent
      storeId={props.storeId}
      onClose={props.onClose}
      onCreated={props.onCreated}
    />
  </Show>
);

const NewStockContent = (props: {
  storeId: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}): JSX.Element => {
  const [item, setItem] = createSignal<ItemOption | undefined>();
  const [draft, setDraft] = createStore<Draft>({ ...EMPTY_DRAFT });
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>();

  const prefs = () => stockPreferences();
  const today = localTodayIso();

  // The chosen item's defaults + variants (spec S3: seed pack size + sell price;
  // offer variants). Keyed on the item id; undefined until an item is picked.
  const [itemDetail] = createResource(
    () => item()?.id,
    async itemId => {
      const result = await graphqlFetch(NewStockItem, {
        storeId: props.storeId,
        itemId: { equalTo: itemId },
      });
      if (result.kind !== 'success') return undefined;
      const node =
        result.data.items.__typename === 'ItemConnector'
          ? result.data.items.nodes[0]
          : undefined;
      // Seed pack size + sell price from the item's defaults — but only if this
      // is still the chosen item (guards a slow fetch for a previous item
      // resolving after the user has already switched: Solid discards the stale
      // RETURN, but the in-fetcher side-effect would otherwise still run) and
      // only when the user hasn't already typed a value.
      if (node && item()?.id === itemId) {
        setDraft(d => ({
          ...d,
          packSize: d.packSize ?? node.defaultPackSize,
          sellPricePerPack:
            d.sellPricePerPack ??
            node.itemStoreProperties?.defaultSellPricePerPack,
        }));
      }
      return node;
    }
  );

  // The store's locations, narrowed to the item's restricted location type.
  const [allLocations] = createResource(
    () => props.storeId,
    fetchStockLocations
  );
  // Read the item detail WITHOUT ever suspending. It first fetches on an
  // INTERACTION (picking an item) while this dialog is already open, and
  // `.latest` alone STILL suspends on that first pending read — which collapses
  // the ancestor <Suspense> and detaches the open <dialog>, losing the top
  // layer (no backdrop, modal re-rendered in normal flow). Gate on `.state`
  // (kdd/solid-reactivity-pitfalls › No remounts on interaction). The value
  // also lingers after the item is cleared, so every read stays gated on there
  // still being a chosen item — else a cleared search would keep the old item's
  // variants / location narrowing.
  const detail = () =>
    item() &&
    (itemDetail.state === 'ready' || itemDetail.state === 'refreshing')
      ? itemDetail.latest
      : undefined;

  const locations = () =>
    locationsForItem(
      allLocations.state === 'ready' || allLocations.state === 'refreshing'
        ? (allLocations.latest ?? [])
        : [],
      detail()?.restrictedLocationTypeId
    );

  const variants = (): ItemVariant[] => detail()?.variants ?? [];

  // Choosing a variant fills the variant id, manufacturer, and volume per pack
  // (from its packaging).
  const chooseVariant = (variant: ItemVariant | null) => {
    if (!variant) {
      setDraft('itemVariantId', null);
      return;
    }
    const packaging = variant.packagingVariants.find(
      p => p.volumePerUnit != null
    );
    setDraft(d => ({
      ...d,
      itemVariantId: variant.id,
      manufacturer: variant.manufacturer
        ? { id: variant.manufacturer.id, name: variant.manufacturer.name }
        : d.manufacturer,
      volumePerPack: packaging?.volumePerUnit ?? d.volumePerPack,
    }));
  };

  const positiveReasonsRequired = () => reasonsOfKind('positive').length > 0;

  const chosenItem = () => item();
  const packSizeValid = () => (draft.packSize ?? 0) >= 1;
  const packsValid = () =>
    draft.numberOfPacks != null && draft.numberOfPacks >= 0;

  // OK is available once item + pack size + pack quantity are set (spec AC-N5),
  // pack size >= 1 (pre-validation), and — when positive reasons are configured
  // — a reason is chosen.
  const canConfirm = () =>
    !!chosenItem() &&
    packSizeValid() &&
    packsValid() &&
    (!positiveReasonsRequired() || !!draft.reasonOption);

  const onOk = async () => {
    const it = chosenItem();
    if (!it || !canConfirm()) return;
    setSaving(true);
    setError(undefined);
    const input: InsertStockLineVariables['input'] = {
      id: crypto.randomUUID(),
      itemId: it.id,
      numberOfPacks: draft.numberOfPacks ?? 0,
      packSize: draft.packSize ?? 0,
      costPricePerPack: draft.costPricePerPack ?? 0,
      sellPricePerPack: draft.sellPricePerPack ?? 0,
      onHold: draft.onHold,
      batch: draft.batch || null,
      location: { value: draft.location?.id ?? null },
      expiryDate: draft.expiryDate || null,
      manufactureDate: draft.manufactureDate || null,
      reasonOptionId: draft.reasonOption?.id ?? null,
      barcode: draft.barcode || null,
      itemVariantId: draft.itemVariantId ?? null,
      vvmStatusId: draft.vvmStatus?.id ?? null,
      donorId: draft.donorId ?? null,
      volumePerPack: draft.volumePerPack ?? null,
      manufacturerId: draft.manufacturer?.id ?? null,
      campaignId: draft.campaignId,
      programId: draft.programId,
    };
    const outcome = await runInsertStockLine(props.storeId, input);
    setSaving(false);
    if (!outcome) return; // handled globally
    if (outcome.kind === 'error') {
      setError(outcome.message);
      return;
    }
    props.onCreated(outcome.data.id);
  };

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      testId="new-stock-modal"
      title={t('heading.stock-line-details')}
      actionsLead={
        <Show when={error()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            disabled={saving()}
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            icon={<CheckIcon />}
            loading={saving()}
            disabled={!canConfirm()}
            data-testid="dialog-button-ok"
            onClick={() => void onOk()}
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      <ContentContainer size="form">
        <Stack>
          {/* Item first — the rest of the form appears once an item is chosen. */}
          <Stack gap="sm">
            <ItemSearch
              label={t('label.item')}
              required
              storeId={props.storeId}
              value={item()?.id}
              selectedItem={item()}
              onSelect={picked => {
                // Picking (or clearing) an item resets the form, so the newly
                // chosen item's defaults (pack size, sell price) seed cleanly
                // rather than carrying over the previous item's typed values.
                setItem(picked ?? undefined);
                setDraft({ ...EMPTY_DRAFT });
              }}
              placeholder={t('placeholder.enter-an-item-code-or-name')}
            />
            <Show when={variants().length > 0}>
              <Combobox<ItemVariant>
                label={t('label.item-variant')}
                items={variants()}
                itemToString={v => v.name}
                itemToValue={v => v.id}
                value={draft.itemVariantId ?? undefined}
                placeholder={t('label.none')}
                onChange={chooseVariant}
              />
            </Show>
          </Stack>

          <Show when={chosenItem()}>
            {/* The sectioned edit form (spec/ui-standards detail-views): S2's
              sections adapted to this field set (spec/stock S3 Layout). */}
            <FormColumns>
              <FormColumn>
                <FormSection title={t('heading.stock-levels')}>
                  <FormRow>
                    {/* NumberField's default min is 0 (no negatives), so the pack
                      count can't go negative from the input (spec AC-N2). */}
                    <NumberField
                      label={t('label.pack-qty')}
                      required
                      width="full"
                      decimalLimit={2}
                      value={draft.numberOfPacks}
                      onChange={v => setDraft('numberOfPacks', v)}
                    />
                    <NumberField
                      label={t('label.pack-size')}
                      required
                      width="full"
                      min={1}
                      decimalLimit={2}
                      value={draft.packSize}
                      error={
                        draft.packSize != null && !packSizeValid()
                          ? t('error.pack-size-min')
                          : undefined
                      }
                      onChange={v => setDraft('packSize', v)}
                    />
                  </FormRow>
                </FormSection>

                <FormSection title={t('heading.batches-and-dates')}>
                  <TextField
                    label={t('label.batch')}
                    width="full"
                    value={draft.batch}
                    onInput={e => setDraft('batch', e.currentTarget.value)}
                  />
                  <TextField
                    label={t('label.barcode')}
                    width="full"
                    value={draft.barcode}
                    onInput={e => setDraft('barcode', e.currentTarget.value)}
                  />
                  <FormRow>
                    <DateField
                      label={t('label.expiry-date')}
                      width="full"
                      value={draft.expiryDate}
                      onChange={v => setDraft('expiryDate', v)}
                    />
                    <DateField
                      label={t('label.manufacture-date')}
                      width="full"
                      max={today}
                      value={draft.manufactureDate}
                      onChange={v => setDraft('manufactureDate', v)}
                    />
                  </FormRow>
                  {/* VVM status editable when the gate is on (spec AC-P1: the field
                    shows when manageVvmStatusForStock OR sortByVvmStatusThenExpiry). */}
                  <Show
                    when={
                      prefs().manageVvmStatusForStock ||
                      prefs().sortByVvmStatusThenExpiry
                    }
                  >
                    <VvmStatusSelect
                      label={t('label.vvm-status')}
                      value={draft.vvmStatus?.id}
                      placeholder={t('label.none')}
                      onChange={s =>
                        setDraft(
                          'vvmStatus',
                          s
                            ? {
                                id: s.id,
                                description: s.description,
                                code: s.code,
                              }
                            : null
                        )
                      }
                    />
                  </Show>
                </FormSection>

                <FormSection title={t('heading.pricing')}>
                  <FormRow>
                    <CurrencyField
                      label={t('label.cost-price')}
                      width="full"
                      value={draft.costPricePerPack}
                      onChange={v => setDraft('costPricePerPack', v)}
                    />
                    <CurrencyField
                      label={t('label.sell-price')}
                      width="full"
                      value={draft.sellPricePerPack}
                      onChange={v => setDraft('sellPricePerPack', v)}
                    />
                  </FormRow>
                  {/* Required iff active positive reasons are configured (spec
                    AC-N4) — the same condition that gates OK, marked on the
                    field so a disabled OK is explained rather than mysterious
                    (#601). */}
                  <ReasonSelect
                    kind="positive"
                    label={t('label.reason')}
                    required={positiveReasonsRequired()}
                    value={draft.reasonOption?.id}
                    placeholder={t('label.select-reason')}
                    onChange={r =>
                      setDraft(
                        'reasonOption',
                        r ? { id: r.id, type: r.type, reason: r.reason } : null
                      )
                    }
                  />
                </FormSection>
              </FormColumn>

              <FormColumn>
                <FormSection title={t('heading.storage-and-pack')}>
                  <LocationSelect
                    label={t('label.location')}
                    locations={locations()}
                    loading={allLocations.loading}
                    value={draft.location?.id}
                    placeholder={t('label.none')}
                    onChange={l =>
                      setDraft(
                        'location',
                        l ? { id: l.id, code: l.code, name: l.name } : null
                      )
                    }
                  />
                  <FormRow>
                    <Checkbox
                      label={t('label.on-hold')}
                      checked={draft.onHold}
                      onChange={v => setDraft('onHold', v)}
                    />
                    <NumberField
                      label={t('label.volume-per-pack')}
                      width="full"
                      decimalLimit={10}
                      value={draft.volumePerPack}
                      onChange={v => setDraft('volumePerPack', v)}
                    />
                  </FormRow>
                </FormSection>

                <FormSection title={t('heading.supply-chain')}>
                  <NameSearch
                    label={t('label.manufacturer')}
                    storeId={props.storeId}
                    role="manufacturer"
                    selected={
                      draft.manufacturer
                        ? {
                            id: draft.manufacturer.id,
                            name: draft.manufacturer.name,
                            code: '',
                            isSupplier: false,
                            isDonor: false,
                            isOnHold: false,
                            isStore: false,
                          }
                        : undefined
                    }
                    placeholder={t('label.none')}
                    onSelect={name => {
                      // Changing the manufacturer clears the item variant
                      // (spec/stock S2 manufacturer note).
                      setDraft(d => ({
                        ...d,
                        manufacturer: name
                          ? { id: name.id, name: name.name }
                          : null,
                        itemVariantId: null,
                      }));
                    }}
                  />
                  <FormRow>
                    {/* Donor field gated by allowTrackingOfStockByDonor (spec AC-P3). */}
                    <Show when={prefs().allowTrackingOfStockByDonor}>
                      <NameSearch
                        label={t('label.donor')}
                        storeId={props.storeId}
                        role="donor"
                        selected={
                          draft.donorId
                            ? {
                                id: draft.donorId,
                                name: draft.donorName ?? '',
                                code: '',
                                isSupplier: false,
                                isDonor: true,
                                isOnHold: false,
                                isStore: false,
                              }
                            : undefined
                        }
                        placeholder={t('label.none')}
                        onSelect={name => {
                          setDraft('donorId', name?.id ?? null);
                          setDraft('donorName', name?.name ?? null);
                        }}
                      />
                    </Show>
                    <CampaignOrProgramSelect
                      label={t('label.campaign')}
                      storeId={props.storeId}
                      itemId={chosenItem()?.id ?? ''}
                      campaignId={draft.campaignId ?? undefined}
                      programId={draft.programId ?? undefined}
                      placeholder={t('label.none')}
                      onChange={v => {
                        setDraft('campaignId', v?.campaign?.id ?? null);
                        setDraft('programId', v?.program?.id ?? null);
                      }}
                    />
                  </FormRow>
                </FormSection>
              </FormColumn>
            </FormColumns>
          </Show>
        </Stack>
      </ContentContainer>
    </Dialog>
  );
};
