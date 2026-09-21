import { createResource, createSignal, Show, type Component } from 'solid-js';
import { t } from '@/intl';
import { formatNumber } from '@/intl/formatNumber';
import { graphqlFetch } from '@/api/graphql';
import { gated } from '@/api/gated';
import { TextField } from '@/ui/elements/inputs/TextField';
import { DateField } from '@/ui/elements/inputs/DateField';
import { Combobox } from '@/ui/elements/selectors/Combobox';
import { LabelledValue } from '@/ui/elements/typography/LabelledValue';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { NameSearch, type NameOption } from '@/domain/name';
import { PurchaseOrderCurrencies } from './purchaseOrderDetail.generated';
import type { PurchaseOrderInfoFragment } from './purchaseOrderDetail.generated';
import type {
  PurchaseOrderFieldEdit,
  PurchaseOrderPatch,
} from './purchaseOrderEdit';
import { canChangeCurrency } from './purchaseOrderLadder';
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
  onSaveField: (patch: PurchaseOrderPatch) => void;
  /**
   * Write one date onto every line (the screen owns the cascade). Resolves
   * once the whole cascade and its re-read are done, which is when the picked
   * day can stop standing in for the value.
   */
  onCascadeDate: (
    field: 'requestedDeliveryDate' | 'expectedDeliveryDate',
    date: string
  ) => Promise<void>;
  search: string;
  onSearchChange: (search: string) => void;
}

/*
 * The detail header's field cluster (spec/purchase-orders S6 § toolbar): six
 * labelled field rows and the line search, as the children of the page's
 * <HeaderToolbar>. Which fields are editable when is
 * purchaseOrderLadder.ts's — mirrored here because a refusal from the domain
 * names no cause (contract ⚠️), so a control left enabled on a closed order
 * would fail into a toast saying only that saving failed.
 */
export const PurchaseOrderDetailToolbar: Component<
  PurchaseOrderDetailToolbarProps
> = props => {
  // The date awaiting confirmation. BOTH dates are confirmed before they are
  // made, because both reach every line (rules § the two delivery dates are
  // not the order's alone).
  const [pendingDate, setPendingDate] = createSignal<{
    field: 'requestedDeliveryDate' | 'expectedDeliveryDate';
    date: string;
  }>();
  // The picked-but-unconfirmed day, so cancelling reverts the input — the node
  // has not changed, so the controlled value alone would not.
  const [draftRequested, setDraftRequested] = createSignal<string>();
  const [draftExpected, setDraftExpected] = createSignal<string>();
  // A CONFIRMED date is saving, so the dialog's onClose — which the confirm
  // path always runs after onConfirm — must not revert the draft underneath
  // it. The draft stands until the re-read replaces it, which for the expected
  // date means after the whole line cascade, not one round trip.
  let confirmInFlight = false;

  // The currency lookup's options. Fetched on the screen's first paint (the
  // toolbar is always on screen), read non-suspending so the list arriving
  // never remounts an open screen (kdd/solid-reactivity-pitfalls › No remounts
  // on interaction).
  const [currencyData] = createResource(async () => {
    const result = await graphqlFetch(PurchaseOrderCurrencies, {});
    return result.kind === 'success' &&
      result.data.currencies.__typename === 'CurrencyConnector'
      ? result.data.currencies.nodes
      : [];
  });
  const currencies = () => gated(currencyData) ?? [];

  const selectedSupplier = (): NameOption | undefined => {
    const supplier = props.node.supplier;
    return supplier
      ? {
          id: supplier.id,
          name: supplier.name,
          code: supplier.code,
          isSupplier: true,
          isDonor: false,
          isOnHold: false,
          isStore: false,
        }
      : undefined;
  };

  const confirmMessage = () =>
    pendingDate()?.field === 'expectedDeliveryDate'
      ? t('label.update-purchase-order-expected-delivery-date-for-all-lines')
      : t('label.update-purchase-order-requested-delivery-date-for-all-lines');

  const commitDate = () => {
    const pending = pendingDate();
    if (!pending) return;
    confirmInFlight = true;
    // The requested date is the ORDER's own field as well as every line's; the
    // expected date has no order-level field at all, so it is lines only.
    if (pending.field === 'requestedDeliveryDate')
      props.onSaveField({
        requestedDeliveryDate: { value: pending.date },
      });
    void props.onCascadeDate(pending.field, pending.date).then(() => {
      // The re-read now carries the new date, so the draft steps aside.
      setDraftRequested(undefined);
      setDraftExpected(undefined);
    });
    setPendingDate(undefined);
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
        onSelect={name => name && props.onSaveField({ supplierId: name.id })}
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

      <Combobox
        label={t('label.currency')}
        size="small"
        items={currencies()}
        loading={currencyData.loading}
        itemToString={currency => currency.code}
        itemToValue={currency => currency.id}
        value={props.node.currencyId ?? undefined}
        // NOT a state rule: an order carrying a confirmation moment has its
        // currency fixed whatever state it is in, and an order in a late state
        // without one can still have it changed (rules § what may be changed).
        disabled={!canChangeCurrency(props.node)}
        onChange={currency =>
          currency &&
          props.onSaveField({
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
        value={draftRequested() ?? props.node.requestedDeliveryDate ?? undefined}
        disabled={props.disabled}
        onChange={value => {
          if (!value) return;
          setDraftRequested(value);
          setPendingDate({ field: 'requestedDeliveryDate', date: value });
        }}
      />

      {/* No order-level field behind this one: it shows the LATEST expected
          date among the lines, and changing it writes the new date onto every
          line (rules § the two delivery dates are not the order's alone). An
          order with no lines has nothing to write it to, so the field has
          nothing to offer. */}
      <DateField
        label={t('label.expected-delivery-date')}
        size="small"
        value={draftExpected() ?? props.latestExpectedDate}
        disabled={props.disabled || props.lineCount === 0}
        onChange={value => {
          if (!value) return;
          setDraftExpected(value);
          setPendingDate({ field: 'expectedDeliveryDate', date: value });
        }}
      />

      {/* The line search — the only thing that narrows the General tab's
          table, matching item CODE or NAME (rules § lines, as the screen
          presents them). Server-side, on the filter added for it. */}
      <TextField
        label={t('placeholder.filter-items')}
        size="small"
        data-testid="line-search-field"
        value={props.search}
        onInput={e => props.onSearchChange(e.currentTarget.value)}
      />

      <Show when={pendingDate()}>
        <ConfirmDialog
          open
          onClose={() => {
            setPendingDate(undefined);
            // Cancel reverts the picked day; a confirm leaves it standing.
            if (!confirmInFlight) {
              setDraftRequested(undefined);
              setDraftExpected(undefined);
            }
            confirmInFlight = false;
          }}
          title={t('heading.are-you-sure')}
          message={confirmMessage()}
          onConfirm={commitDate}
        />
      </Show>
    </>
  );
};
