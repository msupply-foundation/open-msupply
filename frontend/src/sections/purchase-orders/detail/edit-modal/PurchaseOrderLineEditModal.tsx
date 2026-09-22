import { createMemo, createSignal, onCleanup, Show, type JSX } from 'solid-js';
import { generateUUID } from '@/uuid';
import { graphqlFetch } from '@/api/graphql';
import { t } from '@/intl';
import { formatNumber } from '@/intl/formatNumber';
import { formatCurrency } from '@/intl/currency';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { CurrencyField } from '@/ui/elements/inputs/CurrencyField';
import { TextField } from '@/ui/elements/inputs/TextField';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { DateField } from '@/ui/elements/inputs/DateField';
import { Select } from '@/ui/elements/selectors/Select';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import {
  CancelButton,
  DialogSaveButton,
  SaveAndNextButton,
} from '@/ui/elements/buttons/StandardButtons';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { ItemSearch, type ItemOption } from '@/domain/item';
import { NameSearch } from '@/domain/name';
import { lineCost } from '../purchaseOrderPricing';
import type { PurchaseOrderStatus } from '../../purchaseOrderStatus';
import type { PurchaseOrderDetailLineFragment } from '../purchaseOrderDetail.generated';
import {
  insertPurchaseOrderLine,
  updatePurchaseOrderLine,
} from '../purchaseOrderUpdate';
import { PurchaseOrderLineItemFacts } from './purchaseOrderLineEdit.generated';
import {
  draftFromLine,
  draftPacks,
  factsFromLine,
  insertInput,
  lineChanges,
  lineGates,
  newLineDraft,
  orderedElsewhere,
  packsEntered,
  packSizeEntered,
  packsLabelKey,
  PRICE_DECIMALS,
  repriced,
  requestedDateEntered,
  showsAdjustedUnits,
  type LineDraft,
  type LineFacts,
  type Prices,
} from './purchaseOrderLineEdit';
import styles from './PurchaseOrderLineEditModal.module.css';

// The line editor (spec/purchase-orders S10): one surface that both adds a
// line and edits one. Nothing is saved until the confirming action; an
// untouched line saves nothing; a refused save keeps the editor open with the
// refusal reported (rules § saving). Which fields are open in which state is
// purchaseOrderLineEdit.ts's — mirrored here because the line update has no
// order-state gate of its own (contract ⚠️), so the surface is the only thing
// keeping a Sent order's prices from being rewritten.

type Line = PurchaseOrderDetailLineFragment;

export interface PurchaseOrderLineEditModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  order: {
    id: string;
    status: PurchaseOrderStatus;
    currencyCode: string | undefined;
    requestedDeliveryDate: string | null | undefined;
  };
  /** The latest expected date among the order's lines — a new line's seed. */
  latestExpectedDate: string | undefined;
  /** How many lines the order has — a new line's number is the next. */
  lineCount: number;
  canAuthorise: boolean;
  /** An existing line → edit mode; omitted → add mode. */
  initialLine?: Line;
  /** Whether a line follows this one in the table's current order. */
  hasNext: (lineId: string) => boolean;
  /** The line after this one in the table's current order, paging if needed. */
  nextLine: (lineId: string) => Promise<Line | undefined>;
  /** A save landed — the parent re-reads the page, the set and the node. */
  onSaved: () => void;
}

// Keyed on the open identity so every open starts fresh; stepping on within
// one open is imperative (seed), not a prop change.
export const PurchaseOrderLineEditModal = (
  props: PurchaseOrderLineEditModalProps
): JSX.Element => (
  <Show when={props.open && (props.initialLine?.id ?? 'add')} keyed>
    {_key => <LineEditContent {...props} />}
  </Show>
);

const LINE_STATUSES = ['NEW', 'SENT', 'CLOSED'] as const;

