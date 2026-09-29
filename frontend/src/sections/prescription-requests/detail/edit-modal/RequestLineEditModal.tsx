import {
  createEffect,
  createResource,
  createSignal,
  on,
  Show,
  type Component,
} from 'solid-js';
import { generateUUID } from '../../../../uuid';
import { t } from '../../../../intl';
import { formatNumber } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { gated } from '../../../../api/gated';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { TextArea } from '../../../../ui/elements/inputs/TextArea';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { Select } from '../../../../ui/elements/selectors/Select';
import { FormRow } from '../../../../ui/layout/Form/FormRow';
import styles from './RequestLineEditModal.module.css';
import { LabelledValue } from '../../../../ui/elements/typography/LabelledValue';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import {
  ItemSearch,
  fetchItemById,
  type ItemOption,
} from '../../../../domain/item';
import { expandAbbreviations } from '@/domain/directions';
import {
  UpsertPrescriptionRequestLine,
  RequestAbbreviations,
  RequestItemDirections,
} from './requestLineEdit.generated';
import type { PrescriptionRequestFieldsFragment } from '../prescriptionRequestDetail.generated';

// The line editor (spec/prescription-requests/ui-surface.md S4, AC-N1..N4):
// pick the item (advisory stock on hand beside the selection — never a
// block), set the quantity in units, and the directions (abbreviation entry +
// the item's canned directions + the expanded text). Editing an existing line
// keeps its item fixed — replace by delete + add. Past New the same surface
// is the read-only face (values shown, no save).

type Line = PrescriptionRequestFieldsFragment['lines']['nodes'][number];

