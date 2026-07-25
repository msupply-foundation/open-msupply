import { createSignal, Show, type Component } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { t } from '../intl';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { Button } from '../ui/elements/buttons/Button';
import { IconButton } from '../ui/elements/buttons/IconButton';
import { TextField } from '../ui/elements/inputs/TextField';
import { NumberField } from '../ui/elements/inputs/NumberField';
import { CurrencyField } from '../ui/elements/inputs/CurrencyField';
import { DateField } from '../ui/elements/inputs/DateField';
import { Select } from '../ui/elements/selectors/Select';
import { ItemSearch } from '../domain/item';
import {
  DataTable,
  type CardGroup,
  type Column,
} from '../ui/elements/table/DataTable';
import { getNumberCell } from '../ui/elements/table/tableHelpers';
import {
  resolveTableConfig,
  type Band,
  type LayeredConfig,
  type TableConfig,
  type TableConfigKey,
} from '../ui/elements/table/tableConfig';
import { createMediaQuery } from '../ui/utils/createMediaQuery';
import { mediaQuery } from '../ui/styles/breakpoints';
import {
  CopyIcon,
  InfoIcon,
  MessageSquareIcon,
  PlusCircleIcon,
  StockIcon,
  TrashIcon,
  XCircleIcon,
} from '../ui/icons';
// Dev-only import of the real line row type — the batches this modal edits are
// the clicked item's rows from the detail table (kdd/type-safety). Showcase
// scaffolding is DCE'd from prod.
import type { InboundLineFragment } from '../sections/inbound-shipments/detail/inboundShipmentDetail.generated';

// The item a row click opens the editor on — the identity fields the selector
// and the read-only Unit field need. Mirrors the ChosenItem shape the real
// InboundShipmentLineEditModal builds, trimmed to what the showcase surfaces.
export type EditItem = {
  id: string;
  code: string;
  name: string;
  unitName: string | null;
};

export interface LineEditModalProps {
  open: boolean;
  onClose: () => void;
  /** The item the click opened on (row click → UPDATE mode). */
  item: EditItem | null;
  /** That item's existing rows (one card per row), seeded into the draft. */
  lines: InboundLineFragment[];
}

// The showcase item search needs a storeId, but this open is UPDATE mode (the
// selector is disabled), so it never runs a fetch; a placeholder id is enough.
const SHOWCASE_STORE_ID = 'showcase';

// One editable batch. This is the manual-shipment default field set (matching
// the detail table the modal opens from) — the pref-gated fields (auth / VVM /
// doses / donor) are out of scope for the reference example.
type DraftBatch = {
  id: string;
  isNew: boolean;
  deleted: boolean;
  batch: string;
  numberOfPacks: number;
  packSize: number;
  shippedNumberOfPacks: number | undefined;
  shippedPackSize: number | undefined;
  expiryDate: string | null;
  costPricePerPack: number;
  sellPricePerPack: number;
  locationCode: string | null;
  manufactureDate: string | null;
  manufacturerName: string | null;
  campaignName: string | null;
  volumePerPack: number;
  note: string;
};

// Static option lists standing in for the real modal's GraphQL-backed pickers
// (LocationVolumeSelect / NameSearch / CampaignOrProgramSelect) — the showcase
// has no store, so these are seeded from the detail table's own sample data so
// the picked values round-trip. Value is what a row stores; label is what shows.
const LOCATION_OPTIONS = [
  { value: 'A.01', label: 'A.01 · Aisle A · Bay 01' },
  { value: 'A.02', label: 'A.02 · Aisle A · Bay 02' },
  { value: 'COLD.1', label: 'COLD.1 · Cold room · Shelf 1' },
  { value: 'B.11', label: 'B.11 · Aisle B · Bay 11' },
];
const MANUFACTURER_OPTIONS = [
  { value: 'Cipla', label: 'Cipla' },
  { value: 'Teva', label: 'Teva' },
  { value: 'Sun Pharma', label: 'Sun Pharma' },
  { value: 'Aurobindo', label: 'Aurobindo' },
];
const CAMPAIGN_OPTIONS = [
  { value: 'Measles 2026', label: 'Measles 2026' },
  { value: 'COVID booster', label: 'COVID booster' },
];

