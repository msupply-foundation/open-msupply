import { createMemo, createSignal, onCleanup, Show, type JSX } from 'solid-js';
import { generateUUID } from '@/uuid';
import { graphqlFetch } from '@/api/graphql';
import { MAX_FRACTION_DIGITS, formatCurrency, roundedText, t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import {
  StatusBadge,
  type StatusBadgeProps,
} from '@/ui/elements/feedback/StatusBadge';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { CurrencyField } from '@/ui/elements/inputs/CurrencyField';
import { TextField } from '@/ui/elements/inputs/TextField';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { DateField } from '@/ui/elements/inputs/DateField';
import { formatIsoDate } from '@/ui/elements/inputs/dateTimeConvert';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { Num } from '@/ui/elements/typography/Num';
import { Text } from '@/ui/elements/typography/Text';
import { FormColumns } from '@/ui/layout/Form/FormColumns';
import { FormColumn } from '@/ui/layout/Form/FormColumn';
import { FormSection } from '@/ui/layout/Form/FormSection';
import { InsetPanel } from '@/ui/layout/InsetPanel/InsetPanel';
import {
  CancelButton,
  DialogSaveButton,
  SaveAndNextButton,
} from '@/ui/elements/buttons/StandardButtons';
import { createFocusTarget } from '@/ui/utils/createFocusTarget';
import { ItemSearch, type ItemOption } from '@/domain/item';
import { NameSearch } from '@/domain/name';
import { linePacks, projectedLineCost } from '../purchaseOrderPricing';
import {
  poLineStatusLabel,
  type PurchaseOrderLineStatus,
  type PurchaseOrderStatus,
} from '../../purchaseOrderStatus';
import type { PurchaseOrderDetailLineFragment } from '../purchaseOrderDetail.generated';
import {
  insertPurchaseOrderLine,
  updatePurchaseOrderLine,
} from '../purchaseOrderUpdate';
import { PurchaseOrderLineItemFacts } from './purchaseOrderLineEdit.generated';
import {
  draftFromLine,
  factsFromLine,
  insertInput,
  lineChanges,
  lineGates,
  newLineDraft,
  packsEntered,
  packSizeEntered,
  PRICE_DECIMALS,
  pricePerUnit,
  repriced,
  requestedDateEntered,
  servicePriced,
  unitsFigure,
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
    supplierDiscountPercentage: number | null;
  };
  /** The latest expected date among the order's lines — a new line's seed. */
  latestExpectedDate: string | undefined;
  /** How many lines the order has — a new line's number is the next. */
  lineCount: number;
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

// The line's state as a badge — neutral while drafting, informational once
// sent to the supplier, settled once closed.
const LINE_STATUS_TONE: Record<
  PurchaseOrderLineStatus,
  StatusBadgeProps['tone']
> = {
  NEW: 'neutral',
  SENT: 'info',
  CLOSED: 'success',
};

// What a closed field with no value reads as (spec S10).
const EMPTY = '—';

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
  const priceField = createFocusTarget();
  // A service line has no quantity, so its first field is the price.
  const firstField = (service: boolean | undefined) =>
    service ? priceField : packsField;

  let disposed = false;
  onCleanup(() => (disposed = true));
  // Only the latest pick seeds the editor; a slower earlier one is dropped.
  let pickToken = 0;

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

  // A picked item is always a new line, even one already on the order
  // (OMS-FUN-PO-02.23) — the line it would become (rules § what a new line is
  // born as), with the item's own figures read live: its stock on hand now and
  // its units on order across the store's other purchase orders.
  const pickItem = async (item: ItemOption) => {
    const token = ++pickToken;
    const stale = () => disposed || token !== pickToken;
    setLoading(true);
    setErrorMessage(undefined);
    const result = await graphqlFetch(PurchaseOrderLineItemFacts, {
      storeId: props.storeId,
      itemId: item.id,
      orderId: props.order.id,
    });
    if (stale()) return;
    setLoading(false);
    const node = result.kind === 'success' && result.data.items.nodes[0];
    if (!node) {
      setErrorMessage(t('error.unable-to-load-data'));
      return;
    }
    seed(
      {
        lineNumber: props.lineCount + 1,
        status: 'NEW',
        itemId: node.id,
        itemCode: node.code,
        itemName: node.name,
        unitName: node.unitName ?? null,
        isService: node.type === 'SERVICE',
        stockOnHand: node.stats.stockOnHand,
        unitsOrderedInOthers: result.data.unitsOrderedInOtherPurchaseOrders,
      },
      newLineDraft(node, {
        requestedDeliveryDate: props.order.requestedDeliveryDate,
        latestExpectedDate: props.latestExpectedDate,
      })
    );
    firstField(node.type === 'SERVICE').focus();
  };

  const gates = createMemo(() =>
    lineGates({
      status: status(),
      lineStatus: facts()?.status ?? 'NEW',
      addMode: !props.initialLine,
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
    if (!current) return;
    if (facts()?.isService) return patch(servicePriced(value ?? 0));
    patch(repriced(field, { ...current, [field]: value ?? 0 }));
  };
  const priceLabel = () =>
    facts()?.isService ? t('label.price') : t('label.per-pack-before-discount');

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
      const nextFacts = factsFromLine(next);
      seed(nextFacts, draftFromLine(next));
      firstField(nextFacts.isService).focus();
    })();

  const currency = () => props.order.currencyCode;
  const money = (value: number) => formatCurrency(value, currency());
  // A read-only price: the currency's precision, widened as far as the stored
  // six decimals only where the figure needs it (spec S10 § pricing).
  const price = (value: number) =>
    formatCurrency(value, currency(), PRICE_DECIMALS);
  const dateText = (value: string | null) => formatIsoDate(value) || EMPTY;

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
      initialFocus={
        props.initialLine
          ? firstField(props.initialLine.item.type === 'SERVICE')
          : itemSearch
      }
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
        {/* Opened from a row the item is fixed, so it reads as a heading;
            adding, the lookup stays live (rules § choosing the item). */}
        <Show
          when={props.initialLine ? facts() : undefined}
          fallback={
            <ItemSearch
              label={t('label.item')}
              storeId={props.storeId}
              class={styles.itemSearch}
              width="full"
              // Barred items left out, service items offered.
              orderableOnly
              includeServiceItems
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
          }
        >
          {line => (
            <Text
              variant="heading"
              level={3}
              class={styles.itemHeading}
              data-testid="line-item-heading"
            >
              {line().itemCode} {line().itemName}
            </Text>
          )}
        </Show>
        <Show when={facts()}>
          {line => (
            <div class={styles.topEnd}>
              <Show when={!props.initialLine && !line().isService}>
                <span class={styles.summary} data-testid="line-item-summary">
                  {t('label.in-stock-on-order-elsewhere', {
                    stockOnHand: unitsFigure(
                      line().stockOnHand,
                      line().unitName
                    ),
                    onOrder: roundedText(line().unitsOrderedInOthers),
                  })}
                </span>
              </Show>
              {/* Read-only in every state: nothing on this screen changes a
                  line's status (rules § line status). */}
              <LabelledValue
                label={t('label.line-status')}
                layout="inline"
                variant="field"
              >
                <StatusBadge
                  label={poLineStatusLabel(line().status)}
                  tone={LINE_STATUS_TONE[line().status]}
                  testId="line-status-value"
                />
              </LabelledValue>
            </div>
          )}
        </Show>
      </div>

      <Show when={facts() && draft()}>
        <FormColumns class={styles.columns}>
          <FormColumn minWidth="16rem">
            <Show when={!facts()!.isService}>
              <InsetPanel>
                <FormSection
                  title={t('label.quantity')}
                  headingLevel="h3"
                  heading="group"
                >
                  <Show
                    when={gates().drafting}
                    fallback={
                      <LabelledValue
                        label={t('label.requested-packs')}
                        variant="field"
                        data-testid="packs-value"
                      >
                        <Num
                          value={linePacks(draft()!)}
                          places={MAX_FRACTION_DIGITS}
                        />
                      </LabelledValue>
                    }
                  >
                    <NumberField
                      label={t('label.requested-packs')}
                      min={0}
                      decimalLimit={10}
                      data-testid="packs-input"
                      disabled={saving()}
                      ref={packsField.ref}
                      value={linePacks(draft()!)}
                      onChange={value =>
                        patch(packsEntered(draft()!, value ?? 0))
                      }
                    />
                  </Show>
                  <Show
                    when={gates().drafting}
                    fallback={
                      <LabelledValue
                        label={t('label.pack-size')}
                        variant="field"
                        data-testid="pack-size-value"
                      >
                        <Num value={draft()!.requestedPackSize} />
                      </LabelledValue>
                    }
                  >
                    <NumberField
                      label={t('label.pack-size')}
                      min={0}
                      decimalLimit={2}
                      data-testid="pack-size-input"
                      disabled={saving()}
                      value={draft()!.requestedPackSize}
                      onChange={value =>
                        patch(packSizeEntered(draft()!, value ?? 0))
                      }
                    />
                  </Show>
                  <LabelledValue
                    label={t('label.requested-units')}
                    variant="field"
                    data-testid="requested-units-value"
                  >
                    {unitsFigure(
                      draft()!.requestedNumberOfUnits,
                      facts()!.unitName,
                      MAX_FRACTION_DIGITS
                    )}
                  </LabelledValue>
                </FormSection>
              </InsetPanel>
            </Show>

            <InsetPanel>
              <FormSection
                title={t('label.delivery-dates')}
                headingLevel="h3"
                heading="group"
              >
                <Show
                  when={gates().requestedDate}
                  fallback={
                    <LabelledValue
                      label={t('label.requested')}
                      variant="field"
                      data-testid="line-requested-delivery-date-value"
                    >
                      {dateText(draft()!.requestedDeliveryDate)}
                    </LabelledValue>
                  }
                >
                  <DateField
                    label={t('label.requested')}
                    width="full"
                    testId="line-requested-delivery-date-field"
                    disabled={saving()}
                    value={draft()!.requestedDeliveryDate}
                    onChange={value =>
                      patch(requestedDateEntered(draft()!, value))
                    }
                  />
                </Show>
                <Show
                  when={gates().expectedDate}
                  fallback={
                    <LabelledValue
                      label={t('label.expected')}
                      variant="field"
                      data-testid="line-expected-delivery-date-value"
                    >
                      {dateText(draft()!.expectedDeliveryDate)}
                    </LabelledValue>
                  }
                >
                  <DateField
                    label={t('label.expected')}
                    width="full"
                    testId="line-expected-delivery-date-field"
                    disabled={saving()}
                    value={draft()!.expectedDeliveryDate}
                    onChange={value => patch({ expectedDeliveryDate: value })}
                  />
                </Show>
              </FormSection>
            </InsetPanel>
          </FormColumn>

          <FormColumn minWidth="16rem">
            <InsetPanel>
              <FormSection
                title={t('label.pricing')}
                headingLevel="h3"
                heading="group"
              >
                <Show
                  when={gates().drafting}
                  fallback={
                    <LabelledValue
                      label={priceLabel()}
                      variant="field"
                      data-testid="price-before-discount-value"
                    >
                      {price(draft()!.pricePerPackBeforeDiscount)}
                    </LabelledValue>
                  }
                >
                  <CurrencyField
                    label={priceLabel()}
                    currency={currency()}
                    decimalLimit={PRICE_DECIMALS}
                    data-testid="price-before-discount-input"
                    disabled={saving()}
                    ref={priceField.ref}
                    value={draft()!.pricePerPackBeforeDiscount}
                    onChange={value =>
                      setPrice('pricePerPackBeforeDiscount', value)
                    }
                  />
                </Show>
                {/* A service line has one price: no line discount. */}
                <Show when={!facts()!.isService}>
                  <Show
                    when={gates().drafting}
                    fallback={
                      <LabelledValue
                        label={t('label.discount')}
                        variant="field"
                        data-testid="discount-percentage-value"
                      >
                        {`${roundedText(draft()!.discountPercentage, 2)}%`}
                      </LabelledValue>
                    }
                  >
                    <NumberField
                      label={t('label.discount')}
                      min={0}
                      max={100}
                      decimalLimit={2}
                      endAdornment="%"
                      data-testid="discount-percentage-input"
                      disabled={saving()}
                      value={draft()!.discountPercentage}
                      onChange={value => setPrice('discountPercentage', value)}
                    />
                  </Show>
                  <Show
                    when={gates().drafting}
                    fallback={
                      <LabelledValue
                        label={t('label.per-pack-after-discount')}
                        variant="field"
                        data-testid="price-after-discount-value"
                      >
                        {price(draft()!.pricePerPackAfterDiscount)}
                      </LabelledValue>
                    }
                  >
                    <CurrencyField
                      label={t('label.per-pack-after-discount')}
                      currency={currency()}
                      decimalLimit={PRICE_DECIMALS}
                      data-testid="price-after-discount-input"
                      disabled={saving()}
                      value={draft()!.pricePerPackAfterDiscount}
                      onChange={value =>
                        setPrice('pricePerPackAfterDiscount', value)
                      }
                    />
                  </Show>
                  <LabelledValue
                    label={t('label.per-unit-after-discount')}
                    variant="field"
                    data-testid="price-per-unit-value"
                  >
                    {price(pricePerUnit(draft()!))}
                  </LabelledValue>
                </Show>
                <LabelledValue
                  label={t('label.line-total')}
                  variant="field"
                  data-testid="total-cost-value"
                >
                  {/* A PREVIEW of the line cost the table will show on save
                    (the server's own rule, packs × the after-discount price,
                    with the order's supplier discount apportioned to a stock
                    line) — the draft has no stored figure yet. */}
                  {money(
                    projectedLineCost(draft()!, props.order, facts()!.isService)
                  )}
                </LabelledValue>
              </FormSection>
            </InsetPanel>
          </FormColumn>

          <FormColumn minWidth="16rem">
            <InsetPanel>
              <FormSection
                title={t('label.item')}
                headingLevel="h3"
                heading="group"
              >
                <Show
                  when={gates().drafting}
                  fallback={
                    <LabelledValue
                      label={t('label.supplier-item-code')}
                      variant="field"
                      data-testid="supplier-item-code-value"
                    >
                      {draft()!.supplierItemCode || EMPTY}
                    </LabelledValue>
                  }
                >
                  <TextField
                    label={t('label.supplier-item-code')}
                    data-testid="supplier-item-code-input"
                    disabled={saving()}
                    value={draft()!.supplierItemCode}
                    onInput={e =>
                      patch({ supplierItemCode: e.currentTarget.value })
                    }
                  />
                </Show>
                <Show
                  when={gates().drafting}
                  fallback={
                    <LabelledValue
                      label={t('label.manufacturer')}
                      variant="field"
                      data-testid="manufacturer-value"
                    >
                      {draft()!.manufacturer?.name || EMPTY}
                    </LabelledValue>
                  }
                >
                  <NameSearch
                    label={t('label.manufacturer')}
                    storeId={props.storeId}
                    role="manufacturer"
                    width="full"
                    inputTestId="manufacturer-search-input"
                    disabled={saving()}
                    selected={draft()!.manufacturer ?? undefined}
                    onSelect={name =>
                      patch({
                        manufacturer: name
                          ? { id: name.id, name: name.name }
                          : null,
                      })
                    }
                  />
                </Show>
                {/* Adding, these two sit in the top row's summary instead. */}
                <Show when={props.initialLine && !facts()!.isService}>
                  <LabelledValue
                    label={t('label.stock-on-hand')}
                    variant="field"
                    data-testid="stock-on-hand-value"
                  >
                    {unitsFigure(facts()!.stockOnHand, facts()!.unitName)}
                  </LabelledValue>
                  <LabelledValue
                    label={t('label.on-order-elsewhere')}
                    variant="field"
                    data-testid="ordered-in-others-value"
                  >
                    {unitsFigure(
                      facts()!.unitsOrderedInOthers,
                      facts()!.unitName
                    )}
                  </LabelledValue>
                </Show>
              </FormSection>
            </InsetPanel>

            <InsetPanel>
              <FormSection
                title={t('label.notes')}
                headingLevel="h3"
                heading="group"
              >
                <Show
                  when={gates().text}
                  fallback={
                    <LabelledValue
                      label={t('label.comment-for-supplier')}
                      variant="field"
                      data-testid="line-comment-value"
                    >
                      {draft()!.comment || EMPTY}
                    </LabelledValue>
                  }
                >
                  <TextArea
                    label={t('label.comment-for-supplier')}
                    rows={3}
                    data-testid="line-comment-field"
                    value={draft()!.comment}
                    disabled={saving()}
                    onInput={e => patch({ comment: e.currentTarget.value })}
                  />
                </Show>
                <Show
                  when={gates().text}
                  fallback={
                    <LabelledValue
                      label={t('label.note-internal')}
                      variant="field"
                      data-testid="line-note-value"
                    >
                      {draft()!.note || EMPTY}
                    </LabelledValue>
                  }
                >
                  <TextArea
                    label={t('label.note-internal')}
                    rows={3}
                    data-testid="line-note-field"
                    value={draft()!.note}
                    disabled={saving()}
                    onInput={e => patch({ note: e.currentTarget.value })}
                  />
                </Show>
              </FormSection>
            </InsetPanel>
          </FormColumn>
        </FormColumns>
      </Show>
    </Dialog>
  );
};