export interface RequestLineEditModalProps {
  storeId: string;
  requestId: string;
  /** The line being edited; undefined = a new line. */
  line?: Line;
  /** The request is past New — the read-only face (AC-N5). */
  readOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const RequestLineEditModal: Component<
  RequestLineEditModalProps
> = props => {
  const [item, setItem] = createSignal<ItemOption | null>(null);
  // The editable fields seed from the line being edited. A signal initialiser
  // reads props ONCE and outside any tracking scope, so it would not notice a
  // different line arriving — today the parent mounts this keyed and it never
  // does, but that is the parent's business, not a property of this dialog.
  // Re-seed on the line's identity instead, so the two cannot drift apart.
  const [quantity, setQuantity] = createSignal<number | undefined>(
    props.line?.numberOfUnits
  );
  const [note, setNote] = createSignal(props.line?.note ?? '');
  createEffect(
    on(
      () => props.line,
      line => {
        setQuantity(line?.numberOfUnits);
        setNote(line?.note ?? '');
      },
      { defer: true }
    )
  );
  const [abbrevEntry, setAbbrevEntry] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();

  const itemSearch = createFocusTarget();

  // The configured abbreviations (AC-N3) — fetched once per open.
  const [abbrevData] = createResource(async () => {
    const result = await graphqlFetch(RequestAbbreviations, {});
    return result.kind === 'success' ? result.data.abbreviations : undefined;
  });
  const abbreviations = () => gated(abbrevData) ?? [];

  // An existing line's item, resolved with its live stock on hand — the same
  // advisory figure a fresh pick carries (AC-N4). Non-suspending: this
  // resource first fetches on the modal opening over a live screen.
  const [existingItem] = createResource(
    () => props.line?.itemId,
    itemId => fetchItemById(props.storeId, itemId)
  );
  const chosenItem = (): ItemOption | undefined =>
    item() ?? gated(existingItem);

  // The picked item's canned directions (rules § lines) — keyed on the
  // chosen item; empty until one is picked.
  const [directionsData] = createResource(
    () => chosenItem()?.id,
    async itemId => {
      const result = await graphqlFetch(RequestItemDirections, {
        storeId: props.storeId,
        itemId,
      });
      return result.kind === 'success'
        ? (result.data.items.nodes[0]?.itemDirections ?? [])
        : undefined;
    }
  );
  const itemDirections = () => gated(directionsData) ?? [];

  const applyAbbreviation = () => {
    const entry = abbrevEntry().trim();
    if (!entry) return;
    setNote(expandAbbreviations(entry, abbreviations()));
    setAbbrevEntry('');
  };

  const itemId = () => props.line?.itemId ?? item()?.id;
  const canSave = () =>
    !props.readOnly && !!itemId() && (quantity() ?? 0) > 0 && !busy();

  const save = async () => {
    const chosenId = itemId();
    const chosenQuantity = quantity();
    if (!canSave() || !chosenId || !chosenQuantity) return;
    setBusy(true);
    setError(undefined);
    // Rejections here are all generic (contract § wire traps) — shown
    // in-dialog with entries intact.
    const result = await graphqlFetch(
      UpsertPrescriptionRequestLine,
      {
        storeId: props.storeId,
        input: {
          id: props.line?.id ?? generateUUID(),
          prescriptionRequestId: props.requestId,
          itemId: chosenId,
          numberOfUnits: chosenQuantity,
          note: note().trim() || null,
        },
      },
      { returnGraphqlErrors: true }
    );
    setBusy(false);
    if (result.kind === 'success') {
      props.onSaved();
      props.onClose();
      return;
    }
    setError(
      result.kind === 'graphqlError'
        ? result.message
        : t('error.something-wrong')
    );
  };

  return (
    <Dialog
      open
      onClose={props.onClose}
      initialFocus={props.line ? undefined : itemSearch}
      title={props.line ? (props.line.item?.name ?? '') : t('button.add-item')}
      testId="request-line-edit-modal"
      actionsLead={
        <Show when={error()}>
          <Alert severity="error">{error()}</Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            confirms="cancel"
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          >
            {props.readOnly ? t('button.close') : t('button.cancel')}
          </Button>
          <Show when={!props.readOnly}>
            <Button
              confirms="plain"
              data-testid="dialog-button-ok"
              disabled={!canSave()}
              loading={busy()}
              onClick={() => void save()}
            >
              {t('button.save')}
            </Button>
          </Show>
        </>
      }
    >
      {/* Each field stands alone in the dialog's stacked body, so it wears
          the control's own label — the label-above form layout
          (kdd/form-layout), not an inline FieldRow. */}
      <Show
        when={!props.line}
        fallback={
          <LabelledValue variant="field" label={t('label.item')}>
            {props.line?.item
              ? `${props.line.item.code} — ${props.line.item.name}`
              : ''}
          </LabelledValue>
        }
      >
        <ItemSearch
          label={t('label.item')}
          storeId={props.storeId}
          value={item()?.id}
          focusTarget={itemSearch}
          clearable={false}
          // The whole of the store's catalogue: the prescriber's side carries
          // no program to narrow it by (issue #514). Dispensing still scopes
          // its own line editor to the prescription's program.
          onSelect={setItem}
        />
      </Show>
      {/* Advisory stock on hand (AC-N4): informs, never blocks — an
          out-of-stock item still saves. A read-only fact among editable
          fields, so it reads as a LabelledValue rather than a disabled input
          (kdd/form-layout). */}
      <Show when={chosenItem()}>
        {chosen => (
          <LabelledValue variant="field" label={t('label.available-soh')}>
            <span data-testid="available-stock-note">
              {t('label.available-quantity', {
                number: formatNumber(chosen().availableUnits),
                unitName: chosen().unitName ?? t('label.units'),
              })}
            </span>
          </LabelledValue>
        )}
      </Show>
      {/* The quantity is in UNITS (rules § lines), and which unit is item
          master data — so it rides the field as an end adornment rather than
          spending a row of the dialog on one word, exactly as dispensing's
          line editor carries it (PrescriptionLineEditModal § Issue). Falls
          back to the generic word before an item is picked, and never becomes
          a second entry field: nothing here converts between measures. */}
      <NumberField
        label={t('label.quantity')}
        data-testid="quantity-field"
        value={quantity()}
        min={0}
        disabled={props.readOnly}
        endAdornment={chosenItem()?.unitName ?? t('label.units')}
        onChange={value => setQuantity(value ?? undefined)}
      />
      {/* Directions, laid out as the prescription line editor lays them
          (PrescriptionLineEditModal): the abbreviation entry and the item's
          default-directions select share one row — the entry stays compact (an
          abbreviation is a few characters) and the select takes the rest, the
          pair wrapping intrinsically — with the expanded text below. The
          select renders even for an item with no canned directions: its own
          empty state says so, where hiding it moved the field below it. */}
      <Show when={!props.readOnly}>
        <FormRow class={styles.directionsEntryRow}>
          <TextField
            label={t('label.abbreviation')}
            class={styles.abbreviationField}
            data-testid="abbreviation-field"
            value={abbrevEntry()}
            onInput={e => setAbbrevEntry(e.currentTarget.value)}
            onBlur={applyAbbreviation}
            onKeyDown={e => {
              if (e.key === 'Enter') applyAbbreviation();
            }}
          />
          <Select
            label={t('placeholder.item-directions')}
            value=""
            options={itemDirections()
              .slice()
              .sort((a, b) => a.priority - b.priority)
              .map(direction => ({
                value: direction.id,
                label: direction.directions,
              }))}
            placeholder={
              itemDirections().length === 0
                ? t('message.no-directions')
                : t('label.select')
            }
            onValueChange={id => {
              const picked = itemDirections().find(
                direction => direction.id === id
              );
              if (!picked) return;
              setNote(expandAbbreviations(picked.directions, abbreviations()));
            }}
          />
        </FormRow>
      </Show>
      <TextArea
        label={t('label.directions')}
        data-testid="directions-field"
        rows={2}
        value={note()}
        disabled={props.readOnly}
        onInput={e => setNote(e.currentTarget.value)}
        onBlur={() => setNote(expandAbbreviations(note(), abbreviations()))}
      />
    </Dialog>
  );
};
