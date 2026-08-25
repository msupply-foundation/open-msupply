import {
  createResource,
  createSignal,
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
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { TextField } from '../../../../ui/elements/inputs/TextField';
import { TextArea } from '../../../../ui/elements/inputs/TextArea';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { Select } from '../../../../ui/elements/selectors/Select';
import { Text } from '../../../../ui/elements/typography/Text';
import { createFocusTarget } from '../../../../ui/utils/createFocusTarget';
import {
  ItemSearch,
  fetchItemById,
  type ItemOption,
} from '../../../../domain/item';
import { expandAbbreviations } from '@/domain/directions';
import {
  UpsertPrescriptionOrderLine,
  OrderAbbreviations,
  OrderItemDirections,
} from './orderLineEdit.generated';
import type { PrescriptionOrderFieldsFragment } from '../prescriptionOrderDetail.generated';

// The line editor (spec/prescription-orders/ui-surface.md S4, AC-N1..N4):
// pick the item (advisory stock on hand beside the selection — never a
// block), set the quantity in units, and the directions (abbreviation entry +
// the item's canned directions + the expanded text). Editing an existing line
// keeps its item fixed — replace by delete + add. Past New the same surface
// is the read-only face (values shown, no save).

type Line = PrescriptionOrderFieldsFragment['lines']['nodes'][number];

export interface OrderLineEditModalProps {
  storeId: string;
  orderId: string;
  /** The line being edited; undefined = a new line. */
  line?: Line;
  /** The order is past New — the read-only face (AC-N5). */
  readOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const OrderLineEditModal: Component<OrderLineEditModalProps> = props => {
  const [item, setItem] = createSignal<ItemOption | null>(null);
  const [quantity, setQuantity] = createSignal<number | undefined>(
    props.line?.quantity
  );
  const [note, setNote] = createSignal(props.line?.note ?? '');
  const [abbrevEntry, setAbbrevEntry] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();

  const itemSearch = createFocusTarget();

  // The configured abbreviations (AC-N3) — fetched once per open.
  const [abbrevData] = createResource(async () => {
    const result = await graphqlFetch(OrderAbbreviations, {});
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
      const result = await graphqlFetch(OrderItemDirections, {
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
      UpsertPrescriptionOrderLine,
      {
        storeId: props.storeId,
        input: {
          id: props.line?.id ?? generateUUID(),
          prescriptionOrderId: props.orderId,
          itemId: chosenId,
          quantity: chosenQuantity,
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
      title={
        props.line ? (props.line.item?.name ?? '') : t('button.add-item')
      }
      testId="order-line-edit-modal"
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
      <FieldRow label={t('label.item')}>
        <Show
          when={!props.line}
          fallback={
            <Text variant="body">
              {props.line?.item
                ? `${props.line.item.code} — ${props.line.item.name}`
                : ''}
            </Text>
          }
        >
          <ItemSearch
            label={t('label.item')}
            hideLabel
            storeId={props.storeId}
            value={item()?.id}
            focusTarget={itemSearch}
            clearable={false}
            onSelect={setItem}
          />
        </Show>
      </FieldRow>
      {/* Advisory stock on hand (AC-N4): informs, never blocks — an
          out-of-stock item still saves. */}
      <Show when={chosenItem()}>
        {chosen => (
          <FieldRow label={t('label.available-soh')}>
            <Text variant="body" data-testid="available-stock-note">
              {t('label.available-quantity', {
                number: formatNumber(chosen().availableUnits),
                unitName: chosen().unitName ?? t('label.units'),
              })}
            </Text>
          </FieldRow>
        )}
      </Show>
      <FieldRow label={t('label.quantity')}>
        <NumberField
          label={t('label.quantity')}
          hideLabel
          data-testid="quantity-field"
          value={quantity()}
          min={0}
          disabled={props.readOnly}
          onChange={value => setQuantity(value ?? undefined)}
        />
      </FieldRow>
      <Show when={!props.readOnly}>
        <FieldRow label={t('label.abbreviation')}>
          <TextField
            label={t('label.abbreviation')}
            hideLabel
            width="compact"
            data-testid="abbreviation-field"
            value={abbrevEntry()}
            onInput={e => setAbbrevEntry(e.currentTarget.value)}
            onBlur={applyAbbreviation}
            onKeyDown={e => {
              if (e.key === 'Enter') applyAbbreviation();
            }}
          />
        </FieldRow>
        <Show when={itemDirections().length > 0}>
          <FieldRow label={t('placeholder.item-directions')}>
            <Select
              label={t('placeholder.item-directions')}
              hideLabel
              value=""
              options={itemDirections()
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map(direction => ({
                  value: direction.id,
                  label: direction.directions,
                }))}
              placeholder={t('placeholder.item-directions')}
              onValueChange={id => {
                const picked = itemDirections().find(
                  direction => direction.id === id
                );
                if (!picked) return;
                setNote(expandAbbreviations(picked.directions, abbreviations()));
              }}
            />
          </FieldRow>
        </Show>
      </Show>
      <FieldRow label={t('label.directions')}>
        <TextArea
          label={t('label.directions')}
          hideLabel
          data-testid="directions-field"
          rows={2}
          value={note()}
          disabled={props.readOnly}
          onInput={e => setNote(e.currentTarget.value)}
          onBlur={() => setNote(expandAbbreviations(note(), abbreviations()))}
        />
      </FieldRow>
    </Dialog>
  );
};