const fromLine = (line: InboundLineFragment): DraftBatch => ({
  id: line.id,
  isNew: false,
  deleted: false,
  batch: line.batch ?? '',
  numberOfPacks: line.numberOfPacks,
  packSize: line.packSize,
  shippedNumberOfPacks: line.shippedNumberOfPacks ?? undefined,
  shippedPackSize: line.shippedPackSize ?? undefined,
  expiryDate: line.expiryDate ?? null,
  costPricePerPack: line.costPricePerPack,
  sellPricePerPack: line.sellPricePerPack,
  locationCode: line.location?.code ?? null,
  manufactureDate: line.manufactureDate ?? null,
  manufacturerName: line.manufacturer?.name ?? null,
  campaignName: line.campaign?.name ?? null,
  volumePerPack: line.volumePerPack,
  note: line.note ?? '',
});

const emptyBatch = (packSize: number): DraftBatch => ({
  id: crypto.randomUUID(),
  isNew: true,
  deleted: false,
  batch: '',
  numberOfPacks: 0,
  packSize,
  shippedNumberOfPacks: undefined,
  shippedPackSize: undefined,
  expiryDate: null,
  costPricePerPack: 0,
  sellPricePerPack: 0,
  locationCode: null,
  manufactureDate: null,
  manufacturerName: null,
  campaignName: null,
  volumePerPack: 0,
  note: '',
});

// The card body groups (matching the real inbound/stocktake editors): batch is
// the always-shown primary panel; Pricing and Other are collapsed disclosures,
// each boxed (panel) with its own icon. Batch is the card HEADER identity
// (headerPosition: 'primary'), so it isn't itself a body group.
type GroupKey = 'batch' | 'pricing' | 'other';
const CARD_GROUPS: CardGroup<DraftBatch, GroupKey>[] = [
  {
    key: 'batch',
    labelKey: 'label.batch',
    icon: () => <StockIcon />,
    panel: true,
  },
  {
    key: 'pricing',
    labelKey: 'label.pricing',
    icon: () => <InfoIcon />,
    panel: true,
    disclosure: 'closed',
  },
  {
    key: 'other',
    labelKey: 'heading.other',
    icon: () => <MessageSquareIcon />,
    panel: true,
    disclosure: 'closed',
  },
];

