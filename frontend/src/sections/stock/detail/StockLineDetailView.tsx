import {
  createResource,
  createSignal,
  createMemo,
  createEffect,
  on,
  Show,
  Suspense,
  type Component,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { formatNumber } from '../../../intl/formatNumber';
import { Page } from '../../../ui/layout/Page/Page';
import { Header } from '../../../ui/layout/Header/Header';
import { Breadcrumb } from '../../../ui/layout/Header/Breadcrumb';
import { HeaderButtons } from '../../../ui/layout/Header/HeaderButtons';
import { ContentFooter } from '../../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../../ui/layout/ContentFooter/ContentFooterActions';
import { ContentContainer } from '../../../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { FormColumns } from '../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../ui/layout/Form/FormColumn';
import { FormSection } from '../../../ui/layout/Form/FormSection';
import { FormRow } from '../../../ui/layout/Form/FormRow';
import {
  Tabs,
  TabList,
  TabPanel,
  type TabDef,
} from '../../../ui/elements/tabs/Tabs';
import { Button } from '../../../ui/elements/buttons/Button';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { CurrencyField } from '../../../ui/elements/inputs/CurrencyField';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { Checkbox } from '../../../ui/elements/inputs/Checkbox';
import { IdentityHeader } from '../../../ui/layout/IdentityHeader/IdentityHeader';
import { LabelledValue } from '../../../ui/elements/typography/LabelledValue';
import { StockIcon, BarIcon, SaveIcon, XCircleIcon } from '../../../ui/icons';
import { LocationVolumeSelect } from '../../../domain/location';
import { NameSearch } from '../../../domain/name';
import { CampaignOrProgramSelect } from '../../../domain/campaign';
import { ActivityLogPanel } from '../../../domain/activityLog';
import { stockPreferences, hasPermission } from '../../../store/storeContext';
import { runUpdateStockLine } from '../stockApi';
import { totalVolume } from '../stockCalc';
import { localTodayIso } from '../../../ui/elements/inputs/dateTimeConvert';
import { fetchStockLocations, locationsForItem } from '../stockLocations';
import { EmptyState } from '../../../ui/elements/feedback/EmptyState';
import {
  StockLineById,
  type StockLineDetailFragment,
  type StockLineByIdResult,
  type StockLineVvmLogFragment,
  type UpdateStockLineVariables,
} from './stockLine.generated';
import { LedgerPanel } from './LedgerPanel';
import { VvmHistoryPanel } from './VvmHistoryPanel';
import { AdjustModal } from './AdjustModal';
import { RepackModal } from './RepackModal';
import { VvmStatusEntryModal } from './VvmStatusEntryModal';

// The stock-line detail view (spec/stock S2). Inspect one line, edit its
// attributes (buffered locally, committed on an explicit Save with a pre-save
// confirmation; leaving while dirty prompts to discard), and launch the
// quantity-changing flows (adjust S4, repack S5). Quantities + pack size are
// read-only everywhere here (spec/stock rules). Tabs: Details · VVM history
// (vaccine + preference) · Log (shared activity-log surface) · Ledger.
//
// The "Item linked to its catalogue record" identity link is rendered as plain
// text: the item-catalogue detail route is owned elsewhere and not wired here.

// The fetched detail node — the StockLineDetail fragment plus its VVM history
// (the byId query selects vvmStatusLogs). A superset of
// StockLineDetailFragment, so it passes straight to the adjust/repack/VVM
// modals that take the fragment.
type Line = StockLineByIdResult['stockLines']['nodes'][number];

// The locally-buffered editable attributes. Read-only quantities are read from
// the fetched line directly, never buffered.
interface Edit {
  costPricePerPack: number;
  sellPricePerPack: number;
  batch: string;
  barcode: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  onHold: boolean;
  location: { id: string; code: string; name: string } | null;
  volumePerPack: number;
  manufacturer: { id: string; name: string } | null;
  donorId: string | null;
  donorName: string | null;
  // Campaign and program are one mutually-exclusive field (the campaign-or-
  // program lookup) — never both set at once.
  campaignId: string | null;
  programId: string | null;
}

const seedEdit = (line: StockLineDetailFragment): Edit => ({
  costPricePerPack: line.costPricePerPack,
  sellPricePerPack: line.sellPricePerPack,
  batch: line.batch ?? '',
  barcode: line.barcode ?? '',
  manufactureDate: line.manufactureDate ?? null,
  expiryDate: line.expiryDate ?? null,
  onHold: line.onHold,
  location: line.location
    ? {
        id: line.location.id,
        code: line.location.code,
        name: line.location.name,
      }
    : null,
  volumePerPack: line.volumePerPack,
  manufacturer: line.manufacturer
    ? { id: line.manufacturer.id, name: line.manufacturer.name }
    : null,
  donorId: line.donor?.id ?? null,
  donorName: line.donor?.name ?? null,
  campaignId: line.campaign?.id ?? null,
  programId: line.program?.id ?? null,
});

const StockLineDetailView: Component = () => {
  const params = useParams<{ storeId: string; stockLineId: string }>();
  const navigate = useNavigate();
  const prefs = () => stockPreferences();

  const [activeTab, setActiveTab] = createSignal('details');
  const [edit, setEdit] = createStore<Edit>({
    costPricePerPack: 0,
    sellPricePerPack: 0,
    batch: '',
    barcode: '',
    manufactureDate: null,
    expiryDate: null,
    onHold: false,
    location: null,
    volumePerPack: 0,
    manufacturer: null,
    donorId: null,
    donorName: null,
    campaignId: null,
    programId: null,
  });
  const [seededId, setSeededId] = createSignal<string>();
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | undefined>();
  const [confirmSaveOpen, setConfirmSaveOpen] = createSignal(false);
  const [discardOpen, setDiscardOpen] = createSignal(false);
  const [adjustOpen, setAdjustOpen] = createSignal(false);
  const [repackOpen, setRepackOpen] = createSignal(false);
  const [vvmEntry, setVvmEntry] = createSignal<
    { entry?: StockLineVvmLogFragment } | undefined
  >();

  // Fetch the line (there is no single-record query — filter stockLines by id).
  // A stocktake-LEVEL save writes back via mutate (no refetch); adjust/repack
  // refetch to refresh quantities without touching the editable draft.
  const [data, { mutate, refetch }] = createResource(
    () => ({ storeId: params.storeId, stockLineId: params.stockLineId }),
    async v => {
      const result = await graphqlFetch(StockLineById, {
        storeId: v.storeId,
        id: { equalTo: v.stockLineId },
      });
      if (result.kind !== 'success') return undefined;
      const node = result.data.stockLines.nodes[0];
      return node;
    }
  );
  const line = (): Line | undefined => data.latest;

  // Seed the editable draft from a line: sets the draft and records the seeded
  // id. Called on load / line-id change (the effect below) and after a save
  // (re-seed to clear the dirty state) — a refetch on the same id never
  // re-seeds, so an in-progress edit isn't clobbered by an adjust/repack
  // refresh.
  const seedFor = (node: StockLineDetailFragment) => {
    setEdit(seedEdit(node));
    setSeededId(node.id);
  };
  createEffect(
    on(line, node => {
      if (node && node.id !== seededId()) seedFor(node);
    })
  );

  const [allLocations, { refetch: refetchLocations }] = createResource(
    () => params.storeId,
    fetchStockLocations
  );
  // Non-suspending read: the line and the locations resolve independently, so
  // once the line has arrived a still-pending `.latest` read here would suspend
  // this view's boundary and tear the rendered form down again — and the same
  // read runs after an adjust/repack refetch, with a modal potentially open
  // (kdd/solid-reactivity-pitfalls › No remounts on interaction). `loading`
  // below still gives LocationVolumeSelect its spinner.
  const locations = () =>
    locationsForItem(
      allLocations.state === 'ready' || allLocations.state === 'refreshing'
        ? (allLocations.latest ?? [])
        : [],
      line()?.item.restrictedLocationTypeId
    );

  // Read-only computed quantities (units = packs × pack size).
  const availUnits = () => {
    const l = line();
    return l ? l.availableNumberOfPacks * l.packSize : 0;
  };
  const sohUnits = () => {
    const l = line();
    return l ? l.totalNumberOfPacks * l.packSize : 0;
  };

  // Dose context for vaccine items when manageVaccinesInDoses is on (spec
  // AC-P2) — the read-only quantity fields (pack qty, available packs, SOH,
  // available stock) append the dose equivalent (units × the item's
  // doses-per-unit) as a muted note beside the value.
  const showDoses = () =>
    prefs().manageVaccinesInDoses && !!line()?.item.isVaccine;
  // The value node for a read-only quantity field: the number, plus the dose
  // equivalent in muted small text when the dose gate is on for a vaccine item.
  const qtyValue = (main: number, doseUnits: number) => (
    <>
      {formatNumber(main)}
      <Show when={showDoses()}>
        {' '}
        <span
          style={{
            color: 'var(--text-secondary)',
            'font-size': 'var(--text-xs)',
          }}
        >
          ({formatNumber(doseUnits * (line()?.item.doses ?? 0))}{' '}
          {t('label.doses')})
        </span>
      </Show>
    </>
  );

  // Dirty when any editable field differs from the fetched line.
  const isDirty = createMemo(() => {
    const l = line();
    if (!l || seededId() === undefined) return false;
    return (
      edit.costPricePerPack !== l.costPricePerPack ||
      edit.sellPricePerPack !== l.sellPricePerPack ||
      edit.batch !== (l.batch ?? '') ||
      edit.barcode !== (l.barcode ?? '') ||
      edit.manufactureDate !== (l.manufactureDate ?? null) ||
      edit.expiryDate !== (l.expiryDate ?? null) ||
      edit.onHold !== l.onHold ||
      (edit.location?.id ?? null) !== (l.location?.id ?? null) ||
      edit.volumePerPack !== l.volumePerPack ||
      (edit.manufacturer?.id ?? null) !== (l.manufacturer?.id ?? null) ||
      (edit.donorId ?? null) !== (l.donor?.id ?? null) ||
      edit.campaignId !== (l.campaign?.id ?? null) ||
      edit.programId !== (l.program?.id ?? null)
    );
  });

  // The partial update: only the fields that changed (spec/stock AC-E1). Clear
  // via the nullable wrappers; batch / barcode are plain scalars.
  const buildPatch = (l: Line): UpdateStockLineVariables['input'] => {
    const patch: UpdateStockLineVariables['input'] = { id: l.id };
    if (edit.costPricePerPack !== l.costPricePerPack)
      patch.costPricePerPack = edit.costPricePerPack;
    if (edit.sellPricePerPack !== l.sellPricePerPack)
      patch.sellPricePerPack = edit.sellPricePerPack;
    if (edit.batch !== (l.batch ?? '')) patch.batch = edit.batch;
    if (edit.barcode !== (l.barcode ?? '')) patch.barcode = edit.barcode;
    if (edit.manufactureDate !== (l.manufactureDate ?? null))
      patch.manufactureDate = { value: edit.manufactureDate };
    if (edit.expiryDate !== (l.expiryDate ?? null))
      patch.expiryDate = { value: edit.expiryDate };
    if (edit.onHold !== l.onHold) patch.onHold = edit.onHold;
    if ((edit.location?.id ?? null) !== (l.location?.id ?? null))
      patch.location = { value: edit.location?.id ?? null };
    if (edit.volumePerPack !== l.volumePerPack)
      patch.volumePerPack = edit.volumePerPack;
    if ((edit.manufacturer?.id ?? null) !== (l.manufacturer?.id ?? null)) {
      patch.manufacturerId = { value: edit.manufacturer?.id ?? null };
      // Changing the manufacturer clears the item variant (spec/stock S2).
      patch.itemVariantId = { value: null };
    }
    if ((edit.donorId ?? null) !== (l.donor?.id ?? null))
      patch.donorId = { value: edit.donorId };
    if (
      edit.campaignId !== (l.campaign?.id ?? null) ||
      edit.programId !== (l.program?.id ?? null)
    ) {
      // One mutually-exclusive choice over two wire fields: always send both
      // wrappers so choosing one side clears the other.
      patch.campaignId = { value: edit.campaignId };
      patch.programId = { value: edit.programId };
    }
    return patch;
  };

  const doSave = async () => {
    const l = line();
    if (!l) return;
    setSaving(true);
    setSaveError(undefined);
    const outcome = await runUpdateStockLine(params.storeId, buildPatch(l));
    setSaving(false);
    if (!outcome) return;
    if (outcome.kind === 'error') {
      setSaveError(outcome.message); // keep the edits, surface inline
      return;
    }
    // Success: overlay the saved attributes onto the line (keeping its VVM
    // history) and re-seed (clears dirty). No toast.
    const saved = outcome.data;
    mutate(prev => (prev ? { ...prev, ...saved } : prev));
    seedFor(saved);
  };

  const leave = () => navigate(`/${params.storeId}/inventory/stock`);

  const onCancelOrClose = () => {
    if (isDirty()) setDiscardOpen(true);
    else leave();
  };

  const afterQuantityChange = () => {
    void refetch();
    void refetchLocations();
  };

  const canAdjust = () => hasPermission('INVENTORY_ADJUSTMENT_MUTATE');

  // The VVM tab exists only for a vaccine item with manageVvmStatusForStock on.
  const showVvmTab = () =>
    !!line()?.item.isVaccine && prefs().manageVvmStatusForStock;
  // The VVM status FIELD shows when either VVM preference is on (vaccine item).
  const showVvmField = () =>
    !!line()?.item.isVaccine &&
    (prefs().manageVvmStatusForStock || prefs().sortByVvmStatusThenExpiry);

  const tabs = (): TabDef[] => [
    { value: 'details', label: t('label.details') },
    ...(showVvmTab() ? [{ value: 'vvm', label: t('label.vvm-status') }] : []),
    { value: 'log', label: t('label.log') },
    { value: 'ledger', label: t('label.ledger') },
  ];

  const crumbs = (l: Line) => [
    { label: t('stock'), onClick: onCancelOrClose },
    { label: l.itemName },
  ];

  // The invalid-location warning (spec/stock AC-D4): the item is restricted to
  // a location type and the current location is of another type.
  const invalidLocation = (l: Line) =>
    !!l.item.restrictedLocationTypeId &&
    !!l.location &&
    l.location.locationType?.id !== l.item.restrictedLocationTypeId;

  const supplierText = (l: Line) =>
    l.supplierName && l.supplierName.length > 0
      ? l.supplierName
      : t('label.inventory-adjustment');

  return (
    <Suspense fallback={<Spinner center />}>
      {/* Non-suspending read (`.latest`) survives the post-adjust/repack refetch
          without remounting the view (kdd/solid-reactivity-pitfalls), so the
          Suspense boundary won't fire on the initial load — the Show's own
          fallback shows the first-load spinner, or a not-found state once the
          fetch has resolved to nothing (a stale/other-store id — AC-E9). */}
      <Show
        when={line()}
        fallback={
          data.loading ? (
            <Spinner center />
          ) : (
            <EmptyState message={t('error.stock-not-found')} />
          )
        }
      >
        {l => (
          <Tabs value={activeTab()} onValueChange={setActiveTab}>
            <Page
              // Fill (no body padding, child fills the region) is for the
              // self-scrolling table tabs; the Details form tab keeps the
              // standard padded scrolling body.
              fillBody={activeTab() !== 'details'}
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs(l())} />
                  <HeaderButtons>
                    <Button
                      variant="secondary"
                      icon={<StockIcon />}
                      data-testid="repack-button"
                      onClick={() => setRepackOpen(true)}
                    >
                      {t('button.repack')}
                    </Button>
                    <Show when={canAdjust()}>
                      <Button
                        icon={<BarIcon />}
                        data-testid="adjust-button"
                        onClick={() => setAdjustOpen(true)}
                      >
                        {t('button.adjust')}
                      </Button>
                    </Show>
                  </HeaderButtons>
                  <TabList tabs={tabs()} />
                </Header>
              }
              contentFooter={
                <Show when={activeTab() === 'details'}>
                  <ContentFooter>
                    <ContentFooterActions>
                      <Button
                        variant="secondary"
                        icon={<XCircleIcon />}
                        data-testid="cancel-button"
                        onClick={onCancelOrClose}
                      >
                        {isDirty() ? t('button.cancel') : t('button.close')}
                      </Button>
                      <Button
                        icon={<SaveIcon />}
                        loading={saving()}
                        disabled={!isDirty() || saving()}
                        data-testid="save-button"
                        onClick={() => setConfirmSaveOpen(true)}
                      >
                        {t('button.save')}
                      </Button>
                    </ContentFooterActions>
                  </ContentFooter>
                </Show>
              }
            >
              <TabPanel value="details">
                <ContentContainer size="form">
                  <Stack>
                    <IdentityHeader
                      title={l().itemName}
                      subtitle={
                        <>
                          {t('label.code')}: {l().item.code} · {t('label.unit')}
                          : {l().item.unitName ?? '—'}
                        </>
                      }
                    />

                    <Show when={invalidLocation(l())}>
                      <Alert
                        severity="warning"
                        testId="invalid-location-warning"
                      >
                        {t('messages.stock-in-invalid-location')}
                      </Alert>
                    </Show>

                    <Show when={saveError()}>
                      {message => <Alert severity="error">{message()}</Alert>}
                    </Show>

                    {/* The sectioned edit form (spec/ui-standards detail-views):
                      titled sections in two column stacks that wrap to one when
                      squeezed. Editable fields are live inputs (label above);
                      read-only facts are LabelledValue in field variant (no
                      input chrome). Sections and rows per spec/stock S2
                      Layout. */}
                    <FormColumns>
                      <FormColumn>
                        <FormSection title={t('heading.stock-levels')}>
                          <FormRow>
                            <LabelledValue
                              variant="field"
                              label={t('label.pack-qty')}
                            >
                              {qtyValue(l().totalNumberOfPacks, sohUnits())}
                            </LabelledValue>
                            <LabelledValue
                              variant="field"
                              label={t('label.available-packs')}
                            >
                              {qtyValue(
                                l().availableNumberOfPacks,
                                availUnits()
                              )}
                            </LabelledValue>
                          </FormRow>
                          <FormRow>
                            <LabelledValue
                              variant="field"
                              label={t('label.available-stock')}
                            >
                              {qtyValue(availUnits(), availUnits())}
                            </LabelledValue>
                            <LabelledValue
                              variant="field"
                              label={t('label.soh')}
                            >
                              {qtyValue(sohUnits(), sohUnits())}
                            </LabelledValue>
                          </FormRow>
                        </FormSection>

                        <FormSection title={t('heading.batches-and-dates')}>
                          <TextField
                            label={t('label.batch')}
                            width="full"
                            value={edit.batch}
                            onInput={e =>
                              setEdit('batch', e.currentTarget.value)
                            }
                          />
                          <TextField
                            label={t('label.barcode')}
                            width="full"
                            value={edit.barcode}
                            onInput={e =>
                              setEdit('barcode', e.currentTarget.value)
                            }
                          />
                          <FormRow>
                            <DateField
                              label={t('label.expiry-date')}
                              width="full"
                              value={edit.expiryDate}
                              onChange={v => setEdit('expiryDate', v)}
                            />
                            <DateField
                              label={t('label.manufacture-date')}
                              width="full"
                              max={localTodayIso()}
                              value={edit.manufactureDate}
                              onChange={v => setEdit('manufactureDate', v)}
                            />
                          </FormRow>
                          <Show when={showVvmField()}>
                            {/* Read-only here — changes go through the VVM history
                              flow (spec/stock S2 / AC-V2). */}
                            <LabelledValue
                              variant="field"
                              label={t('label.vvm-status')}
                            >
                              {l().vvmStatus?.description ?? '—'}
                            </LabelledValue>
                          </Show>
                        </FormSection>

                        <FormSection title={t('heading.pricing')}>
                          <FormRow>
                            <CurrencyField
                              label={t('label.cost-price')}
                              width="full"
                              value={edit.costPricePerPack}
                              onChange={v =>
                                setEdit('costPricePerPack', v ?? 0)
                              }
                            />
                            <CurrencyField
                              label={t('label.sell-price')}
                              width="full"
                              value={edit.sellPricePerPack}
                              onChange={v =>
                                setEdit('sellPricePerPack', v ?? 0)
                              }
                            />
                          </FormRow>
                        </FormSection>
                      </FormColumn>

                      <FormColumn>
                        <FormSection title={t('heading.storage-and-pack')}>
                          <LocationVolumeSelect
                            label={t('label.location')}
                            locations={locations()}
                            loading={allLocations.loading}
                            value={edit.location?.id}
                            placeholder={t('label.none')}
                            // This field PLACES stock, so "Available" is
                            // measured against what's being placed — the DRAFT
                            // volume per pack (what the user is editing), not
                            // the saved figure (spec/stock/rules.md › location
                            // fields).
                            requiredVolume={
                              (edit.volumePerPack ?? 0) * l().totalNumberOfPacks
                            }
                            // The SAVED location, not the draft one: once the
                            // user picks elsewhere, where the stock actually
                            // still sits must stay offered under "Available".
                            originalLocationId={l().location?.id}
                            onChange={loc =>
                              setEdit(
                                'location',
                                loc
                                  ? {
                                      id: loc.id,
                                      code: loc.code,
                                      name: loc.name,
                                    }
                                  : null
                              )
                            }
                          />
                          <FormRow>
                            <LabelledValue
                              variant="field"
                              label={t('label.pack-size')}
                            >
                              {formatNumber(l().packSize)}
                            </LabelledValue>
                            <Checkbox
                              label={t('label.on-hold')}
                              checked={edit.onHold}
                              onChange={v => setEdit('onHold', v)}
                            />
                          </FormRow>
                          <FormRow>
                            <NumberField
                              label={t('label.volume-per-pack')}
                              width="full"
                              decimalLimit={10}
                              value={edit.volumePerPack}
                              onChange={v => setEdit('volumePerPack', v ?? 0)}
                            />
                            {/* Derived from the DRAFT volume per pack, not the
                              saved figure, so it tracks what's being edited
                              (the server derives its stored value the same
                              way). */}
                            <LabelledValue
                              variant="field"
                              label={t('label.total-volume')}
                            >
                              {formatNumber(
                                totalVolume(
                                  edit.volumePerPack,
                                  l().totalNumberOfPacks
                                )
                              )}
                            </LabelledValue>
                          </FormRow>
                        </FormSection>

                        <FormSection title={t('heading.supply-chain')}>
                          <NameSearch
                            label={t('label.manufacturer')}
                            storeId={params.storeId}
                            role="manufacturer"
                            selected={
                              edit.manufacturer
                                ? {
                                    id: edit.manufacturer.id,
                                    name: edit.manufacturer.name,
                                    code: '',
                                    isSupplier: false,
                                    isDonor: false,
                                    isOnHold: false,
                                    isStore: false,
                                  }
                                : undefined
                            }
                            placeholder={t('label.none')}
                            onSelect={name =>
                              setEdit(
                                'manufacturer',
                                name ? { id: name.id, name: name.name } : null
                              )
                            }
                          />
                          <LabelledValue
                            variant="field"
                            label={t('label.supplier')}
                          >
                            {supplierText(l())}
                          </LabelledValue>
                          <FormRow>
                            <Show when={prefs().allowTrackingOfStockByDonor}>
                              <NameSearch
                                label={t('label.donor')}
                                storeId={params.storeId}
                                role="donor"
                                selected={
                                  edit.donorId
                                    ? {
                                        id: edit.donorId,
                                        name: edit.donorName ?? '',
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
                                  setEdit('donorId', name?.id ?? null);
                                  setEdit('donorName', name?.name ?? null);
                                }}
                              />
                            </Show>
                            <CampaignOrProgramSelect
                              label={t('label.campaign')}
                              storeId={params.storeId}
                              itemId={l().itemId}
                              campaignId={edit.campaignId ?? undefined}
                              programId={edit.programId ?? undefined}
                              placeholder={t('label.none')}
                              onChange={v => {
                                setEdit('campaignId', v?.campaign?.id ?? null);
                                setEdit('programId', v?.program?.id ?? null);
                              }}
                            />
                          </FormRow>
                        </FormSection>
                      </FormColumn>
                    </FormColumns>
                  </Stack>
                </ContentContainer>
              </TabPanel>

              <Show when={showVvmTab()}>
                <TabPanel value="vvm">
                  <VvmHistoryPanel
                    logs={l().vvmStatusLogs?.nodes ?? []}
                    onNewEntry={() => setVvmEntry({})}
                    onEditEntry={entry => setVvmEntry({ entry })}
                  />
                </TabPanel>
              </Show>

              <TabPanel value="log">
                <ActivityLogPanel storeId={params.storeId} recordId={l().id} />
              </TabPanel>

              <TabPanel value="ledger">
                <LedgerPanel storeId={params.storeId} stockLineId={l().id} />
              </TabPanel>

              {/* Quantity-changing flows — overlays, kept as direct children so
                  they open regardless of the active tab. */}
              <AdjustModal
                open={adjustOpen()}
                storeId={params.storeId}
                line={l()}
                onClose={() => setAdjustOpen(false)}
                onAdjusted={afterQuantityChange}
              />
              <RepackModal
                open={repackOpen()}
                storeId={params.storeId}
                line={l()}
                onClose={() => setRepackOpen(false)}
                onRepacked={afterQuantityChange}
                onNavigateToLine={id => {
                  // Close the repack modal before navigating — the detail route
                  // component is reused across :stockLineId changes, so the
                  // open signal would otherwise persist and leave a stale modal
                  // over the new line (spec AC-R7).
                  setRepackOpen(false);
                  navigate(`/${params.storeId}/inventory/stock/${id}`);
                }}
              />
              <VvmStatusEntryModal
                open={vvmEntry() !== undefined}
                storeId={params.storeId}
                stockLineId={l().id}
                entry={vvmEntry()?.entry}
                onClose={() => setVvmEntry(undefined)}
                onSaved={afterQuantityChange}
              />

              {/* Pre-save confirmation (spec/stock AC-D3). */}
              <ConfirmDialog
                open={confirmSaveOpen()}
                title={t('heading.are-you-sure')}
                message={t('messages.confirm-save-stock')}
                confirmAction="save"
                onConfirm={() => void doSave()}
                onClose={() => setConfirmSaveOpen(false)}
              />
              {/* Discard prompt when leaving with unsaved edits. */}
              <ConfirmDialog
                open={discardOpen()}
                title={t('heading.are-you-sure')}
                message={t('messages.discard-changes')}
                confirmLabel={t('button.discard')}
                onConfirm={leave}
                onClose={() => setDiscardOpen(false)}
              />
            </Page>
          </Tabs>
        )}
      </Show>
    </Suspense>
  );
};

export default StockLineDetailView;
