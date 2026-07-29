import {
  createMemo,
  createResource,
  createSignal,
  Show,
  type Component,
} from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { TextArea } from '../../../../ui/elements/inputs/TextArea';
import { Select } from '../../../../ui/elements/selectors/Select';
import { Text } from '../../../../ui/elements/typography/Text';
import {
  DataTable,
  type Column,
} from '../../../../ui/elements/table/DataTable';
import {
  getExpiryDateCell,
  getNumberCell,
} from '../../../../ui/elements/table/tableHelpers';
import { getBooleanCell } from '../../../../ui/elements/table/BooleanCell';
import { ItemSearch } from '../../../../domain/item';
import { prescriptionPreferences } from '../../../../store/storeContext';
import { formatNumber } from '../../../../intl';
import {
  allocateUnits,
  buildSaveInput,
  canSave,
  clampPacks,
  draftIssuedUnits,
  seedDraftLines,
  type DraftLine,
} from './lineEditLogic';
import { expandAbbreviations } from './directions';
import {
  Abbreviations,
  PrescriptionEditLines,
  SavePrescriptionItemLines,
  type PrescriptionEditLinesResult,
} from './prescriptionLineEdit.generated';

// The prescription line editor (spec/prescriptions/ui-surface.md S4 — the
// D53 modal replacing the real app's full-page route): item lookup (locked in
// edit mode, existing items excluded in add mode), the allocation editor body
// with the prescription deltas — partial packs (AC-A1), no placeholder,
// nothing allocated on open (AC-A2) — the preference-gated prescribed
// quantity (AC-Q1–Q3), and the directions block (AC-R1–R3). Save is the item
// set-save (AC-I7): every rejection is non-typed (contract wire trap), shown
// in-dialog. OK & next (add mode) saves then reopens on a fresh item.

export interface PrescriptionLineEditModalProps {
  storeId: string;
  invoiceId: string;
  /** The item to open on (edit mode); undefined = add mode (item search). */
  initialItemId?: string;
  /**
   * The opened item's label (code + name) from the row — so the locked item
   * search shows its name IMMEDIATELY on re-open, before the batch-grid fetch
   * (which carries the full item info) resolves.
   */
  initialItem?: { id: string; code: string; name: string };
  /** Items already dispensed — excluded from the add-mode picker (FL3). */
  existingItemIds: string[];
  onClose: () => void;
  /** A save landed — the detail refetches. */
  onSaved: () => void;
}

export const PrescriptionLineEditModal: Component<
  PrescriptionLineEditModalProps
> = props => (
  // Mounted fresh per open (the stocktakes modal shape): state seeds once.
  <Body {...props} />
);

type ItemInfo = NonNullable<
  PrescriptionEditLinesResult['items']['nodes']
>[number];