// A dev-only Line Edit modal for the Detail-table showcase — the SAME assembly
// as the real InboundShipmentLineEditModal (kdd/stocktake-line-editing), meant
// as the reference example for Line Edit modals across the app: a large Dialog
// whose TITLE is the item selector, an "Add batch" affordance in the header,
// Cancel / OK & next / OK actions, and a card-only grouped DataTable body
// (batch panel + Pricing / Other disclosures). Card view at every width — no
// table view.
const Body: Component<LineEditModalProps> = props => {
  // Live draft, keyed by batch id so a splice can't desync a row from its slot
  // (matches the real editor). Seeded from the clicked item's existing rows.
  const [batches, setBatches] = createStore<DraftBatch[]>(
    props.lines.map(fromLine)
  );

  // Card-only config controller — the local resolveTableConfig stand-in the
  // showcase uses (createTableConfig is app/store glue, unavailable here). The
  // base band defaults to card view; compact already forces card, and with no
  // showCardToggle there's no way to a table view.
  const [layered, setLayered] = createSignal<LayeredConfig>({});
  const isCompact = createMediaQuery(mediaQuery.compact);
  const activeBand = (): Band => (isCompact() ? 'compact' : 'base');
  const config = () =>
    resolveTableConfig(activeBand(), {
      default: { base: { viewMode: 'card' } },
      user: layered(),
    });
  const setConfig = <K extends TableConfigKey>(key: K, value: TableConfig[K]) =>
    setLayered(current => ({
      ...current,
      [activeBand()]: { ...current[activeBand()], [key]: value },
    }));

  const indexById = (id: string) => batches.findIndex(b => b.id === id);
  const updateBatch = <F extends keyof DraftBatch>(
    id: string,
    field: F,
    value: DraftBatch[F]
  ) => {
    const index = indexById(id);
    if (index >= 0) setBatches(index, field, value as never);
  };

  const defaultPackSize = () => props.lines[0]?.packSize ?? 1;
  const addBatch = () =>
    setBatches(produce(d => d.push(emptyBatch(defaultPackSize()))));
  const duplicateBatch = (id: string) => {
    const newId = crypto.randomUUID();
    setBatches(
      produce(d => {
        const index = d.findIndex(b => b.id === id);
        if (index >= 0)
          d.splice(index + 1, 0, { ...d[index], id: newId, isNew: true });
      })
    );
  };
  const removeBatch = (id: string) => {
    const index = indexById(id);
    if (index < 0) return;
    // A new draft row splices out; an existing one is flagged deleted.
    if (batches[index].isNew) setBatches(produce(d => d.splice(index, 1)));
    else setBatches(index, 'deleted', true);
  };

  // The rows the table shows: the draft minus soft-deleted batches.
  const rows = (): DraftBatch[] => batches.filter(b => !b.deleted);

  const unitLabel = () => props.item?.unitName ?? t('label.units');

  // ---- Columns: one set, split across groups; batch is the anchor. ----
  const columns = (): Column<DraftBatch, never, GroupKey>[] => [
    {
      c: { key: 'batch' },
      header: t('label.batch'),
      meta: { headerPosition: 'primary' },
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
      cardGroup: 'batch',
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
            decimalLimit={2}
            onChange={v => updateBatch(b.id, 'numberOfPacks', v ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'packSize' },
      header: t('label.pack-size'),
      cardGroup: 'batch',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.pack-size')}
            hideLabel
            size="small"
            value={b.packSize}
            min={0}
            decimalLimit={2}
            onChange={v => updateBatch(b.id, 'packSize', v ?? 1)}
          />
        );
      },
    },
    {
      c: { key: 'shippedNumberOfPacks' },
      header: t('label.shipped-number-of-packs'),
      cardGroup: 'batch',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.shipped-number-of-packs')}
            hideLabel
            size="small"
            value={b.shippedNumberOfPacks}
            min={0}
            decimalLimit={2}
            onChange={v => updateBatch(b.id, 'shippedNumberOfPacks', v)}
          />
        );
      },
    },
    {
      c: { key: 'shippedPackSize' },
      header: t('label.shipped-pack-size'),
      cardGroup: 'batch',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.shipped-pack-size')}
            hideLabel
            size="small"
            value={b.shippedPackSize}
            min={0}
            decimalLimit={2}
            onChange={v => updateBatch(b.id, 'shippedPackSize', v)}
          />
        );
      },
    },
    // Units received (computed) — packs received × pack size (spec S4).
    {
      c: { id: 'unitsReceived' },
      header: t('label.units-received', { unit: unitLabel() }),
      cardGroup: 'batch',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.units-received', { unit: unitLabel() })}
            hideLabel
            size="small"
            value={b.numberOfPacks * b.packSize}
            decimalLimit={2}
            disabled
          />
        );
      },
    },
    {
      c: { key: 'expiryDate' },
      header: t('label.expiry'),
      cardGroup: 'batch',
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
    {
      c: { key: 'costPricePerPack' },
      header: t('label.pack-cost-price'),
      cardGroup: 'pricing',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <CurrencyField
            label={t('label.pack-cost-price')}
            hideLabel
            size="small"
            value={b.costPricePerPack}
            onChange={v => updateBatch(b.id, 'costPricePerPack', v ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'sellPricePerPack' },
      header: t('label.pack-sell-price'),
      cardGroup: 'pricing',
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
    // Line total (computed) — packs received × pack cost price (spec S4).
    {
      c: { id: 'lineTotal' },
      header: t('label.line-total'),
      cardGroup: 'pricing',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <CurrencyField
            label={t('label.line-total')}
            hideLabel
            size="small"
            value={b.numberOfPacks * b.costPricePerPack}
            disabled
          />
        );
      },
    },
    {
      c: { id: 'location' },
      header: t('label.location'),
      cardGroup: 'other',
      cell: info => {
        const b = info.row.original;
        return (
          <Select
            label={t('label.location')}
            hideLabel
            value={b.locationCode ?? undefined}
            options={LOCATION_OPTIONS}
            onValueChange={v => updateBatch(b.id, 'locationCode', v)}
          />
        );
      },
    },
    {
      c: { key: 'manufactureDate' },
      header: t('label.manufacture-date'),
      cardGroup: 'other',
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
    {
      c: { id: 'manufacturer' },
      header: t('label.manufacturer'),
      cardGroup: 'other',
      cell: info => {
        const b = info.row.original;
        return (
          <Select
            label={t('label.manufacturer')}
            hideLabel
            value={b.manufacturerName ?? undefined}
            options={MANUFACTURER_OPTIONS}
            onValueChange={v => updateBatch(b.id, 'manufacturerName', v)}
          />
        );
      },
    },
    {
      c: { id: 'campaignOrProgram' },
      header: t('label.campaign'),
      cardGroup: 'other',
      cell: info => {
        const b = info.row.original;
        return (
          <Select
            label={t('label.campaign')}
            hideLabel
            value={b.campaignName ?? undefined}
            options={CAMPAIGN_OPTIONS}
            onValueChange={v => updateBatch(b.id, 'campaignName', v)}
          />
        );
      },
    },
    {
      c: { key: 'volumePerPack' },
      header: t('label.volume-per-pack'),
      cardGroup: 'other',
      ...getNumberCell(),
      cell: info => {
        const b = info.row.original;
        return (
          <NumberField
            label={t('label.volume-per-pack')}
            hideLabel
            size="small"
            value={b.volumePerPack}
            min={0}
            decimalLimit={10}
            onChange={v => updateBatch(b.id, 'volumePerPack', v ?? 0)}
          />
        );
      },
    },
    {
      c: { key: 'note' },
      header: t('label.note'),
      cardGroup: 'other',
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
      meta: { headerPosition: 'badge', align: 'right' },
      cell: info => {
        const b = info.row.original;
        return (
          <>
            <IconButton
              bordered
              size="small"
              icon={<CopyIcon />}
              label={t('label.duplicate-batch')}
              onClick={() => duplicateBatch(b.id)}
            />
            <IconButton
              bordered
              size="small"
              variant="danger"
              icon={<TrashIcon />}
              label={t('label.delete-batch')}
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
      onClose={props.onClose}
      size="large"
      testId="line-edit-modal"
      title={
        // Update mode: the selector shows the clicked item, disabled — so add
        // and edit read as the same surface (matches the real editor).
        <ItemSearch
          label={t('label.item')}
          hideLabel
          storeId={SHOWCASE_STORE_ID}
          value={props.item?.id}
          selectedItem={props.item ?? undefined}
          disabled
          onSelect={() => {}}
        />
      }
      ariaLabel={t('label.edit-line')}
      headerActions={
        <Button
          icon={<PlusCircleIcon />}
          data-testid="add-batch-button"
          onClick={addBatch}
        >
          {t('label.add-batch')}
        </Button>
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
            variant="secondary"
            data-testid="dialog-button-next-and-ok"
            onClick={props.onClose}
          >
            {t('button.ok-and-next')}
          </Button>
          <Button data-testid="dialog-button-ok" onClick={props.onClose}>
            {t('button.ok')}
          </Button>
        </>
      }
    >
      {/* Read-only Unit field follows the selector (spec S4). */}
      <Show when={props.item?.unitName}>
        <TextField
          label={t('label.unit')}
          value={props.item?.unitName ?? ''}
          disabled
        />
      </Show>
      <DataTable
        columns={columns()}
        rows={rows()}
        rowKey={b => b.id}
        cardGroups={CARD_GROUPS}
        showFullScreen={false}
        config={config()}
        setConfig={setConfig}
        emptyMessage={t('label.add-batch')}
      />
    </Dialog>
  );
};

export const LineEditModal: Component<LineEditModalProps> = props => (
  // A fresh mount per open, keyed on the item id, so switching items rebuilds
  // the draft (kdd/solid-reactivity-pitfalls — no leaked state).
  <Show when={props.open && (props.item?.id ?? 'add')} keyed>
    <Body {...props} />
  </Show>
);
