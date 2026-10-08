import { createSignal, Show, type Component } from 'solid-js';
import { createStore } from 'solid-js/store';
import { t } from '@/intl';
import { formatNumber } from '@/intl/formatNumber';
import { TextField } from '@/ui/elements/inputs/TextField';
import { DateField } from '@/ui/elements/inputs/DateField';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { OkButton } from '@/ui/elements/buttons/StandardButtons';
import { AlertTriangleIcon } from '@/ui/icons';
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
  /**
   * Whether the lines carry more than one value of the given date: the user
   * has set them per line, so the toolbar's field no longer reaches them.
   */
  datesVary: (field: DeliveryDateField) => boolean;
  /** How many lines the order has — both dates reach every one of them. */
  lineCount: number;
  onSaveField: (patch: PurchaseOrderPatch) => Promise<SaveFieldResult>;
  /**
   * Write one day onto every line's date — and the other date where the lines
   * agree on it, and the order's own requested date (the screen owns the
   * cascade). Resolves once the whole cascade and its re-read are done, which
   * is when the picked day can stop standing in for the value — with the first
   * refusal, if any.
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
  // The picked day for either delivery date, until the re-read carries it or
  // the pick is dropped. A change is made at once while the lines agree on
  // that date, and REFUSED where they do not — the picked day then stands in
  // the field only until the notice is dismissed, so the field falls back to
  // the stored value (rules § the two delivery dates are not the order's
  // alone).
  const [draft, setDraft] = createSignal<{
    field: DeliveryDateField;
    date: string;
    phase: 'saving' | 'refused';
  }>();
  const draftFor = (field: DeliveryDateField) => {
    const pending = draft();
    return pending?.field === field ? pending.date : undefined;
  };
  const refused = () => {
    const pending = draft();
    return pending?.phase === 'refused' ? pending : undefined;
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

  const onDateChange = (field: DeliveryDateField, date: string) => {
    if (props.datesVary(field)) {
      setDraft({ field, date, phase: 'refused' });
      return;
    }
    setDraft({ field, date, phase: 'saving' });
    setDateErrors(field, undefined);
    void props.onCascadeDate(field, date).then(result => {
      setDraft(undefined);
      if (!result.ok)
        setDateErrors(
          field,
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

      {/* Either date, while the lines agree on it, writes the picked day onto
          every line — and onto the other date and the order's own requested
          date where the lines agree on those too — with no confirmation; once
          the lines differ on it the user has set them per line, so a change
          here is refused with a notice and writes nothing (rules § the two
          delivery dates are not the order's alone). */}
      <DateField
        label={t('label.requested-delivery-date')}
        size="small"
        testId="requested-delivery-date-field"
        value={
          draftFor('requestedDeliveryDate') ??
          props.node.requestedDeliveryDate ??
          undefined
        }
        error={dateErrors.requestedDeliveryDate}
        disabled={props.disabled}
        onChange={value =>
          value && onDateChange('requestedDeliveryDate', value)
        }
      />

      {/* No order-level field behind this one: it shows the LATEST expected
          date among the lines. An order with no lines has nothing to write it
          to, so the field has nothing to offer. */}
      <DateField
        label={t('label.expected-delivery-date')}
        size="small"
        testId="expected-delivery-date-field"
        value={draftFor('expectedDeliveryDate') ?? props.latestExpectedDate}
        error={dateErrors.expectedDeliveryDate}
        disabled={props.disabled || props.lineCount === 0}
        onChange={value => value && onDateChange('expectedDeliveryDate', value)}
      />

      <Show when={refused()}>
        {pending => (
          <Dialog
            open
            onClose={() => setDraft(undefined)}
            icon={<AlertTriangleIcon />}
            testId="delivery-dates-vary-modal"
            title={t('heading.cannot-do-that')}
            description={t(
              pending().field === 'expectedDeliveryDate'
                ? 'messages.purchase-order-expected-dates-vary'
                : 'messages.purchase-order-requested-dates-vary'
            )}
            actions={
              <OkButton
                data-testid="dialog-button-ok"
                onClick={() => setDraft(undefined)}
              />
            }
          />
        )}
      </Show>
    </>
  );
};