const Body = (props: PrescriptionLineEditModalProps) => {
  const prefs = prescriptionPreferences;

  const [itemId, setItemId] = createSignal(props.initialItemId);
  const isEdit = props.initialItemId != null;
  // The two named focus destinations, the same rule the outbound editor
  // follows: nothing picked → the item lookup; an item loaded → Issue, the
  // quantity the user came to type. Add mode opens on the lookup; in edit mode
  // it is locked to the row's item, so the open lands on Issue instead
  // (ui-surface S4, overriding ui-standards › accessibility › keyboard's
  // "a dialog focuses itself, not its first field").
  const itemSearch = createFocusTarget();
  const issueField = createFocusTarget();

  const [lines, setLines] = createStore<DraftLine[]>([]);
  const [itemInfo, setItemInfo] = createSignal<ItemInfo>();
  const [prescribedQuantity, setPrescribedQuantity] = createSignal<number>();
  const [note, setNote] = createSignal('');
  const [abbrevEntry, setAbbrevEntry] = createSignal('');
  const [issueUnits, setIssueUnits] = createSignal<number>();
  const [shortfall, setShortfall] = createSignal(0);
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string>();
  // The allocate-in lens: units, or doses for a vaccine item under the
  // preference (AC-AL7 via stock-allocation; prescriptions has no pack lens).
  const [lens, setLens] = createSignal<'units' | 'doses'>('units');

  // The item's draft grid + info, fetched when an item is chosen — nothing
  // allocates on open (AC-A2); the grid just renders. Read non-suspending so
  // the open modal never remounts (kdd/solid-reactivity-pitfalls).
  const [gridData] = createResource(itemId, async id => {
    const result = await graphqlFetch(PrescriptionEditLines, {
      storeId: props.storeId,
      itemId: id,
      invoiceId: props.invoiceId,
    });
    if (result.kind !== 'success') return undefined;
    const draft = result.data.draftStockOutLines;
    const item = result.data.items.nodes[0];
    setItemInfo(item);
    setLines(
      reconcile(seedDraftLines(draft.draftLines, prefs(), new Date()), {
        key: 'id',
      })
    );
    setPrescribedQuantity(draft.prescribedQuantity ?? undefined);
    setNote(draft.note ?? '');
    setIssueUnits(undefined);
    setShortfall(0);
    setDirty(false);
    // Land ready to type: with the item's grid in hand, Issue is the next
    // field. Armed here rather than gated on a load flag — Issue is inert
    // while the fetch is in flight, and the handle's frame runs after this
    // promise settles and Solid has re-rendered the enabled field.
    issueField.focus();
    return result.data;
  });

  // The abbreviation dictionary (AC-R1), fetched once per open.
  const [abbrevData] = createResource(async () => {
    const result = await graphqlFetch(Abbreviations, {});
    return result.kind === 'success' ? result.data.abbreviations : undefined;
  });

  const unitName = () => itemInfo()?.unitName ?? t('label.unit');
  const dosesMode = () =>
    lens() === 'doses' && (itemInfo()?.isVaccine ?? false);
  const dosesPerUnit = () => Math.max(itemInfo()?.doses ?? 1, 1);
  const showDosesLens = () =>
    (itemInfo()?.isVaccine ?? false) && prefs().manageVaccinesInDoses;

  const allocatedUnits = () => draftIssuedUnits(lines);
  const availableUnits = () =>
    lines.reduce(
      (sum, line) =>
        line.barred.length > 0
          ? sum
          : sum + line.availablePacks * line.packSize,
      0
    );

  // Typing an issue quantity distributes FEFO with partial packs (AC-A1);
  // the doses lens converts before distributing (AC-AL7).
  const allocate = (value: number | undefined) => {
    setIssueUnits(value);
    if (value == null) return;
    const requestedUnits = dosesMode() ? value / dosesPerUnit() : value;
    const { packsById, shortfallUnits } = allocateUnits(lines, requestedUnits);
    setLines(
      reconcile(
        lines.map(line => ({
          ...line,
          numberOfPacks: packsById.get(line.id) ?? line.numberOfPacks,
        })),
        { key: 'id' }
      )
    );
    setShortfall(shortfallUnits);
    setDirty(true);
  };

  // A manual per-row entry, clamped 0…available (AC-I5 — the client is the
  // only negative guard, and auto-pick raises the stakes).
  const setRowPacks = (id: string, value: number | undefined) => {
    const index = lines.findIndex(line => line.id === id);
    if (index < 0) return;
    setLines(
      index,
      'numberOfPacks',
      clampPacks(value, lines[index].availablePacks)
    );
    setShortfall(0);
    setDirty(true);
  };

  const applyAbbreviation = () => {
    const entry = abbrevEntry().trim();
    if (!entry) return;
    setNote(expandAbbreviations(entry, abbrevData.latest ?? []));
    setAbbrevEntry('');
    setDirty(true);
  };

  const directionsDisabled = () => allocatedUnits() <= 0;

  const saveEnabled = () =>
    canSave({
      itemChosen: itemId() != null,
      dirty: dirty(),
      allocatedUnits: allocatedUnits(),
      prescribedQuantity: prescribedQuantity(),
    });

  const save = async (): Promise<boolean> => {
    const id = itemId();
    if (!id || saving()) return false;
    setSaving(true);
    setSaveError(undefined);
    // Every set-save rejection is non-typed (contract wire trap) — opt into
    // the raw errors and show them in-dialog with input preserved.
    const result = await graphqlFetch(
      SavePrescriptionItemLines,
      {
        storeId: props.storeId,
        input: buildSaveInput(
          props.invoiceId,
          id,
          lines,
          prescribedQuantity(),
          note()
        ),
      },
      { returnGraphqlErrors: true }
    );
    setSaving(false);
    if (result.kind === 'success') {
      props.onSaved();
      return true;
    }
    setSaveError(
      result.kind === 'graphqlError'
        ? result.message
        : t('error.something-wrong')
    );
    return false;
  };

  const onOk = async () => {
    if (await save()) props.onClose();
  };
  // OK & next (add mode): the same save, then a fresh item for rapid entry.
  const onOkNext = async () => {
    if (!(await save())) return;
    setItemId(undefined);
    setItemInfo(undefined);
    setLines(reconcile([]));
    setPrescribedQuantity(undefined);
    setNote('');
    setIssueUnits(undefined);
    setShortfall(0);
    setDirty(false);
    // Back to the empty picker, so the caret goes back with it and the next
    // item is typed straight in.
    itemSearch.focus();
  };

  const columns = createMemo((): Column<DraftLine, never>[] => {
    const vaccine = itemInfo()?.isVaccine ?? false;
    const cols: Column<DraftLine, never>[] = [
      { c: { key: 'batch' }, header: () => t('label.batch') },
      {
        c: { key: 'expiryDate' },
        header: () => t('label.expiry'),
        ...getExpiryDateCell(),
      },
    ];
    if (
      vaccine &&
      (prefs().manageVvmStatusForStock || prefs().sortByVvmStatusThenExpiry)
    )
      cols.push({
        c: {
          accessor: line => line.vvmStatus?.description ?? '',
          id: 'vvmStatus',
        },
        header: () => t('label.vvm-status'),
      });
    if (vaccine && prefs().manageVaccinesInDoses)
      cols.push({
        c: { accessor: () => dosesPerUnit(), id: 'dosesPerUnit' },
        header: () => t('label.doses-per-unit'),
        ...getNumberCell(),
      });
    else
      cols.push({
        c: { key: 'packSize' },
        header: () => t('label.pack-size'),
        ...getNumberCell(),
      });
    cols.push(
      {
        c: {
          accessor: line => line.inStorePacks * line.packSize,
          id: 'unitsInStock',
        },
        header: () => t('label.units-in-stock', { unit: unitName() }),
        ...getNumberCell(),
      },
      {
        c: {
          accessor: line => line.availablePacks * line.packSize,
          id: 'unitsAvailable',
        },
        header: () => t('label.units-available', { unit: unitName() }),
        ...getNumberCell(),
      },
      {
        c: {
          accessor: line => line.numberOfPacks * line.packSize,
          id: 'unitsIssued',
        },
        header: () => t('label.units-issued', { unit: unitName() }),
        cell: info => {
          const line = info.row.original;
          return (
            <NumberField
              label={t('label.units-issued', { unit: unitName() })}
              hideLabel
              size="small"
              value={line.numberOfPacks * line.packSize}
              min={0}
              max={line.availablePacks * line.packSize}
              disabled={line.barred.length > 0}
              onChange={units =>
                setRowPacks(
                  line.id,
                  units == null ? undefined : units / line.packSize
                )
              }
            />
          );
        },
      },
      {
        c: {
          accessor: line =>
            line.stockLineOnHold || (line.location?.onHold ?? false),
          id: 'onHold',
        },
        header: () => t('label.on-hold'),
        ...getBooleanCell({ display: 'dot', label: t('label.on-hold') }),
      }
    );
    return cols;
  });

  return (
    <Dialog
      open
      size="large"
      initialFocus={isEdit ? undefined : itemSearch}
      onClose={props.onClose}
      testId="add-item-modal"
      title={isEdit ? t('heading.edit-line') : t('heading.add-item')}
      actionsLead={
        <Show when={saveError()}>
          <Alert severity="error" testId="prescription-line-error">
            {saveError()}
          </Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            data-testid="dialog-button-ok"
            disabled={!saveEnabled()}
            loading={saving()}
            onClick={() => void onOk()}
          >
            {t('button.ok')}
          </Button>
          {/* Hidden until a valid entry exists; never in edit mode (the
              outbound S4 footer matrix, reused by D53). */}
          <Show when={!isEdit && saveEnabled()}>
            <Button
              data-testid="dialog-button-next-and-ok"
              loading={saving()}
              onClick={() => void onOkNext()}
            >
              {t('button.ok-and-next')}
            </Button>
          </Show>
        </>
      }
    >
      <FieldRow label={t('label.item')}>
        <ItemSearch
          label={t('label.item')}
          hideLabel
          storeId={props.storeId}
          focusTarget={itemSearch}
          value={itemId()}
          // Prefer the full item once the grid fetch lands; until then fall
          // back to the row's own label so a re-opened line shows its item
          // name immediately (not a blank locked box).
          selectedItem={(() => {
            const item = itemInfo();
            if (item) return { id: item.id, code: item.code, name: item.name };
            return props.initialItem;
          })()}
          excludeItemIds={props.existingItemIds}
          disabled={isEdit}
          onSelect={item => item && setItemId(item.id)}
        />
      </FieldRow>

      <Show when={itemId()}>
        <Text variant="body">
          {t('label.available')}:{' '}
          {formatNumber(
            dosesMode() ? availableUnits() * dosesPerUnit() : availableUnits()
          )}{' '}
          {dosesMode() ? t('label.doses') : unitName()}
        </Text>

        <FieldRow label={t('label.issue')}>
          <NumberField
            label={t('label.issue')}
            hideLabel
            data-testid="issue-field"
            ref={issueField.ref}
            value={issueUnits()}
            min={0}
            decimalLimit={0}
            disabled={gridData.loading}
            onChange={allocate}
          />
          <Show
            when={showDosesLens()}
            fallback={<Text variant="body">{unitName()}</Text>}
          >
            <Select
              label={t('label.pack-size')}
              hideLabel
              value={lens()}
              options={[
                { value: 'units', label: t('label.units') },
                { value: 'doses', label: t('label.doses') },
              ]}
              onValueChange={value =>
                setLens(value === 'doses' ? 'doses' : 'units')
              }
            />
          </Show>
        </FieldRow>

        <Show when={prefs().editPrescribedQuantity}>
          <FieldRow label={t('label.prescribed-quantity')}>
            <NumberField
              label={t('label.prescribed-quantity')}
              hideLabel
              data-testid="prescribed-quantity-field"
              value={prescribedQuantity()}
              min={0}
              decimalLimit={0}
              onChange={value => {
                setPrescribedQuantity(value);
                setDirty(true);
                // Entering the prescribed quantity also drives allocation of
                // the same quantity (ui-surface S4).
                if (value != null && value > 0) allocate(value);
              }}
            />
          </FieldRow>
        </Show>

        <Show
          when={lines.length > 0}
          fallback={
            <Show when={!gridData.loading}>
              <Alert severity="info">{t('messages.no-stock-available')}</Alert>
            </Show>
          }
        >
          <DataTable
            columns={columns()}
            rows={[...lines]}
            rowKey={line => line.id}
            rowState={line => (line.barred.length > 0 ? 'disabled' : undefined)}
            loading={gridData.loading}
          />
        </Show>

        {/* The shortfall banner (stock-allocation § reporting — nothing
            narrows silently; the prescription has no placeholder). */}
        <Show when={shortfall() > 0}>
          <Alert severity="warning" testId="prescription-shortfall-warning">
            {t('messages.prescription-shortfall', {
              allocated: formatNumber(allocatedUnits()),
              requested: formatNumber(allocatedUnits() + shortfall()),
            })}
          </Alert>
        </Show>

        {/* Directions (AC-R1–R3): unavailable until something is allocated. */}
        <Show
          when={!directionsDisabled()}
          fallback={
            <Text variant="bodySmall">
              {t('messages.cannot-add-directions')}
            </Text>
          }
        >
          <FieldRow label={t('label.abbreviation')}>
            <TextField
              label={t('label.abbreviation')}
              hideLabel
              data-testid="abbreviation-field"
              value={abbrevEntry()}
              onInput={e => setAbbrevEntry(e.currentTarget.value)}
              onBlur={applyAbbreviation}
              onKeyDown={e => {
                if (e.key === 'Enter') applyAbbreviation();
              }}
            />
          </FieldRow>
          <FieldRow label={t('placeholder.item-directions')}>
            <Select
              label={t('placeholder.item-directions')}
              hideLabel
              value=""
              options={(itemInfo()?.itemDirections ?? [])
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map(direction => ({
                  value: direction.id,
                  label: direction.directions,
                }))}
              placeholder={
                (itemInfo()?.itemDirections?.length ?? 0) === 0
                  ? t('message.no-directions')
                  : undefined
              }
              onValueChange={id => {
                const chosen = itemInfo()?.itemDirections?.find(
                  direction => direction.id === id
                );
                if (!chosen) return;
                setNote(
                  expandAbbreviations(
                    chosen.directions,
                    abbrevData.latest ?? []
                  )
                );
                setDirty(true);
              }}
            />
          </FieldRow>
          <FieldRow label={t('label.directions')}>
            <TextArea
              label={t('label.directions')}
              hideLabel
              width="full"
              rows={2}
              value={note()}
              onInput={e => {
                setNote(e.currentTarget.value);
                setDirty(true);
              }}
            />
          </FieldRow>
        </Show>
      </Show>
    </Dialog>
  );
};
