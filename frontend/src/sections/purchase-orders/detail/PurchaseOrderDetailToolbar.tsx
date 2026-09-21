import { createSignal, Show, type Component } from 'solid-js';
import { createStore } from 'solid-js/store';
import { t } from '@/intl';
import { formatNumber } from '@/intl/formatNumber';
import { TextField } from '@/ui/elements/inputs/TextField';
import { DateField } from '@/ui/elements/inputs/DateField';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { NameSearch, type NameSeed } from '@/domain/name';
import { CurrencySelect } from '@/domain/currency';
import type { PurchaseOrderInfoFragment } from './purchaseOrderDetail.generated';
import type {
  PurchaseOrderFieldEdit,
  PurchaseOrderPatch,
  SaveFieldResult,
} from './purchaseOrderEdit';
import { canChangeCurrency } from './purchaseOrderLadder';
import type { DeliveryDateField } from './purchaseOrderUpdate';
export interface PurchaseOrderDetailToolbarProps {
  storeId: string;
  node: PurchaseOrderInfoFragment;
  /** True once the order is Sent or Finalised — every field but the comment. */
  disabled: boolean;
  edit: PurchaseOrderFieldEdit;
  /**
   * The latest expected delivery date across the order's lines, or undefined.
   */
  latestExpectedDate?: string;
  /** How many lines the order has — both dates reach every one of them. */
  lineCount: number;
  onSaveField: (patch: PurchaseOrderPatch) => Promise<SaveFieldResult>;
  /**
   * Write one date onto every line (the screen owns the cascade). Resolves
   * once the whole cascade and its re-read are done, which is when the picked
   * day can stop standing in for the value — with the first refusal, if any.
   */
  onCascadeDate: (
    field: DeliveryDateField,
    date: string
  ) => Promise<SaveFieldResult>;
}

/*
 * The detail header's field cluster (spec/purchase-orders S6 § toolbar): six
 * labelled field rows, as the children of the page's <HeaderToolbar>. The line
 * filter is the table's own (S7 § filters), never the header's. Which fields
 * are editable when is
 * purchaseOrderLadder.ts's — mirrored here because a refusal from the domain
 * names no cause (contract ⚠️), so a control left enabled on a closed order
 * would fail into a toast saying only that saving failed.
 */
export const PurchaseOrderDetailToolbar: Component<
  PurchaseOrderDetailToolbarProps
