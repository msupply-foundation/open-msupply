import { createResource, createSignal, Show, type Component } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { IconButton } from '../../../../ui/elements/buttons/IconButton';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { CurrencyField } from '../../../../ui/elements/inputs/CurrencyField';
import { DateField } from '../../../../ui/elements/inputs/DateField';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import {
  DataTable,
  type Column,
  type TabAndCardGroup,
  ALL_TABS,
} from '../../../../ui/elements/table/DataTable';
import { getNumberCell } from '../../../../ui/elements/table/tableHelpers';
import { createTableConfig } from '../../../../api/createTableConfig';
import {
  CopyIcon,
  InfoIcon,
  MessageSquareIcon,
  PlusCircleIcon,
  StockIcon,
  TrashIcon,
  XCircleIcon,
} from '../../../../ui/icons';
import { ItemSearch, type ItemOption } from '../../../../domain/item';
import { LocationSelect, type Location } from '../../../../domain/location';
import { VvmStatusSelect } from '../../../../domain/vvmStatus';
import { NameSearch, type NameOption } from '../../../../domain/name';
import { Select } from '../../../../ui/elements/selectors/Select';
import {
  InboundShipmentLines,
  type InboundLineFragment,
  type BatchInboundShipmentVariables,
} from '../inboundShipmentDetail.generated';
import { PurchaseOrderLines } from '../inboundShipmentLookups.generated';
import { runInboundBatch } from '../inboundShipmentUpdate';

export interface LineEditPrefs {
  vvm: boolean;
  donor: boolean;
}

export interface InboundShipmentLineEditModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  invoiceId: string;
  isExternal: boolean;
  /** Present ⇒ EDIT mode (that item's batches); absent ⇒ ADD mode. */
  initialItemId?: string;
  /** Items already on the shipment — excluded from the add-item search. */
  existingItemIds: string[];
  /**
   * On a PO-linked shipment, add mode picks a purchase-order LINE (not an item
   * search) — a line insert must cite one (spec AC-E3). Set to the shipment's
   * purchaseOrderId to switch the add selector to the PO-line picker.
   */
  purchaseOrderId?: string;
  /** Cost price is read-only for a store-linked or PO-linked supplier. */
  costLocked: boolean;
  locations: Location[];
  prefs: LineEditPrefs;
  onSaved: () => void;
  /**
   * "OK & next" in EDIT mode: after saving, ask the parent to advance to the
   * next item on the shipment (the parent owns the row list). Undefined ⇒ close
   * after save.
   */
  onRequestNext?: (currentItemId: string) => void;
}

// The inbound-shipment line editor (spec S4): the single surface for entering a
// batch's received detail. A modal over the detail view, editing ALL of one
// item's batches at once — each batch is one row / one card. Like the stocktake
// line editor (kdd/stocktake-line-editing), the body is the grouped DataTable:
// ONE column set gives two faces — tabs (Batch / Pricing / Other) in table
// view, sections in card view. Add mode opens on an item search (manual/
// transfer) or a purchase-order-line picker (PO-linked — a line must cite one);
// edit mode loads the item's existing lines. Each open is a fresh mount (keyed
// Show) so state never leaks between items. "OK & next" advances to the next
// item on the shipment (edit mode) or resets to add-another (add mode).
type DraftBatch = {
  id: string;
  isNew: boolean;
  deleted: boolean;
  numberOfPacks: number;
  packSize: number;
  batch: string;
  expiryDate: string | null;
  manufactureDate: string | null;
  locationId: string | null;
  costPricePerPack: number;
  sellPricePerPack: number;
  note: string;
  vvmStatusId: string | null;
  donorId: string | null;
  donorName: string | null;
  shippedNumberOfPacks: number | undefined;
  shippedPackSize: number | undefined;
  volumePerPack: number;
};

const emptyBatch = (): DraftBatch => ({
  id: crypto.randomUUID(),
  isNew: true,
  deleted: false,
  numberOfPacks: 0,
  packSize: 1,
  batch: '',
  expiryDate: null,
  manufactureDate: null,
  locationId: null,
  costPricePerPack: 0,
  sellPricePerPack: 0,
  note: '',
  vvmStatusId: null,
  donorId: null,
  donorName: null,
  shippedNumberOfPacks: undefined,
  shippedPackSize: undefined,
  volumePerPack: 0,
});