const LineEditContent = (
  props: PurchaseOrderLineEditModalProps
): JSX.Element => {
  const [facts, setFacts] = createSignal<LineFacts>();
  const [initial, setInitial] = createSignal<LineDraft>();
  const [draft, setDraft] = createSignal<LineDraft>();
  const [saving, setSaving] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();
  // The id a new line will be created under — one per open.
  const newLineId = generateUUID();

  const itemSearch = createFocusTarget();
  const packsField = createFocusTarget();

  let disposed = false;
  onCleanup(() => (disposed = true));

  const isNew = () => !facts()?.lineId;
  const status = () => props.order.status;

  const patch = (change: Partial<LineDraft>) => {
    const current = draft();
    if (current) setDraft({ ...current, ...change });
  };

  // The one place a line becomes state — on open, on a picked item and on
  // Save & next.
  const seed = (nextFacts: LineFacts, born: LineDraft) => {
    setFacts(nextFacts);
    setInitial(born);
    setDraft(born);
    setErrorMessage(undefined);
  };
  if (props.initialLine)
    seed(factsFromLine(props.initialLine), draftFromLine(props.initialLine));

  // A picked item → the line it would become (rules § what a new line is born
  // as), with the item's own figures read live: its stock on hand now and its
  // units on order across the store's other purchase orders.
  const pickItem = async (item: ItemOption) => {
    setLoading(true);
    setErrorMessage(undefined);
    const result = await graphqlFetch(PurchaseOrderLineItemFacts, {
      storeId: props.storeId,
      itemId: item.id,
      orderId: props.order.id,
    });
    if (disposed) return;
    setLoading(false);
    if (result.kind !== 'success') return;
    const node = result.data.items.nodes[0];
    if (!node) return;
    seed(
      {
        lineNumber: props.lineCount + 1,
        status: 'NEW',
        itemId: node.id,
        itemCode: node.code,
        itemName: node.name,
        unitName: node.unitName ?? null,
        stockOnHand: node.stats.stockOnHand,
        unitsOrderedInOthers: result.data.unitsOrderedInOtherPurchaseOrders,
      },
      newLineDraft(node, {
        requestedDeliveryDate: props.order.requestedDeliveryDate,
        latestExpectedDate: props.latestExpectedDate,
      })
    );
    packsField.focus();
  };

  const gates = createMemo(() =>
    lineGates({
      status: status(),
      lineStatus: facts()?.status ?? 'NEW',
      isNew: isNew(),
      canAuthorise: props.canAuthorise,
    })
  );
  const closed = (open: boolean) => !open || saving();

  // Open small on a new line (the chooser alone), grow once an item is named
  // and never shrink back — the requisition editor's latch.
  const workingSize = createMemo<boolean>(
    prev => prev || facts() !== undefined,
    false
  );

  const setPrice = (field: keyof Prices, value: number | undefined) => {
    const current = draft();
    if (current) patch(repriced(field, { ...current, [field]: value ?? 0 }));
  };

  // True once the line is saved — or was never touched, which saves nothing
  // (rules § saving). False on a refusal, which is reported in place.
  const save = async (): Promise<boolean> => {
    const current = facts();
    const before = initial();
    const after = draft();
    if (!current || !before || !after) return false;
    let result;
    if (current.lineId) {
      const changes = lineChanges(before, after);
      if (!changes) return true;
      setSaving(true);
      result = await updatePurchaseOrderLine(props.storeId, {
        id: current.lineId,
        ...changes,
      });
    } else {
      setSaving(true);
      result = await insertPurchaseOrderLine(
        props.storeId,
        insertInput(newLineId, props.order.id, current, after)
      );
    }
    if (disposed) return false;
    setSaving(false);
    if (result.kind === 'saved') {
      setInitial(after);
      props.onSaved();
      return true;
    }
    setErrorMessage(
      result.kind === 'error' ? result.message : t('error.cant-save')
    );
    return false;
  };

  const onOk = () =>
    void save().then(ok => {
      if (ok) props.onClose();
    });

  // Save, then step to the next line in the table's current order — only once
  // the save has landed, so a refused change is never left behind.
  const onOkNext = () =>
    void (async () => {
      const lineId = facts()?.lineId;
      if (!lineId) return;
      if (!(await save())) return;
      const next = await props.nextLine(lineId);
      if (disposed) return;
      if (!next) return props.onClose();
      seed(factsFromLine(next), draftFromLine(next));
      packsField.focus();
    })();

  const currency = () => props.order.currencyCode;
  const money = (value: number) => formatCurrency(value, currency());

  return (
    <Dialog
      open
      onClose={props.onClose}
      dismissable={!saving()}
      size={workingSize() ? 'full' : 'auto'}
      widthRem={44}
      minBodyHeightRem={28}
      testId="purchase-order-line-edit-modal"
      // No visible title (spec S10) — the string stays the accessible name.
      title={isNew() ? t('button.add-item') : t('heading.edit-line')}
      titleHidden
      initialFocus={props.initialLine ? packsField : itemSearch}
      actionsLead={
        <Show when={errorMessage()}>
          {message => (
            <Alert severity="error" testId="purchase-order-line-error">
              {message()}
            </Alert>
          )}
        </Show>
      }
      actions={
        <>
          <CancelButton
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          />
          <DialogSaveButton
            data-testid="dialog-button-ok"
            disabled={!draft() || saving()}
            loading={saving()}
            onClick={onOk}
          />
          <Show when={props.initialLine}>
            {line => (
              <SaveAndNextButton
                data-testid="dialog-button-next-and-ok"
                disabled={
                  saving() || !props.hasNext(facts()?.lineId ?? line().id)
                }
                loading={saving()}
                onClick={onOkNext}
              />
            )}
          </Show>
        </>
      }
    >
      <div class={styles.top}>
        <ItemSearch
          label={t('label.item')}
          storeId={props.storeId}
          class={styles.itemSearch}
          width="full"
          // Items barred from ordering are kept out of the chooser (rules §
          // choosing the item).
          orderableOnly
          focusTarget={itemSearch}
          placeholder={t('placeholder.enter-an-item-code-or-name')}
          value={facts()?.itemId}
          selectedItem={
            facts()
              ? {
                  id: facts()!.itemId,
                  code: facts()!.itemCode,
                  name: facts()!.itemName,
                }
              : undefined
          }
          clearable={false}
          disabled={closed(gates().item) || loading()}
          onSelect={item => item && void pickItem(item)}
        />
        {/* Disabled in every state: nothing on this screen changes a line's
            status (rules § line status). */}
        <FieldRow label={t('label.status')} labelWidth="auto">
          <Select
            label={t('label.status')}
            hideLabel
            width="compact"
            testId="line-status-select"
            value={facts()?.status ?? 'NEW'}
            options={LINE_STATUSES.map(value => ({
              value,
              label: t(`status.${value.toLowerCase()}` as 'status.new'),
            }))}
            disabled={!gates().status}
          />
        </FieldRow>
      </div>

      <Show when={facts() && draft()}>
        <div class={styles.grid}>
          <div class={styles.column}>
            <FieldRow
              label={t('label.line-number')}
              readOnly
              valueAlign="end"
              valueTestId="line-number-value"
            >
              {String(facts()!.lineNumber)}
            </FieldRow>
            <FieldRow
              label={t('label.stock-on-hand')}
              readOnly
              valueAlign="end"
              valueTestId="stock-on-hand-value"
            >
              {formatNumber(facts()!.stockOnHand)}
            </FieldRow>
            <FieldRow
              label={t('label.unit')}
              readOnly
              valueAlign="end"
              valueTestId="unit-value"
            >
              {facts()!.unitName ?? '-'}
            </FieldRow>
            <FieldRow label={t('label.supplier-item-code')}>
              <TextField
                label={t('label.supplier-item-code')}
                hideLabel
                data-testid="supplier-item-code-input"
                value={draft()!.supplierItemCode}
                disabled={closed(gates().drafting)}
                onInput={e =>
                  patch({ supplierItemCode: e.currentTarget.value })
                }
              />
            </FieldRow>
            <FieldRow label={t('label.manufacturer')}>
              <NameSearch
                label={t('label.manufacturer')}
                hideLabel
                storeId={props.storeId}
                role="manufacturer"
                width="full"
                inputTestId="manufacturer-search-input"
                selected={draft()!.manufacturer ?? undefined}
                disabled={closed(gates().drafting)}
                onSelect={name =>
                  patch({
                    manufacturer: name
                      ? { id: name.id, name: name.name }
                      : null,
                  })
                }
              />
            </FieldRow>
          </div>

          <div class={styles.column}>
            <FieldRow label={t(packsLabelKey(status()))}>
              <NumberField
                label={t(packsLabelKey(status()))}
                hideLabel
                min={0}
                decimalLimit={2}
                data-testid="packs-input"
                ref={packsField.ref}
                value={draftPacks(draft()!)}
                disabled={closed(gates().packs)}
                onChange={value =>
                  patch(packsEntered(status(), draft()!, value ?? 0))
                }
              />
            </FieldRow>
            <FieldRow label={t('label.pack-size')}>
              <NumberField
                label={t('label.pack-size')}
                hideLabel
                min={0}
                decimalLimit={2}
                data-testid="pack-size-input"
                value={draft()!.requestedPackSize}
                disabled={closed(gates().drafting)}
                onChange={value =>
                  patch(packSizeEntered(status(), draft()!, value ?? 0))
                }
              />
            </FieldRow>
            <FieldRow
              label={t('label.requested-quantity')}
              readOnly
              valueAlign="end"
              valueTestId="requested-units-value"
            >
              {formatNumber(draft()!.requestedNumberOfUnits)}
            </FieldRow>
            <Show when={showsAdjustedUnits(status())}>
              <FieldRow
                label={t('label.adjusted-units')}
                readOnly
                valueAlign="end"
                valueTestId="adjusted-units-value"
              >
                {draft()!.adjustedNumberOfUnits == null
                  ? '-'
                  : formatNumber(draft()!.adjustedNumberOfUnits!)}
              </FieldRow>
            </Show>
            <FieldRow label={t('label.price-per-pack-before-discount')}>
              <CurrencyField
                label={t('label.price-per-pack-before-discount')}
                hideLabel
                currency={currency()}
                decimalLimit={PRICE_DECIMALS}
                data-testid="price-before-discount-input"
                value={draft()!.pricePerPackBeforeDiscount}
                disabled={closed(gates().drafting)}
                onChange={value =>
                  setPrice('pricePerPackBeforeDiscount', value)
                }
              />
            </FieldRow>
            <FieldRow label={t('label.discount-percentage')}>
              <NumberField
                label={t('label.discount-percentage')}
                hideLabel
                min={0}
                max={100}
                decimalLimit={2}
                endAdornment="%"
                data-testid="discount-percentage-input"
                value={draft()!.discountPercentage}
                disabled={closed(gates().drafting)}
                onChange={value => setPrice('discountPercentage', value)}
              />
            </FieldRow>
            <FieldRow label={t('label.price-per-pack-after-discount')}>
              <CurrencyField
                label={t('label.price-per-pack-after-discount')}
                hideLabel
                currency={currency()}
                decimalLimit={PRICE_DECIMALS}
                data-testid="price-after-discount-input"
                value={draft()!.pricePerPackAfterDiscount}
                disabled={closed(gates().drafting)}
                onChange={value => setPrice('pricePerPackAfterDiscount', value)}
              />
            </FieldRow>
            <FieldRow
              label={t('label.total-cost')}
              readOnly
              valueAlign="end"
              valueTestId="total-cost-value"
            >
              {money(lineCost(draft()!))}
            </FieldRow>
          </div>

          <div class={styles.column}>
            <FieldRow label={t('label.requested-delivery-date')}>
              <DateField
                label={t('label.requested-delivery-date')}
                hideLabel
                width="full"
                testId="line-requested-delivery-date-field"
                value={draft()!.requestedDeliveryDate}
                disabled={closed(gates().dates)}
                onChange={value => patch(requestedDateEntered(draft()!, value))}
              />
            </FieldRow>
            <FieldRow label={t('label.expected-delivery-date')}>
              <DateField
                label={t('label.expected-delivery-date')}
                hideLabel
                width="full"
                testId="line-expected-delivery-date-field"
                value={draft()!.expectedDeliveryDate}
                disabled={closed(gates().dates)}
                onChange={value => patch({ expectedDeliveryDate: value })}
              />
            </FieldRow>
            <FieldRow
              label={t('label.comment-for-supplier')}
              align="first-line"
            >
              <TextArea
                label={t('label.comment-for-supplier')}
                hideLabel
                rows={3}
                data-testid="line-comment-field"
                value={draft()!.comment}
                disabled={closed(gates().text)}
                onInput={e => patch({ comment: e.currentTarget.value })}
              />
            </FieldRow>
            <FieldRow label={t('label.note-internal')} align="first-line">
              <TextArea
                label={t('label.note-internal')}
                hideLabel
                rows={3}
                data-testid="line-note-field"
                value={draft()!.note}
                disabled={closed(gates().text)}
                onInput={e => patch({ note: e.currentTarget.value })}
              />
            </FieldRow>
          </div>
        </div>
      </Show>

      <Show when={facts()}>
        {line => (
          <LabelledValue
            label={t('label.ordered-in-others')}
            layout="inline"
            data-testid="ordered-in-others-value"
          >
            {orderedElsewhere(line().unitsOrderedInOthers, line().unitName)}
          </LabelledValue>
        )}
      </Show>
    </Dialog>
  );
};
