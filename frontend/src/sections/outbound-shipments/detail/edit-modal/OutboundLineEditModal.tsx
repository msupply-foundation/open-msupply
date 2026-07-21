import { createMemo, createSignal, onMount, Show, type JSX } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { graphqlFetch } from '../../../../api/graphql';
import { t } from '../../../../intl';
import { formatNumber } from '../../../../intl/formatNumber';
import { toNumberOrNull } from '../../../../typeHelpers';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { Combobox } from '../../../../ui/elements/selectors/Combobox';
import { Select } from '../../../../ui/elements/selectors/Select';
import styles from './OutboundLineEditModal.module.css';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import {
  getExpiryDateCell,
  getNumberCell,
  getCurrencyCell,
} from '../../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../../api/createTableConfig';
import { ArrowRightIcon, CheckIcon, XCircleIcon } from '../../../../ui/icons';
import {
  DraftStockOutLines,
  SaveOutboundItemLines,
  type DraftStockOutLinesResult,
} from './outboundLineEdit.generated';
import { itemOptionsResource, type ItemOption } from './itemOptionsResource';
import {
  barReasons,
  distributeIssue,
  fefoCompare,
  lensToUnits,
  type AllocateUnit,
  type AllocationPreferences,
} from '../../../../domain/allocation';
import { outboundPrefs } from '../../outboundPreferencesResource';

// The line editor (spec S4): the SINGLE surface for issuing an item — set the
// quantity to issue and distribute it across batches. The batch grid is the
// server-computed draft (draftStockOutLines: one row per batch with
// available/in-store packs + the item's existing lines pre-filled); entry in
// the Issue field auto-distributes FEFO client-side (AC-AL1's manual-entry
// face), per-batch packs are directly editable bounded 0…available (AC-I5),
// and quantity beyond available becomes the placeholder while NEW (AC-P1/P3).
// Save is the item-set save (saveOutboundShipmentItemLines, AC-I6): lines +
// placeholder in one call; every rejection is a non-typed GraphQL error
// (contract wire trap) surfaced in the footer.

type DraftLine =
  DraftStockOutLinesResult['draftStockOutLines']['draftLines'][number];

export type LineEditItem = {
  id: string;
  name: string;
  unitName?: string | null;
  isVaccine?: boolean;
  doses?: number;
};

interface OutboundLineEditModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  invoiceId: string;
  /** NEW shipments may create placeholders (rules.md § placeholder lines). */
  isNew: boolean;
  /** The item to open ON (edit mode — the picker locks); undefined = add. */
  initialItem?: LineEditItem;
  /** Items already on the shipment — excluded from the picker (S4). */
  existingItemIds: string[];
  /**
   * Whether the shipment's customer is itself a store (a transfer). Non-store
   * (external) customers additionally get the received-packs / difference columns.
   */
  customerIsStore: boolean;
  /** A save committed — the view refetches the shipment. */
  onCommitted: () => void;
}

// Mount-while-open wrapper (kdd/explicit-composition): <Show> tears the
// content down on close so each open starts fresh.
export const OutboundLineEditModal = (
  props: OutboundLineEditModalProps
): JSX.Element => (
  <Show when={props.open}>
    <LineEditContent {...props} />
  </Show>
);

// Issue-entry lens (spec/stock-allocation § the allocate-in lens): units,
// packs-of-‹size›; doses stay display-only in this build (entry mode needs
// the doses preference, off on the dev store).