const fromLine = (line: InboundLineFragment): DraftBatch => ({
  id: line.id,
  isNew: false,
  deleted: false,
  numberOfPacks: line.numberOfPacks,
  packSize: line.packSize,
  batch: line.batch ?? '',
  expiryDate: line.expiryDate ?? null,
  manufactureDate: line.manufactureDate ?? null,
  locationId: line.locationId ?? null,
  costPricePerPack: line.costPricePerPack,
  sellPricePerPack: line.sellPricePerPack,
  note: line.note ?? '',
  vvmStatusId: line.vvmStatusId ?? null,
  donorId: line.donor?.id ?? null,
  donorName: line.donor?.name ?? null,
  shippedNumberOfPacks: line.shippedNumberOfPacks ?? undefined,
  shippedPackSize: line.shippedPackSize ?? undefined,
  volumePerPack: line.volumePerPack,
});

// The tabs / card-groups for the grouped table (matching the stocktake editor).
// Batch is the ALL_TABS anchor (shows in every tab), not its own group.
type GroupKey = 'batch' | 'pricing' | 'other';
const TABS_AND_CARD_GROUPS: TabAndCardGroup<GroupKey>[] = [
  { key: 'batch', labelKey: 'label.batch', icon: () => <StockIcon /> },
  { key: 'pricing', labelKey: 'label.pricing', icon: () => <InfoIcon /> },
  {
    key: 'other',
    labelKey: 'heading.other',
    icon: () => <MessageSquareIcon />,
  },
];

export const InboundShipmentLineEditModal: Component<
  InboundShipmentLineEditModalProps
> = props => (
  // A fresh mount per open, keyed on the item (or 'add') so switching items
  // rebuilds the draft (kdd/solid-reactivity-pitfalls — no leaked state).
  <Show when={props.open && (props.initialItemId ?? 'add')} keyed>
    <Body {...props} />
  </Show>
);

// Only id/code/name are needed for display + the insert itemId; a lighter type
// than ItemOption so a line-seeded item (no unitName/totalUnits) fits too.
type ChosenItem = { id: string; code: string; name: string };