> = props => {
  // The picked day for either delivery date, until the re-read carries it:
  // awaiting confirmation first, then saving. Both dates are confirmed before
  // they are made, because both reach every line (rules § the two delivery
  // dates are not the order's alone).
  const [draft, setDraft] = createSignal<{
    field: DeliveryDateField;
    date: string;
    saving: boolean;
  }>();
  const draftFor = (field: DeliveryDateField) => {
    const pending = draft();
    return pending?.field === field ? pending.date : undefined;
  };
  const confirming = () => {
    const pending = draft();
    return pending && !pending.saving ? pending : undefined;
  };
  const [dateErrors, setDateErrors] = createStore<
    Partial<Record<DeliveryDateField, string>>
  >({});

  const selectedSupplier = (): NameSeed | undefined => {
    const supplier = props.node.supplier;
    return supplier
      ? {
          id: supplier.id,
          name: supplier.name,
          code: supplier.code,
        }
      : undefined;
  };

  const confirmMessage = () =>
    draft()?.field === 'expectedDeliveryDate'
      ? t('label.update-purchase-order-expected-delivery-date-for-all-lines')
      : t('label.update-purchase-order-requested-delivery-date-for-all-lines');

  const commitDate = () => {
    const pending = confirming();
    if (!pending) return;
    setDraft({ ...pending, saving: true });
    // The requested date is the ORDER's own field as well as every line's; the
    // expected date has no order-level field at all, so it is lines only.
    if (pending.field === 'requestedDeliveryDate')
      void props.onSaveField({
        requestedDeliveryDate: { value: pending.date },
      });
    setDateErrors(pending.field, undefined);
    void props.onCascadeDate(pending.field, pending.date).then(result => {
      setDraft(undefined);
      if (!result.ok)
        setDateErrors(
          pending.field,
          result.message ?? t('messages.error-saving-purchase-order')
        );
    });
  };

  return (
    <>
      <NameSearch
        label={t('label.supplier-name')}
        size="small"
        storeId={props.storeId}
        role="supplier"
        // External suppliers only: a purchase order goes to a party OUTSIDE
        // the system, never to another store in it (spec S6 § toolbar).
        parties="external"
        selected={selectedSupplier()}
        disabled={props.disabled}
        // Replace-only: an order's supplier is never cleared from here, and
        // `onSelect` discards a null anyway.
        clearable={false}
        onSelect={name =>
          name && void props.onSaveField({ supplierId: name.id })
        }
      />

      <TextField
        label={t('label.supplier-reference')}
        size="small"
        data-testid="supplier-reference-field"
        value={props.edit.state.reference}
        disabled={props.disabled}
        onInput={e => props.edit.setField('reference', e.currentTarget.value)}
        onBlur={() => props.edit.flush()}
      />

      <CurrencySelect
        label={t('label.currency')}
        size="small"
        value={props.node.currencyId ?? undefined}
        // NOT a state rule: an order carrying a confirmation moment has its
        // currency fixed whatever state it is in, and an order in a late state
        // without one can still have it changed (rules § what may be changed).
        disabled={!canChangeCurrency(props.node)}
        onChange={currency =>
          currency &&
          void props.onSaveField({
            currencyId: currency.id,
            // The rate follows the currency and is offered nowhere; it travels
            // only alongside a currency change (contract § an order's own
            // screen).
            foreignExchangeRate: currency.rate,
          })
        }
      />

      {/* The exchange rate can be changed NOWHERE on this screen, so it reads
          as a read-only labelled value rather than a disabled input
          (ui-standards/detail-views.md § never-editable fields are never
          disabled controls). Four decimals, as the spec's field states. */}
      <LabelledValue
        label={t('label.foreign-exchange-rate')}
        variant="field"
        size="small"
      >
        {formatNumber(props.node.foreignExchangeRate, {
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        })}
      </LabelledValue>

      <DateField
        label={t('label.requested-delivery-date')}
        size="small"
        value={
          draftFor('requestedDeliveryDate') ??
          props.node.requestedDeliveryDate ??
          undefined
        }
        error={dateErrors.requestedDeliveryDate}
        disabled={props.disabled}
        onChange={value =>
          value &&
          setDraft({
            field: 'requestedDeliveryDate',
            date: value,
            saving: false,
          })
        }
      />

      {/* No order-level field behind this one: it shows the LATEST expected
          date among the lines, and changing it writes the new date onto every
          line (rules § the two delivery dates are not the order's alone). An
          order with no lines has nothing to write it to, so the field has
          nothing to offer. */}
      <DateField
        label={t('label.expected-delivery-date')}
        size="small"
        value={draftFor('expectedDeliveryDate') ?? props.latestExpectedDate}
        error={dateErrors.expectedDeliveryDate}
        disabled={props.disabled || props.lineCount === 0}
        onChange={value =>
          value &&
          setDraft({
            field: 'expectedDeliveryDate',
            date: value,
            saving: false,
          })
        }
      />

      <Show when={confirming()}>
        <ConfirmDialog
          open
          // Cancel reverts the picked day. A confirm has already moved the
          // draft to saving, where it stands until the re-read replaces it.
          onClose={() => {
            if (!draft()?.saving) setDraft(undefined);
          }}
          title={t('heading.are-you-sure')}
          message={confirmMessage()}
          onConfirm={commitDate}
        />
      </Show>
    </>
  );
};