const LineEditContent = (props: OutboundLineEditModalProps): JSX.Element => {
  const [item, setItem] = createSignal<LineEditItem | undefined>(
    props.initialItem
  );
  const [draft, setDraft] = createStore<DraftLine[]>([]);
  const [placeholderUnits, setPlaceholderUnits] = createSignal(0);
  const [issueText, setIssueText] = createSignal('');
  const [allocateIn, setAllocateIn] = createSignal<AllocateUnit>({
    kind: 'units',
  });
  const [loadingLines, setLoadingLines] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | undefined>();
  // Zero-allocation saves need a second confirmation (spec S4 § save).
  const [zeroConfirm, setZeroConfirm] = createSignal(false);
  // Warnings raised by the last distribution (spec S4 § warnings).
  const [warnings, setWarnings] = createSignal<string[]>([]);
  // Dirty gate: OK is disabled until something changed (matches the e2e
  // expectation that OK saves a real change).
  const [dirty, setDirty] = createSignal(false);

  const tableConfig = createTableConfig({ tableId: 'outbound-line-edit' });
  const prefs = () => outboundPrefs()?.prefs;

  // Load one item's draft (server-computed: existing lines + available
  // batches + placeholder). The ONE seed path — on mount (edit mode) and on
  // item pick (add mode).
  const loadItem = async (picked: LineEditItem) => {
    setItem(picked);
    setLoadingLines(true);
    setErrorMessage(undefined);
    setWarnings([]);
    setIssueText('');
    setDirty(false);
    setZeroConfirm(false);
    const result = await graphqlFetch(DraftStockOutLines, {
      storeId: props.storeId,
      itemId: picked.id,
      invoiceId: props.invoiceId,
    });
    if (result.kind !== 'success') {
      setLoadingLines(false);
      return;
    }
    const data = result.data.draftStockOutLines;
    // FEFO order for display and distribution: the shared comparator
    // (spec/stock-allocation § ordering, AC-AL1; VVM-then-expiry stays with
    // the server-side allocation).
    const sorted = [...data.draftLines].sort(fefoCompare);
    setDraft(reconcile(sorted, { key: 'id' }));
    setPlaceholderUnits(data.placeholderQuantity ?? 0);
    setLoadingLines(false);
  };

  onMount(() => {
    if (props.initialItem) void loadItem(props.initialItem);
  });

  // The shared barred-batch policy (spec/stock-allocation § barred batches,
  // AC-AL2/AL8), fed outbound's resolved preferences — the module owns no
  // preference fetch.
  const allocationPrefs = (): AllocationPreferences => ({
    expiredStockPreventIssue: prefs()?.expiredStockPreventIssue ?? false,
    expiredStockIssueThreshold: prefs()?.expiredStockIssueThreshold ?? 0,
    manageVvmStatusForStock: prefs()?.manageVvmStatusForStock ?? false,
  });
  const lineBarReasons = (line: DraftLine) =>
    barReasons(line, allocationPrefs());
  const isBarred = (line: DraftLine): boolean =>
    lineBarReasons(line).length > 0;

  const availableUnits = createMemo(() =>
    draft.reduce((sum, line) => sum + line.availablePacks * line.packSize, 0)
  );

  // A fresh array whenever the draft's SHAPE changes (rows added on load /
  // cleared on item switch). The DataTable/TanStack memoises its row model on
  // the `data` reference, so passing the store proxy directly (whose reference
  // survives an in-place `reconcile`) leaves the grid stuck on its initial
  // empty build. Spreading tracks the array's shape, not each row's nested
  // fields, so per-pack edits still mutate in place without rebuilding the grid
  // (no remount / focus loss — kdd/solid-reactivity-pitfalls).
  const draftRows = createMemo(() => [...draft]);
  const issuedUnits = createMemo(() =>
    draft.reduce((sum, line) => sum + line.numberOfPacks * line.packSize, 0)
  );
  const distinctPackSizes = createMemo(() => [
    ...new Set(draft.map(line => line.packSize)),
  ]);

  const unitName = () => item()?.unitName ?? t('label.unit');

  // The <Select> value string for the current allocate-in lens. Capture the
  // lens in a local so TS narrows the discriminated union without a cast (a
  // bare second allocateIn() call is not narrowed).
  const allocateInValue = () => {
    const lens = allocateIn();
    return lens.kind === 'units' ? 'units' : `packs-${lens.size}`;
  };

  // FEFO auto-distribution across the grid (spec S4 issue field): the shared
  // routine fills usable batches oldest-expiry-first in whole packs
  // (src/domain/allocation distributeIssue — AC-AL1/AL3's client face); the
  // shortfall becomes the placeholder (NEW only), and each condition raises
  // its warning banner.
  const distribute = (units: number) => {
    const result = distributeIssue(
      draft.map(line => ({
        id: line.id,
        packSize: line.packSize,
        availablePacks: line.availablePacks,
        barred: lineBarReasons(line),
      })),
      units
    );
    for (let index = 0; index < draft.length; index++) {
      const packs = result.packsById.get(draft[index]!.id) ?? 0;
      setDraft(index, 'numberOfPacks', packs);
    }
    setPlaceholderUnits(props.isNew ? result.shortfallUnits : 0);
    const notes: string[] = [];
    if (result.skippedReasons.size > 0) notes.push(t('messages.stock-expired'));
    setWarnings(notes);
    setDirty(true);
    // The allocation just changed — any earlier zero-allocation confirmation
    // no longer applies (spec S4 § save; it must be re-earned against the
    // current quantity, e.g. after raising it back above zero).
    setZeroConfirm(false);
  };

  const onIssueInput = (value: string) => {
    setIssueText(value);
    const units = lensToUnits(toNumberOrNull(value), allocateIn());
    // Clearing (or blanking) the Issue field distributes 0 — resetting every
    // batch's packs and the placeholder, not leaving the last distribution behind.
    distribute(units ?? 0);
  };

  // Direct per-batch edit, bounded 0…available (AC-I5 — the client bounds the
  // input; the server does not reject negatives while NEW).
  const setPacks = (id: string, value: number | null) => {
    const index = draft.findIndex(line => line.id === id);
    if (index < 0) return;
    const line = draft[index]!;
    const bounded = Math.max(0, Math.min(value ?? 0, line.availablePacks));
    setDraft(index, 'numberOfPacks', bounded);
    setDirty(true);
    // As in distribute() — a direct per-batch edit also invalidates a stale
    // zero-allocation confirmation.
    setZeroConfirm(false);
  };

  const save = async (): Promise<boolean> => {
    const current = item();
    if (!current) return false;
    setSaving(true);
    setErrorMessage(undefined);
    const result = await graphqlFetch(
      SaveOutboundItemLines,
      {
        storeId: props.storeId,
        input: {
          invoiceId: props.invoiceId,
          itemId: current.id,
          // The full set, zeros included — the item-set save replaces the
          // item's lines (zero packs removes an existing line), and the
          // explicit placeholder quantity creates/updates/deletes the
          // placeholder to match (AC-I6).
          lines: draft.map(line => ({
            id: line.id,
            numberOfPacks: line.numberOfPacks,
            stockLineId: line.stockLineId,
          })),
          placeholderQuantity: placeholderUnits(),
        },
      },
      // Wire trap (contract § issuing lines): saveOutboundShipmentItemLines
      // has NO typed errors — everything arrives as a plain GraphQL error.
      { returnGraphqlErrors: true }
    );
    setSaving(false);
    if (result.kind === 'graphqlError') {
      setErrorMessage(t('error.cant-save'));
      return false;
    }
    if (result.kind !== 'success') return false;
    props.onCommitted();
    return true;
  };

  // Zero allocated quantity requires a second confirmation (spec S4 § save).
  const confirmThen = (proceed: () => void) => {
    if (issuedUnits() === 0 && placeholderUnits() === 0 && !zeroConfirm()) {
      setZeroConfirm(true);
      return;
    }
    proceed();
  };

  const onOk = () =>
    confirmThen(() => {
      void save().then(ok => {
        if (ok) props.onClose();
      });
    });

  // OK & next (spec S4): saves, then resets for rapid entry of the NEXT item —
  // add mode only (the picker clears and refocuses).
  const onOkNext = () =>
    confirmThen(() => {
      void save().then(ok => {
        if (!ok) return;
        setItem(undefined);
        setDraft(reconcile([], { key: 'id' }));
        setPlaceholderUnits(0);
        setIssueText('');
        setWarnings([]);
        setDirty(false);
        setZeroConfirm(false);
      });
    });

  const pickerItems = () =>
    itemOptionsResource
      .noSuspense()
      .filter(option => !props.existingItemIds.includes(option.id));

  const editMode = () => props.initialItem != null;

  // In edit mode the item is excluded from `pickerItems` (it's already on the
  // shipment), so the combobox can't resolve its label from `items`. Supply the
  // selected option directly so the locked field shows the item name.
  const selectedItemOption = createMemo<ItemOption | undefined>(() => {
    const it = item();
    if (!editMode() || !it) return undefined;
    return {
      id: it.id,
      code: '',
      name: it.name,
      unitName: it.unitName ?? null,
      isVaccine: it.isVaccine ?? false,
      doses: it.doses ?? 0,
      availableStockOnHand: 0,
    };
  });

  const columns = (): Column<DraftLine, never>[] => [
    {
      // "Will be used in auto-allocation": a check on usable (not barred)
      // batches — matches the old app's canAllocate CheckCell; hovering the
      // tick shows the reason. Barred rows are additionally dimmed (rowDimmed).
      c: { accessor: line => !isBarred(line), id: 'canAllocate' },
      header: '',
      cell: info => (
        <Show when={info.getValue<boolean>()}>
          <span title={t('description.used-in-auto-allocation')}>
            <CheckIcon />
          </span>
        </Show>
      ),
    },
    {
      c: { key: 'batch' },
      header: t('label.batch'),
      cell: info => info.getValue<string | null>() ?? '—',
    },
    {
      c: { key: 'expiryDate' },
      header: t('label.expiry'),
      ...getExpiryDateCell(),
    },
    ...(prefs()?.manageVvmStatusForStock
      ? [
          {
            c: {
              accessor: (line: DraftLine) => line.vvmStatus?.description ?? '',
              id: 'vvmStatus',
            },
            header: t('label.vvm-status'),
          } as Column<DraftLine, never>,
        ]
      : []),
    {
      c: {
        accessor: line => line.campaign?.name ?? line.program?.name ?? '',
        id: 'campaign',
      },
      header: t('label.campaign'),
    },
    {
      c: { accessor: line => line.location?.code ?? '', id: 'location' },
      header: t('label.location'),
    },
    ...(prefs()?.allowTrackingOfStockByDonor
      ? [
          {
            c: {
              accessor: (line: DraftLine) => line.donor?.name ?? '',
              id: 'donor',
            },
            header: t('label.donor'),
          } as Column<DraftLine, never>,
        ]
      : []),
    {
      c: {
        accessor: line => line.manufacturer?.name ?? '',
        id: 'manufacturer',
      },
      header: t('label.manufacturer'),
    },
    {
      c: { key: 'sellPricePerPack' },
      header: t('label.sell-price'),
      ...getCurrencyCell(),
    },
    {
      c: { key: 'packSize' },
      header: t('label.pack-size'),
      ...getNumberCell(),
    },
    ...(prefs()?.manageVaccinesInDoses
      ? [
          {
            c: { key: 'dosesPerUnit' },
            header: t('label.doses-per-unit'),
            ...getNumberCell(),
          } as Column<DraftLine, never>,
        ]
      : []),
    {
      c: { key: 'inStorePacks' },
      header: t('label.in-store'),
      ...getNumberCell(),
    },
    {
      c: { key: 'availablePacks' },
      header: t('label.available'),
      ...getNumberCell(),
    },
    {
      // The one editable cell: packs issued from this batch (AC-I5).
      c: { key: 'numberOfPacks' },
      header: t('label.issued'),
      meta: { align: 'right' },
      cell: info => {
        const line = info.row.original;
        return (
          <NumberField
            label={t('label.issued')}
            hideLabel
            size="small"
            min={0}
            max={line.availablePacks}
            decimalLimit={2}
            disabled={isBarred(line)}
            value={line.numberOfPacks || undefined}
            onChange={value => setPacks(line.id, value ?? null)}
          />
        );
      },
    },
    {
      c: {
        accessor: line => line.numberOfPacks * line.packSize,
        id: 'unitsIssued',
      },
      header: t('label.units-issued', { unit: unitName() }),
      ...getNumberCell(),
    },
    ...(props.customerIsStore
      ? []
      : [
          {
            c: {
              accessor: (line: DraftLine) =>
                line.receivedNumberOfPacks ?? line.numberOfPacks,
              id: 'receivedNumberOfPacks',
            },
            header: t('label.packs-received'),
            ...getNumberCell(),
          } as Column<DraftLine, never>,
          {
            c: {
              accessor: (line: DraftLine) =>
                (line.receivedNumberOfPacks ?? line.numberOfPacks) -
                line.numberOfPacks,
              id: 'difference',
            },
            header: t('label.difference'),
            ...getNumberCell(),
          } as Column<DraftLine, never>,
        ]),
  ];

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      testId="add-item-modal"
      title={editMode() ? t('heading.edit-line') : t('button.add-item')}
      actionsLead={
        <Show when={errorMessage()}>
          {message => <Alert severity="error">{message()}</Alert>}
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            icon={<CheckIcon />}
            data-testid="dialog-button-ok"
            disabled={!item() || !dirty()}
            loading={saving()}
            onClick={onOk}
          >
            {t('button.ok')}
          </Button>
          {/* Rapid entry — add mode only (spec S4 § save). */}
          <Show when={!editMode()}>
            <Button
              icon={<ArrowRightIcon />}
              data-testid="dialog-button-next-and-ok"
              disabled={!item() || !dirty()}
              loading={saving()}
              onClick={onOkNext}
            >
              {t('button.ok-and-next')}
            </Button>
          </Show>
        </>
      }
    >
      {/* Item row: the catalogue lookup (locked in edit mode) + unit. */}
      <Combobox<ItemOption>
        label={t('label.item')}
        items={pickerItems()}
        loading={itemOptionsResource.loading()}
        itemToString={option => option.name}
        itemToValue={option => option.id}
        filter={(option, input) => {
          const needle = input.toLocaleLowerCase();
          return (
            option.name.toLocaleLowerCase().includes(needle) ||
            option.code.toLocaleLowerCase().includes(needle)
          );
        }}
        renderItem={option => (
          <span class={styles.itemOption}>
            <span class={styles.itemLabel}>
              <span data-testid="item-option-code">{option.code}</span>{' '}
              <span data-testid="item-option-name">{option.name}</span>
            </span>
            <span class={styles.itemStock}>
              {formatNumber(option.availableStockOnHand)}{' '}
              {option.unitName ?? t('label.unit-plural')}
            </span>
          </span>
        )}
        value={item()?.id ?? ''}
        selectedItem={selectedItemOption()}
        disabled={editMode() || saving()}
        inputTestId="item-search-input"
        placeholder={t('placeholder.search-by-name')}
        onChange={option => {
          if (option)
            void loadItem({
              id: option.id,
              name: option.name,
              unitName: option.unitName,
              isVaccine: option.isVaccine,
              doses: option.doses,
            });
        }}
      />

      {/* Available on its own line, then the issue row: quantity + allocate-in. */}
      <Show when={item()}>
        <div style={{ 'margin-block': 'var(--space-3) var(--space-2)' }}>
          <span>
            {t('label.available')}: {formatNumber(availableUnits())}{' '}
            {unitName()}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            'align-items': 'end',
            gap: 'var(--space-4)',
            'margin-block-end': 'var(--space-3)',
          }}
        >
          <TextField
            label={t('label.issue')}
            size="small"
            inputmode="decimal"
            value={issueText()}
            disabled={saving()}
            onInput={e => onIssueInput(e.currentTarget.value)}
          />
          <Select
            label={t('label.units')}
            size="sm"
            value={allocateInValue()}
            options={[
              { value: 'units', label: unitName() },
              ...distinctPackSizes().map(size => ({
                value: `packs-${size}`,
                label: t('label.packs-of-pack-size', { packSize: size }),
              })),
            ]}
            onValueChange={value => {
              setAllocateIn(
                value === 'units'
                  ? { kind: 'units' }
                  : { kind: 'packs', size: Number(value.slice(6)) }
              );
              const parsed = toNumberOrNull(issueText());
              if (parsed != null && parsed >= 0) onIssueInput(issueText());
            }}
          />
          {/* Placeholder notice (info) — to the right of Issue / Allocate-in,
              matching the old app; shown when a shortfall became a placeholder. */}
          <Show when={placeholderUnits() > 0}>
            <div class={styles.placeholderNotice}>
              <Alert severity="info">
                {t('messages.placeholder-allocated-units', {
                  requestedQuantity: formatNumber(
                    issuedUnits() + placeholderUnits()
                  ),
                  placeholderQuantity: formatNumber(placeholderUnits()),
                })}
              </Alert>
            </div>
          </Show>
        </div>

        {/* Batch grid: one row per available batch, FEFO-ordered; barred rows
            disabled (AC-AL2 / AC-AL8). */}
        <DataTable
          columns={columns()}
          rows={draftRows()}
          rowKey={line => line.id}
          loading={loadingLines()}
          showFullScreen={false}
          rowDimmed={line => isBarred(line)}
          emptyMessage={t('messages.no-stock-available')}
          config={tableConfig.config()}
          setConfig={tableConfig.setConfig}
        />

        {/* Grid footer: placeholder + running total (spec S4). */}
        <div
          style={{
            display: 'flex',
            'justify-content': 'end',
            gap: 'var(--space-4)',
            'margin-block-start': 'var(--space-2)',
          }}
        >
          <span>
            {t('label.placeholder')}: {formatNumber(placeholderUnits())}
          </span>
          <span>
            {t('label.total-units')}:{' '}
            {formatNumber(issuedUnits() + placeholderUnits())}
          </span>
        </div>

        {/* Stacked warning banners (spec S4 § warnings). */}
        <Show when={warnings().length > 0}>
          <div
            style={{
              display: 'flex',
              'flex-direction': 'column',
              gap: 'var(--space-2)',
              'margin-block-start': 'var(--space-2)',
            }}
          >
            {warnings().map(message => (
              <Alert severity="warning">{message}</Alert>
            ))}
          </div>
        </Show>

        {/* Zero-allocation second confirmation (spec S4 § save). */}
        <Show when={zeroConfirm()}>
          <Alert severity="info">{t('messages.confirm-zero-quantity')}</Alert>
        </Show>
      </Show>
    </Dialog>
  );
};
