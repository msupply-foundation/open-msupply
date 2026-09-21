import { type Component } from 'solid-js';
import { createStore } from 'solid-js/store';
import { t, localisedDate } from '@/intl';
import {
  SidePanelSection,
  SidePanelActions,
} from '@/ui/layout/SidePanel/SidePanel';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { CurrencyField } from '@/ui/elements/inputs/CurrencyField';
import { DateField } from '@/ui/elements/inputs/DateField';
import { NameSearch, type NameSeed } from '@/domain/name';
import { ShippingMethodSelect } from '@/domain/shippingMethod';
import { DeletePurchaseOrderAction } from './actions';
import type { PurchaseOrderInfoFragment } from './purchaseOrderDetail.generated';
import {
  sentDayToWire,
  sentWireToDay,
  type PurchaseOrderFieldEdit,
  type PurchaseOrderPatch,
  type SaveFieldResult,
} from './purchaseOrderEdit';
import { chargesTotal, finalCost, formatMoney } from './purchaseOrderPricing';
import { canDelete } from './purchaseOrderLadder';
import type { PurchaseOrderStatus } from '../purchaseOrderStatus';

export interface PurchaseOrderSidePanelProps {
  storeId: string;
  node: PurchaseOrderInfoFragment;
  /** How many lines the order has — with none, it has no totals to show. */
  lineCount: number;
  /** True once the order is Sent or Finalised (the comment stays open). */
  disabled: boolean;
  edit: PurchaseOrderFieldEdit;
  /** Resolves with the verdict, so a refusal can be reported at the field. */
  onSaveField: (patch: PurchaseOrderPatch) => Promise<SaveFieldResult>;
  onDeleted: () => void;
}

// The fields whose control can carry an inline error (ui-standards/inputs.md §
// server-bound input: a failed save is surfaced at the field, and the entered
// value kept).
type ReportingField =
  'sentDatetime' | 'contractSignedDate' | 'advancePaidDate' | 'donorId';

/*
 * The detail side panel (spec/purchase-orders S9): three sections — Pricing,
 * Other, Dates — and one action, composed per ui/docs/SIDE_PANEL.md.
 *
 * Delete leaves for the list only once the deletion has succeeded (rules §
 * deleting from the screen; DeletePurchaseOrderAction).
 */
export const PurchaseOrderSidePanel: Component<
  PurchaseOrderSidePanelProps
