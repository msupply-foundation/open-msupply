import {
  createResource,
  createSignal,
  Show,
  createMemo,
  type JSX,
} from 'solid-js';
import { graphqlFetch } from '../../../api/graphql';
import { t } from '../../../intl';
import { formatNumber } from '../../../intl/formatNumber';
import { localisedDate, localisedTime } from '../../../intl/formatDateTime';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { ConfirmDialog } from '../../../ui/elements/feedback/ConfirmDialog';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { NumberField } from '../../../ui/elements/inputs/NumberField';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { DataTable, type Column } from '../../../ui/elements/table/DataTable';
import { LocationSelect } from '../../../domain/location';
import { SelectReportModal } from '../../../domain/reports';
import {
  PlusCircleIcon,
  XCircleIcon,
  SaveIcon,
  PrinterIcon,
  ArrowRightIcon,
} from '../../../ui/icons';
import { hasPermission } from '../../../store/storeContext';
import { runInsertRepack } from '../stockApi';
import { repackNewPacks, isWholePacks } from '../stockCalc';
import { fetchStockLocations, locationsForItem } from '../stockLocations';
import {
  RepacksByStockLine,
  type StockLineDetailFragment,
  type RepacksByStockLineResult,
} from './stockLine.generated';

// The repack modal (spec/stock S5, FL6). Review this line's repack history and
// create a repack (split N packs into a new line at a new pack size, optionally
// a new location). Save is disabled until packs + new pack size are set;
// fractional-pack / below-zero rejections surface as messages. A full repack
// (all packs) offers navigation to the new line. Export/Print generates the
// repack report for the selected/saved repack (owned by reporting).
//
// The "created by a repack" source-batch note (spec/stock S5 header) is omitted:
// finding the repack that CREATED this line is not directly queryable (the
// history lists repacks FROM a line, not the one that produced it).

type RepackNode =
  RepacksByStockLineResult['repacksByStockLine']['nodes'][number];

export interface RepackModalProps {
  open: boolean;
  storeId: string;
  line: StockLineDetailFragment;
  onClose: () => void;
  onRepacked: () => void;
  onNavigateToLine: (stockLineId: string) => void;
}

export const RepackModal = (props: RepackModalProps): JSX.Element => (
  <Show when={props.open} keyed>
    <RepackContent
      storeId={props.storeId}
      line={props.line}
      onClose={props.onClose}
      onRepacked={props.onRepacked}
      onNavigateToLine={props.onNavigateToLine}
    />
  </Show>
);

