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
import { Combobox } from '../../../../ui/elements/selectors/Combobox';
import { Select } from '../../../../ui/elements/selectors/Select';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import {
  getDateCell,
  getNumberCell,
  getCurrencyCell,
  getBooleanCell,
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
  const issuedUnits = createMemo(() =>
    draft.reduce((sum, line) => sum + line.numberOfPacks * line.packSize, 0)
  );
  const distinctPackSizes = createMemo(() => [
    ...new Set(draft.map(line => line.packSize)),
  ]);

  const unitName = () => item()?.unitName ?? t('outbound.line.unit');

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
    if (result.overAllocatedUnits > 0)
      notes.push(
        t('outbound.edit.warn-over-allocated', {
          count: formatNumber(result.overAllocatedUnits),
        })
      );
    if (result.shortfallUnits > 0 && props.isNew)
      notes.push(t('outbound.edit.warn-placeholder'));
    if (result.skippedReasons.size > 0)
      notes.push(t('outbound.edit.warn-on-hold'));
    setWarnings(notes);
    setDirty(true);
  };

  const onIssueInput = (value: string) => {
    setIssueText(value);
    const units = lensToUnits(toNumberOrNull(value), allocateIn());
    if (units != null) distribute(units);
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
      setErrorMessage(
        t('outbound.edit.save-failed', { error: result.message })
      );
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

  const columns = (): Column<DraftLine, never>[] => [
    {
      c: { key: 'batch' },
      header: t('outbound.edit.column.batch'),
      cell: info => info.getValue<string | null>() ?? '—',
    },
    {
      c: { key: 'expiryDate' },
      header: t('outbound.edit.column.expiry'),
      ...getDateCell(),
    },
    {
      c: { accessor: line => line.location?.code ?? '', id: 'location' },
      header: t('outbound.edit.column.location'),
    },
    ...(prefs()?.manageVvmStatusForStock
      ? [
          {
            c: {
              accessor: (line: DraftLine) => line.vvmStatus?.description ?? '',
              id: 'vvmStatus',
            },
            header: t('outbound.edit.column.vvm'),
          } as Column<DraftLine, never>,
        ]
      : []),
    {
      c: { key: 'sellPricePerPack' },
      header: t('outbound.edit.column.sell-price'),
      ...getCurrencyCell(),
    },
    {
      c: { key: 'packSize' },
      header: t('outbound.edit.column.pack-size'),
      ...getNumberCell(),
    },
    {
      c: { key: 'inStorePacks' },
      header: t('outbound.edit.column.in-store'),
      ...getNumberCell(),
    },
    {
      c: { key: 'availablePacks' },
      header: t('outbound.edit.column.available'),
      ...getNumberCell(),
    },
    {
      c: { accessor: line => isBarred(line), id: 'onHold' },
      header: t('outbound.edit.column.on-hold'),
      ...getBooleanCell(),
    },
    {
      // The one editable cell: packs issued from this batch (AC-I5).
      c: { key: 'numberOfPacks' },
      header: t('outbound.edit.column.issued'),
      meta: { align: 'right' },
      cell: info => {
        const line = info.row.original;
        return (
          <TextField
            label={t('outbound.edit.column.issued')}
            hideLabel
            size="small"
            type="number"
            min="0"
            max={String(line.availablePacks)}
            disabled={isBarred(line)}
            value={line.numberOfPacks || ''}
            onInput={e =>
              setPacks(line.id, toNumberOrNull(e.currentTarget.value))
            }
          />
        );
      },
    },
  ];

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size="large"
      testId="add-item-modal"
      title={
        editMode()
          ? t('outbound.edit.edit-title')
          : t('outbound.edit.add-title')
      }
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
            {t('common.cancel')}
          </Button>
          <Button
            icon={<CheckIcon />}
            data-testid="dialog-button-ok"
            disabled={!item() || !dirty()}
            loading={saving()}
            onClick={onOk}
          >
            {t('common.ok')}
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
              {t('common.ok-and-next')}
            </Button>
          </Show>
        </>
      }
    >
      {/* Item row: the catalogue lookup (locked in edit mode) + unit. */}
      <Combobox<ItemOption>
        label={t('outbound.edit.item')}
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
          <span>
            <span data-testid="item-option-code">{option.code}</span>{' '}
            <span data-testid="item-option-name">{option.name}</span>
          </span>
        )}
        value={item()?.id ?? ''}
        disabled={editMode() || saving()}
        inputTestId="item-search-input"
        placeholder={t('outbound.create.placeholder')}
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

      {/* Issue row: "Available: N unit" + the issue quantity + allocate-in. */}
      <Show when={item()}>
        <div
          style={{
            display: 'flex',
            'align-items': 'end',
            gap: 'var(--space-4)',
            'margin-block': 'var(--space-3)',
          }}
        >
          <span>
            {t('outbound.edit.available', {
              count: formatNumber(availableUnits()),
              unit: unitName(),
            })}
          </span>
          <TextField
            label={t('outbound.edit.issue')}
            size="small"
            inputmode="decimal"
            value={issueText()}
            disabled={saving()}
            onInput={e => onIssueInput(e.currentTarget.value)}
          />
          <Select
            label={t('outbound.edit.allocate-in')}
            size="sm"
            value={
              allocateIn().kind === 'units'
                ? 'units'
                : `packs-${(allocateIn() as { size: number }).size}`
            }
            options={[
              { value: 'units', label: t('outbound.edit.units') },
              ...distinctPackSizes().map(size => ({
                value: `packs-${size}`,
                label: t('outbound.edit.packs-of', { size }),
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
        </div>

        {/* Batch grid: one row per available batch, FEFO-ordered; barred rows
            disabled (AC-AL2 / AC-AL8). */}
        <DataTable
          columns={columns()}
          rows={draft}
          rowKey={line => line.id}
          loading={loadingLines()}
          showFullScreen={false}
          rowDimmed={line => isBarred(line)}
          emptyMessage={t('outbound.edit.empty')}
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
            {t('outbound.edit.placeholder', {
              count: formatNumber(placeholderUnits()),
            })}
          </span>
          <span>
            {t('outbound.edit.total-units', {
              count: formatNumber(issuedUnits()),
            })}
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
          <Alert severity="info">{t('outbound.edit.zero-confirm')}</Alert>
        </Show>
      </Show>
    </Dialog>
  );
};