> = props => {
  const currency = () => props.node.currency?.code;

  // A save's refusal, keyed to the field it was made from; cleared by the next
  // save of that field that lands. Nothing else reports it — the domain's
  // rejection names no cause (contract ⚠️), so without this a refused date
  // would simply fail to stick.
  const [saveErrors, setSaveErrors] = createStore<
    Partial<Record<ReportingField, string>>
  >({});
  const save = async (field: ReportingField, patch: PurchaseOrderPatch) => {
    const result = await props.onSaveField(patch);
    setSaveErrors(
      field,
      result.ok
        ? undefined
        : (result.message ?? t('messages.error-saving-purchase-order'))
    );
  };

  const money = (value: number) => formatMoney(value, currency());

  const status = () => props.node.status as PurchaseOrderStatus;

  const selectedDonor = (): NameSeed | undefined => {
    const donor = props.node.donor;
    return donor
      ? {
          id: donor.id,
          name: donor.name,
        }
      : undefined;
  };

  // The subtotal is what an entered discount AMOUNT is converted against —
  // and the service DISCARDS an amount entered while it is zero (contract § an
  // order's own screen, confirmed live). So the amount input closes at a zero
  // subtotal rather than taking an edit the server will silently drop; the
  // percentage input stays open, since it is the figure actually stored.
  const subtotal = () => props.node.orderTotalBeforeDiscount;
  // An order with no lines has NO totals — the server fabricates 0.0 for both
  // (contract ⚠️), so the line count decides whether a figure exists at all
  // (rules § pricing and totals). The charges are real whatever the lines.
  const total = (value: number): string =>
    props.lineCount === 0 ? '-' : money(value);

  return (
    <>
      <SidePanelSection value="pricing" title={t('title.pricing')} collapsible>
        {/* The order's undiscounted total — undiscounted by the SUPPLIER
            discount only: it already nets off every line's own discount
            (contract ⚠️ the field called "before discount"). */}
        <FieldRow label={t('label.cost-subtotal')}>
          <span data-testid="cost-subtotal-value">{total(subtotal())}</span>
        </FieldRow>

        {/* The five charges summed. They reach NEITHER stored total, which is
            why this row is assembled here (purchaseOrderPricing.ts). */}
        <FieldRow
          label={
            <span style={{ 'white-space': 'pre-line' }}>
              {t('label.cost-additional-fees')}
            </span>
          }
        >
          <span data-testid="cost-additional-fees-value">
            {money(chargesTotal(props.node))}
          </span>
        </FieldRow>

        {/* The two discount inputs are two views of ONE stored figure: only
            the percentage is stored, and an amount is converted against the
            subtotal as it stands. */}
        <FieldRow label={t('label.supplier-discount-percentage')}>
          <NumberField
            label={t('label.supplier-discount-percentage')}
            hideLabel
            size="small"
            width="compact"
            endAdornment="%"
            min={0}
            max={100}
            decimalLimit={2}
            value={props.node.supplierDiscountPercentage ?? undefined}
            disabled={props.disabled}
            onChange={value =>
              void props.onSaveField({ supplierDiscountPercentage: value ?? 0 })
            }
          />
        </FieldRow>

        <FieldRow label={t('label.supplier-discount-amount')}>
          <CurrencyField
            label={t('label.supplier-discount-amount')}
            hideLabel
            size="small"
            width="compact"
            currency={currency()}
            min={0}
            value={props.node.supplierDiscountAmount}
            disabled={props.disabled || subtotal() === 0}
            onChange={value =>
              void props.onSaveField({ supplierDiscountAmount: value ?? 0 })
            }
          />
        </FieldRow>

        {/* The discounted total PLUS the charges — the only place the figure a
            user reads as the order's final cost appears anywhere. No field
            carries it (contract ⚠️ the five charges reach no total on the
            server). */}
        <FieldRow label={t('label.cost-final')}>
          <strong data-testid="cost-final-value">
            {total(finalCost(props.node))}
          </strong>
        </FieldRow>
      </SidePanelSection>

      <SidePanelSection value="other" title={t('heading.other')} collapsible>
        <FieldRow label={t('label.donor')}>
          <NameSearch
            label={t('label.donor')}
            hideLabel
            size="small"
            storeId={props.storeId}
            role="donor"
            selected={selectedDonor()}
            disabled={props.disabled}
            // Clearable, and clearing is a real edit: the field is nullable and
            // is cleared through the wrapper, never by omission (contract § an
            // order's own screen).
            error={saveErrors.donorId}
            onSelect={name =>
              void save('donorId', { donorId: { value: name?.id ?? null } })
            }
          />
        </FieldRow>

        <FieldRow label={t('label.shipping-method')}>
          <ShippingMethodSelect
            label={t('label.shipping-method')}
            hideLabel
            size="small"
            // The order stores the method's NAME, not its id, so the selected
            // option is matched by what was stored.
            value={props.node.shippingMethod ?? undefined}
            disabled={props.disabled}
            onChange={method =>
              void props.onSaveField({ shippingMethod: method?.method ?? '' })
            }
          />
        </FieldRow>

        {/* The ONE field editable in every state, the closed ones included
            (rules § what may be changed, and when) — so it never takes
            `props.disabled`. Confirmed live on a Finalised order. */}
        <FieldRow label={t('label.comment')} align="first-line">
          <TextArea
            label={t('label.comment')}
            hideLabel
            value={props.edit.state.comment}
            onInput={e => props.edit.setField('comment', e.currentTarget.value)}
            onBlur={() => props.edit.flush()}
          />
        </FieldRow>
      </SidePanelSection>

      <SidePanelSection value="dates" title={t('label.dates')} collapsible>
        {/* The confirmation moment can be changed NOWHERE on this screen, so
            it reads as a value rather than a disabled picker
            (ui-standards/detail-views.md § never-editable fields are never
            disabled controls). It is also the gate on the currency. */}
        <FieldRow label={t('label.confirmed')}>
          <span data-testid="confirmed-datetime-value">
            {props.node.confirmedDatetime
              ? localisedDate(props.node.confirmedDatetime)
              : '-'}
          </span>
        </FieldRow>

        {/* These three dates record what happens AFTER sending, so they stay
            editable in every state, Sent and Finalised included (rules § what
            may be changed, and when) — none takes `props.disabled`. The sent
            moment is edited here directly, which is why the ladder shows it
            only once the order is actually Sent (rules § the state ladder). */}
        <FieldRow label={t('label.po-sent')}>
          {/* A DateTime on the wire, a DAY here: written as UTC midnight and
              read back as its UTC day (purchaseOrderEdit.ts). */}
          <DateField
            label={t('label.po-sent')}
            hideLabel
            size="small"
            width="compact"
            testId="po-sent-field"
            value={sentWireToDay(props.node.sentDatetime)}
            error={saveErrors.sentDatetime}
            onChange={value =>
              void save('sentDatetime', {
                sentDatetime: { value: value ? sentDayToWire(value) : null },
              })
            }
          />
        </FieldRow>

        <FieldRow label={t('label.contract-signed')}>
          <DateField
            label={t('label.contract-signed')}
            hideLabel
            size="small"
            width="compact"
            testId="contract-signed-field"
            value={props.node.contractSignedDate ?? undefined}
            error={saveErrors.contractSignedDate}
            onChange={value =>
              void save('contractSignedDate', {
                contractSignedDate: { value: value ?? null },
              })
            }
          />
        </FieldRow>

        <FieldRow label={t('label.advance-paid')}>
          <DateField
            label={t('label.advance-paid')}
            hideLabel
            size="small"
            width="compact"
            testId="advance-paid-field"
            value={props.node.advancePaidDate ?? undefined}
            error={saveErrors.advancePaidDate}
            onChange={value =>
              void save('advancePaidDate', {
                advancePaidDate: { value: value ?? null },
              })
            }
          />
        </FieldRow>
      </SidePanelSection>

      <SidePanelSection value="actions" title={t('heading.actions')}>
        <SidePanelActions>
          <DeletePurchaseOrderAction
            storeId={props.storeId}
            orderId={props.node.id}
            orderNumber={props.node.number}
            disabled={!canDelete(status())}
            onDeleted={props.onDeleted}
          />
        </SidePanelActions>
      </SidePanelSection>
    </>
  );
};