const RepackContent = (props: {
  storeId: string;
  line: StockLineDetailFragment;
  onClose: () => void;
  onRepacked: () => void;
  onNavigateToLine: (stockLineId: string) => void;
}): JSX.Element => {
  const canRepack = () => hasPermission('CREATE_REPACK');

  const [creating, setCreating] = createSignal(false);
  const [numberToRepack, setNumberToRepack] = createSignal<
    number | undefined
  >();
  const [newPackSize, setNewPackSize] = createSignal<number | undefined>();
  const [newLocation, setNewLocation] = createSignal<{
    id: string;
    code: string;
    name: string;
  } | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | undefined>();
  // The repack invoice currently shown / just saved — enables Export/Print.
  const [selectedInvoiceId, setSelectedInvoiceId] = createSignal<string>();
  const [printOpen, setPrintOpen] = createSignal(false);
  // Full-repack navigation prompt: holds the new line id to move to.
  const [fullRepackNewLineId, setFullRepackNewLineId] = createSignal<string>();

  const [repacksData, { refetch }] = createResource(
    () => props.line.id,
    async stockLineId => {
      const result = await graphqlFetch(RepacksByStockLine, {
        storeId: props.storeId,
        stockLineId,
      });
      if (result.kind !== 'success') return undefined;
      return result.data.repacksByStockLine;
    }
  );

  const [allLocations] = createResource(
    () => props.storeId,
    fetchStockLocations
  );
  const locations = () =>
    locationsForItem(
      allLocations.latest ?? [],
      props.line.item.restrictedLocationTypeId
    );

  // Newest-first by the repack's verified time (spec/stock rules › repack
  // history).
  const repacks = (): RepackNode[] =>
    [...(repacksData.latest?.nodes ?? [])].sort((a, b) =>
      a.datetime < b.datetime ? 1 : -1
    );

  const available = () => props.line.availableNumberOfPacks;

  // The resulting new-pack count: packs × old size ÷ new size. Whole packs only
  // (spec/stock rules › repack — fractional is rejected).
  const newPacks = createMemo(() => {
    const n = numberToRepack();
    const size = newPackSize();
    if (n == null || size == null) return undefined;
    return repackNewPacks(n, props.line.packSize, size);
  });
  const isFractional = () => {
    const p = newPacks();
    return p !== undefined && !isWholePacks(p);
  };
  const exceedsAvailable = () => (numberToRepack() ?? 0) > available();

  const canSave = () =>
    creating() &&
    (numberToRepack() ?? 0) > 0 &&
    (newPackSize() ?? 0) > 0 &&
    !isFractional() &&
    !exceedsAvailable() &&
    !saving();

  const startNew = () => {
    setCreating(true);
    setSelectedInvoiceId(undefined);
    setNumberToRepack(undefined);
    setNewPackSize(undefined);
    setNewLocation(null);
    setError(undefined);
  };

  const selectRepack = (row: RepackNode) => {
    setCreating(false);
    setSelectedInvoiceId(row.invoice.id);
    setError(undefined);
  };

  const onSave = async () => {
    if (!canSave()) return;
    setSaving(true);
    setError(undefined);
    const isFull = (numberToRepack() ?? 0) === available();
    const outcome = await runInsertRepack(props.storeId, {
      stockLineId: props.line.id,
      numberOfPacks: numberToRepack() ?? 0,
      newPackSize: newPackSize() ?? 0,
      newLocationId: newLocation()?.id ?? null,
    });
    setSaving(false);
    if (!outcome) return;
    if (outcome.kind === 'error') {
      setError(outcome.message);
      return;
    }
    // Success: reflect the new repack, refresh history + the underlying line.
    setSelectedInvoiceId(outcome.data.invoice.id);
    setCreating(false);
    void refetch();
    props.onRepacked();
    if (isFull && outcome.data.newStockLineId) {
      // All packs repacked — offer navigation to the new line (spec AC-R7).
      setFullRepackNewLineId(outcome.data.newStockLineId);
    }
  };

  const columns = (): Column<RepackNode, never>[] => [
    {
      c: { accessor: r => r.datetime, id: 'date' },
      header: t('label.date'),
      cell: info => localisedDate(info.row.original.datetime),
    },
    {
      c: { accessor: r => r.datetime, id: 'time' },
      header: t('label.time'),
      meta: { align: 'right' },
      cell: info => localisedTime(info.row.original.datetime),
    },
    {
      c: { accessor: r => r.to.packSize, id: 'packSize' },
      header: t('label.pack-size'),
      meta: { align: 'right' },
      cell: info => formatNumber(info.row.original.to.packSize),
    },
    {
      c: { accessor: r => r.to.numberOfPacks, id: 'numberOfPacks' },
      header: t('label.number-of-packs'),
      meta: { align: 'right' },
      cell: info => formatNumber(info.row.original.to.numberOfPacks),
    },
    {
      c: { accessor: r => r.to.location?.code ?? '', id: 'location' },
      header: t('label.location'),
      cell: info => info.row.original.to.location?.code ?? '—',
    },
  ];

  const arrow = (
    <ArrowRightIcon
      aria-hidden="true"
      style={{ color: 'var(--text-secondary)' }}
    />
  );

  return (
    <>
      <Dialog
        open
        onClose={props.onClose}
        dismissable={!saving()}
        size="large"
        testId="repack-modal"
        title={t('heading.repack-details')}
        headerActions={
          <Show when={canRepack()}>
            <Button
              variant="secondary"
              icon={<PlusCircleIcon />}
              data-testid="repack-new-button"
              onClick={startNew}
            >
              {t('button.new')}
            </Button>
          </Show>
        }
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
              icon={<SaveIcon />}
              loading={saving()}
              disabled={!canSave()}
              data-testid="dialog-button-save"
              onClick={() => void onSave()}
            >
              {t('button.save')}
            </Button>
            <Button
              variant="secondary"
              icon={<PrinterIcon />}
              disabled={!selectedInvoiceId()}
              data-testid="repack-print-button"
              onClick={() => setPrintOpen(true)}
            >
              {t('button.export-or-print')}
            </Button>
          </>
        }
      >
        <div
          style={{
            display: 'flex',
            'flex-direction': 'column',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              'flex-direction': 'column',
              gap: 'var(--space-1)',
            }}
          >
            <strong>{props.line.itemName}</strong>
            <span
              style={{
                color: 'var(--text-secondary)',
                'font-size': 'var(--text-sm)',
              }}
            >
              {props.line.item.code}
            </span>
          </div>

          {/* History (spec/stock S5). Empty state offers a create affordance. */}
          <Show
            when={repacks().length > 0}
            fallback={
              <div style={{ color: 'var(--text-secondary)' }}>
                {t('messages.no-repacks')}
              </div>
            }
          >
            <DataTable
              columns={columns()}
              rows={repacks()}
              rowKey={r => r.id}
              onRowClick={selectRepack}
              showFullScreen={false}
              emptyMessage={t('messages.no-repacks')}
            />
          </Show>

          {/* Edit panel — from (this line) → to (the new line). */}
          <Show when={creating()}>
            <div
              style={{
                display: 'grid',
                'grid-template-columns': '1fr auto 1fr',
                gap: 'var(--space-4)',
                'align-items': 'center',
                'border-top': '1px solid var(--gray-light)',
                'padding-top': 'var(--space-4)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: 'var(--space-2)',
                }}
              >
                <FieldRow label={t('label.packs-available')}>
                  <span>{formatNumber(available())}</span>
                </FieldRow>
                <FieldRow label={t('label.packs-to-repack')}>
                  <NumberField
                    label={t('label.packs-to-repack')}
                    hideLabel
                    data-testid="repack-number-of-packs"
                    min={0}
                    max={available()}
                    decimalLimit={2}
                    value={numberToRepack()}
                    error={
                      exceedsAvailable()
                        ? t('error.stock-reduced-below-zero')
                        : undefined
                    }
                    onChange={setNumberToRepack}
                  />
                </FieldRow>
                <FieldRow label={t('label.pack-size')}>
                  <span>{formatNumber(props.line.packSize)}</span>
                </FieldRow>
                <FieldRow label={t('label.location')}>
                  <span>{props.line.location?.code ?? '—'}</span>
                </FieldRow>
              </div>

              {arrow}

              <div
                style={{
                  display: 'flex',
                  'flex-direction': 'column',
                  gap: 'var(--space-2)',
                }}
              >
                <FieldRow label={t('label.new-number-of-packs')}>
                  <span data-testid="repack-new-number-of-packs">
                    {newPacks() === undefined
                      ? '—'
                      : formatNumber(newPacks() as number)}
                  </span>
                </FieldRow>
                <FieldRow label={t('label.new-pack-size')}>
                  <NumberField
                    label={t('label.new-pack-size')}
                    hideLabel
                    data-testid="repack-new-pack-size"
                    min={1}
                    decimalLimit={2}
                    value={newPackSize()}
                    error={
                      isFractional()
                        ? t('error.repack-cannot-be-fractional')
                        : undefined
                    }
                    onChange={setNewPackSize}
                  />
                </FieldRow>
                <FieldRow label={t('label.new-location')}>
                  <LocationSelect
                    label={t('label.new-location')}
                    hideLabel
                    locations={locations()}
                    loading={allLocations.loading}
                    value={newLocation()?.id}
                    placeholder={t('label.none')}
                    onChange={l =>
                      setNewLocation(
                        l ? { id: l.id, code: l.code, name: l.name } : null
                      )
                    }
                  />
                </FieldRow>
              </div>
            </div>
          </Show>
        </div>
      </Dialog>

      {/* Export/Print the selected/saved repack (report owned by reporting). */}
      <Show when={printOpen() && selectedInvoiceId()}>
        {invoiceId => (
          <SelectReportModal
            context="REPACK"
            dataId={invoiceId()}
            onClose={() => setPrintOpen(false)}
          />
        )}
      </Show>

      {/* Full repack → offer navigation to the new line (spec AC-R7). */}
      <ConfirmDialog
        open={!!fullRepackNewLineId()}
        title={t('heading.are-you-sure')}
        message={t('messages.all-packs-repacked')}
        confirmLabel={t('button.ok')}
        cancelLabel={t('button.cancel')}
        onConfirm={() => {
          const id = fullRepackNewLineId();
          if (id) props.onNavigateToLine(id);
        }}
        onClose={() => setFullRepackNewLineId(undefined)}
      />
    </>
  );
};