const Body: Component<InboundShipmentLineEditModalProps> = props => {
  const [item, setItem] = createSignal<ChosenItem | null>(null);
  const [batches, setBatches] = createStore<DraftBatch[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const tableConfig = createTableConfig({ tableId: 'inbound-line-edit' });

  // Edit mode: load the item's existing lines and seed the draft. Add mode
  // loads nothing until an item is chosen.
  const [loaded] = createResource(async () => {
    if (!props.initialItemId) return true;
    const result = await graphqlFetch(InboundShipmentLines, {
      storeId: props.storeId,
      filter: {
        invoiceId: { equalTo: props.invoiceId },
        itemId: { equalTo: props.initialItemId },
      },
      page: { first: 200 },
    });
    if (
      result.kind === 'success' &&
      result.data.invoiceLines.__typename === 'InvoiceLineConnector'
    ) {
      const lines = result.data.invoiceLines.nodes;
      setBatches(lines.map(fromLine));
      const first = lines[0];
      if (first)
        setItem({
          id: first.itemId,
          code: first.itemCode,
          name: first.itemName,
        });
    }
    return true;
  });

  const chooseItem = (option: ItemOption | null) => {
    setItem(
      option ? { id: option.id, code: option.code, name: option.name } : null
    );
    if (option) setBatches([emptyBatch()]);
  };

  // PO-linked add mode: pick a purchase-order LINE instead of an item search
  // (spec AC-E3 — a PO-linked line insert must cite an order line). The picked
  // line supplies the item, the cited line id, and the requested pack size.
  const [poLineId, setPoLineId] = createSignal<string>();
  const [poLines] = createResource(
    () => props.purchaseOrderId && !props.initialItemId,
    async () => {
      const result = await graphqlFetch(PurchaseOrderLines, {
        storeId: props.storeId,
        purchaseOrderId: props.purchaseOrderId!,
      });
      return result.kind === 'success' &&
        result.data.purchaseOrder.__typename === 'PurchaseOrderNode'
        ? result.data.purchaseOrder.lines.nodes
        : [];
    }
  );
  const choosePoLine = (id: string) => {
    const line = (poLines() ?? []).find(l => l.id === id);
    if (!line) return;
    setPoLineId(id);
    setItem({ id: line.item.id, code: line.item.code, name: line.item.name });
    setBatches([{ ...emptyBatch(), packSize: line.requestedPackSize || 1 }]);
  };

  // Draft edits are keyed by batch id (like the stocktake editor) so a filter/
  // splice can't desync a row from its store slot.
  const indexById = (id: string) => batches.findIndex(b => b.id === id);
  const updateBatch = <F extends keyof DraftBatch>(
    id: string,
    field: F,
    value: DraftBatch[F]
  ) => {
    const index = indexById(id);
    if (index >= 0) setBatches(index, field, value as never);
  };

  const addBatch = () => setBatches(produce(d => d.push(emptyBatch())));
  const duplicateBatch = (id: string) =>
    setBatches(
      produce(d => {
        const index = d.findIndex(b => b.id === id);
        if (index >= 0)
          d.splice(index + 1, 0, {
            ...d[index],
            id: crypto.randomUUID(),
            isNew: true,
          });
      })
    );
  const removeBatch = (id: string) => {
    const index = indexById(id);
    if (index < 0) return;
    // A new draft row splices out; an existing line is flagged for a delete op.
    if (batches[index].isNew) setBatches(produce(d => d.splice(index, 1)));
    else setBatches(index, 'deleted', true);
  };

  // The rows the table shows: the draft minus soft-deleted batches.
  const rows = (): DraftBatch[] => batches.filter(b => !b.deleted);

  const buildBatch = (): BatchInboundShipmentVariables['input'] | null => {
    const chosen = item();
    if (!chosen) return null;
    const insert = batches
      .filter(b => b.isNew && !b.deleted)
      .map(b => ({
        id: b.id,
        invoiceId: props.invoiceId,
        itemId: chosen.id,
        packSize: b.packSize,
        numberOfPacks: b.numberOfPacks,
        costPricePerPack: b.costPricePerPack,
        sellPricePerPack: b.sellPricePerPack,
        batch: b.batch || undefined,
        location: { value: b.locationId },
        expiryDate: b.expiryDate ?? undefined,
        manufactureDate: b.manufactureDate ?? undefined,
        note: b.note || undefined,
        vvmStatusId: b.vvmStatusId ?? undefined,
        donorId: b.donorId ?? undefined,
        shippedNumberOfPacks: b.shippedNumberOfPacks,
        shippedPackSize: b.shippedPackSize,
        volumePerPack: b.volumePerPack,
        // A PO-linked line must cite the order line it fills.
        purchaseOrderLineId: props.purchaseOrderId ? poLineId() : undefined,
      }));
    const update = batches
      .filter(b => !b.isNew && !b.deleted)
      .map(b => ({
        id: b.id,
        packSize: b.packSize,
        numberOfPacks: b.numberOfPacks,
        // Cost price is only sent when editable — a store-linked / PO-linked
        // shipment locks it (server rejects a changed value; a no-op is fine).
        ...(props.costLocked ? {} : { costPricePerPack: b.costPricePerPack }),
        sellPricePerPack: b.sellPricePerPack,
        batch: b.batch || undefined,
        location: { value: b.locationId },
        expiryDate: { value: b.expiryDate },
        manufactureDate: { value: b.manufactureDate },
        note: { value: b.note || null },
        vvmStatusId: { value: b.vvmStatusId },
        donorId: { value: b.donorId },
        shippedNumberOfPacks: b.shippedNumberOfPacks,
        shippedPackSize: b.shippedPackSize,
        volumePerPack: b.volumePerPack,
      }));
    const del = batches
      .filter(b => !b.isNew && b.deleted)
      .map(b => ({ id: b.id }));
    return {
      insertInboundShipmentLines: insert,
      updateInboundShipmentLines: update,
      deleteInboundShipmentLines: del,
    };
  };

  const save = async (): Promise<boolean> => {
    const input = buildBatch();
    if (!input) return false;
    setSaving(true);
    setErrorMessage(undefined);
    const outcome = await runInboundBatch(
      props.storeId,
      props.isExternal,
      input
    );
    setSaving(false);
    if (!outcome) return false;
    if (outcome.errors.size > 0) {
      setErrorMessage([...outcome.errors.values()][0]);
      return false;
    }
    if (outcome.applied) props.onSaved();
    return true;
  };

  const onOk = async () => {
    if (await save()) props.onClose();
  };
  // OK & next: EDIT mode → save, then ask the parent to advance to the next
  // item on the shipment (it owns the row list); ADD mode → save, then reset to
  // add another item.
  const onOkNext = async () => {
    if (!(await save())) return;
    const currentItemId = props.initialItemId;
    if (currentItemId && props.onRequestNext) {
      props.onRequestNext(currentItemId);
      return;
    }
    setItem(null);
    setPoLineId(undefined);
    setBatches([]);
  };

  const noItemYet = () => !item();

  // ---- Columns: one set, split across groups; batch is the anchor. ----
  const columns = (): Column<DraftBatch, never, GroupKey>[] => [
    {
      c: { key: 'batch' },
      header: t('label.batch'),
      tabsAndCardGroups: ALL_TABS,
      meta: { card: { region: 'primary', showLabel: true } },
      cell: info => {
        const b = info.row.original;
        return (
          <TextField
            label={t('label.batch')}
            hideLabel
            size="small"
            value={b.batch}
            onInput={e => updateBatch(b.id, 'batch', e.currentTarget.value)}
          />
        );
      },
    },
    {
      c: { key: 'numberOfPacks' },
      header: t('label.pack-quantity'),
      tabsAndCardGroups: ['batch'],
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.pack-quantity')}
            hideLabel
            size="small"
            value={b.numberOfPacks}
            min={0}
            onChange={v => updateBatch(b.id, 'numberOfPacks', v ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'packSize' },
      header: t('label.pack-size'),
      tabsAndCardGroups: ['batch'],
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.pack-size')}
            hideLabel
            size="small"
            value={b.packSize}
            min={1}
            onChange={v => updateBatch(b.id, 'packSize', v ?? 1)}
          />
        );
      },
    },
    {
      c: { key: 'expiryDate' },
      header: t('label.expiry'),
      tabsAndCardGroups: ['batch'],
      cell: info => {
        const b = info.row.original;
        return (
          <DateField
            label={t('label.expiry')}
            hideLabel
            value={b.expiryDate}
            onChange={v => updateBatch(b.id, 'expiryDate', v)}
          />
        );
      },
    },
    // VVM status (Batch tab) — gated by the manage-VVM preference.
    ...(props.prefs.vvm
      ? [
          {
            c: { id: 'vvmStatus' },
            header: t('label.vvm-status'),
            tabsAndCardGroups: ['batch'],
            cell: info => {
              const b = info.row.original;
              return (
                <VvmStatusSelect
                  label={t('label.vvm-status')}
                  hideLabel
                  value={b.vvmStatusId ?? undefined}
                  onChange={s =>
                    updateBatch(b.id, 'vvmStatusId', s?.id ?? null)
                  }
                />
              );
            },
          } satisfies Column<DraftBatch, never, GroupKey>,
        ]
      : []),
    {
      c: { key: 'costPricePerPack' },
      header: t('label.pack-cost-price'),
      tabsAndCardGroups: ['pricing'],
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <CurrencyField
            label={t('label.pack-cost-price')}
            hideLabel
            size="small"
            value={b.costPricePerPack}
            disabled={props.costLocked}
            onChange={v => updateBatch(b.id, 'costPricePerPack', v ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'sellPricePerPack' },
      header: t('label.pack-sell-price'),
      tabsAndCardGroups: ['pricing'],
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <CurrencyField
            label={t('label.pack-sell-price')}
            hideLabel
            size="small"
            value={b.sellPricePerPack}
            onChange={v => updateBatch(b.id, 'sellPricePerPack', v ?? 0)}
          />
        );
      },
    },
    {
      c: { id: 'location' },
      header: t('label.location'),
      tabsAndCardGroups: ['other'],
      cell: info => {
        const b = info.row.original;
        return (
          <LocationSelect
            label={t('label.location')}
            hideLabel
            locations={props.locations}
            value={b.locationId ?? undefined}
            onChange={loc => updateBatch(b.id, 'locationId', loc?.id ?? null)}
          />
        );
      },
    },
    {
      c: { key: 'manufactureDate' },
      header: t('label.manufacture-date'),
      tabsAndCardGroups: ['other'],
      cell: info => {
        const b = info.row.original;
        return (
          <DateField
            label={t('label.manufacture-date')}
            hideLabel
            value={b.manufactureDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={v => updateBatch(b.id, 'manufactureDate', v)}
          />
        );
      },
    },
    // Donor (Other tab) — gated by the donor-tracking preference.
    ...(props.prefs.donor
      ? [
          {
            c: { id: 'donor' },
            header: t('label.donor'),
            tabsAndCardGroups: ['other'],
            cell: info => {
              const b = info.row.original;
              return (
                <NameSearch
                  label={t('label.donor')}
                  hideLabel
                  storeId={props.storeId}
                  role="donor"
                  selected={
                    b.donorId
                      ? ({
                          id: b.donorId,
                          name: b.donorName ?? '',
                          code: '',
                          isSupplier: false,
                          isDonor: true,
                          isOnHold: false,
                          isStore: false,
                        } satisfies NameOption)
                      : undefined
                  }
                  onSelect={d => {
                    updateBatch(b.id, 'donorId', d?.id ?? null);
                    updateBatch(b.id, 'donorName', d?.name ?? null);
                  }}
                />
              );
            },
          } satisfies Column<DraftBatch, never, GroupKey>,
        ]
      : []),
    {
      c: { key: 'note' },
      header: t('label.note'),
      tabsAndCardGroups: ['other'],
      cell: info => {
        const b = info.row.original;
        return (
          <TextField
            label={t('label.note')}
            hideLabel
            size="small"
            value={b.note}
            onInput={e => updateBatch(b.id, 'note', e.currentTarget.value)}
          />
        );
      },
    },
    {
      c: { id: 'actions' },
      header: t('label.actions'),
      tabsAndCardGroups: ALL_TABS,
      meta: { card: { region: 'badge' }, align: 'right' },
      cell: info => {
        const b = info.row.original;
        return (
          <>
            <IconButton
              bordered
              size="small"
              icon={<CopyIcon />}
              label={t('label.duplicate-batch')}
              disabled={saving()}
              onClick={() => duplicateBatch(b.id)}
            />
            <IconButton
              bordered
              size="small"
              variant="danger"
              icon={<TrashIcon />}
              label={t('label.delete-batch')}
              disabled={saving()}
              onClick={() => removeBatch(b.id)}
            />
          </>
        );
      },
    },
  ];

  return (
    <Dialog
      open
      dismissable={!saving()}
      onClose={props.onClose}
      size="large"
      testId="add-item-modal"
      title={
        // On a PO-linked shipment, add mode picks a purchase-order line; every
        // other case (manual add, and edit mode) shows the item selector — in
        // edit mode disabled, so add and edit read as the same surface.
        props.purchaseOrderId && !props.initialItemId ? (
          <Select
            label={t('label.purchase-order')}
            value={poLineId()}
            onValueChange={choosePoLine}
            options={(poLines() ?? [])
              .filter(l => !props.existingItemIds.includes(l.item.id))
              .map(l => ({
                value: l.id,
                label: `#${l.lineNumber} ${l.item.name} (${l.item.code})`,
              }))}
          />
        ) : (
          <ItemSearch
            label={t('label.item')}
            hideLabel
            storeId={props.storeId}
            excludeItemIds={props.existingItemIds}
            value={item()?.id}
            selectedItem={item() ?? undefined}
            disabled={!!props.initialItemId}
            onSelect={chooseItem}
          />
        )
      }
      ariaLabel={t('button.add-item')}
      headerActions={
        <Show when={!noItemYet()}>
          <Button
            icon={<PlusCircleIcon />}
            data-testid="add-batch-button"
            onClick={addBatch}
          >
            {t('label.add-batch')}
          </Button>
        </Show>
      }
      actionsLead={
        <Show when={errorMessage()}>
          <Alert severity="error">{errorMessage()}</Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Show when={!noItemYet()}>
            <Button
              variant="secondary"
              data-testid="ok-and-next-button"
              loading={saving()}
              onClick={() => void onOkNext()}
            >
              {t('button.ok-and-next')}
            </Button>
            <Button
              data-testid="dialog-button-ok"
              loading={saving()}
              onClick={() => void onOk()}
            >
              {t('button.ok')}
            </Button>
          </Show>
        </>
      }
    >
      <Show when={!loaded.loading} fallback={<Spinner center />}>
        <Show
          when={!noItemYet()}
          fallback={
            <Alert severity="info">{t('messages.select-an-item')}</Alert>
          }
        >
          <DataTable
            columns={columns()}
            rows={rows()}
            rowKey={b => b.id}
            tabsAndCardGroups={TABS_AND_CARD_GROUPS}
            showFullScreen={false}
            config={tableConfig.config()}
            setConfig={tableConfig.setConfig}
            emptyMessage={t('label.add-batch')}
          />
        </Show>
      </Show>
    </Dialog>
  );
};
