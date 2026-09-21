import { type Component } from 'solid-js';
import { t, localisedDate } from '@/intl';
import { formatNumber } from '@/intl/formatNumber';
import {
  SidePanelSection,
  SidePanelActions,
} from '@/ui/layout/SidePanel/SidePanel';
import { FieldRow } from '@/ui/elements/inputs/FieldRow';
import { TextArea } from '@/ui/elements/inputs/TextArea';
import { NumberField } from '@/ui/elements/inputs/NumberField';
import { CurrencyField } from '@/ui/elements/inputs/CurrencyField';
import { DateField } from '@/ui/elements/inputs/DateField';
import { NameSearch, type NameOption } from '@/domain/name';
import { ShippingMethodSelect } from '@/domain/shippingMethod';
import { DeletePurchaseOrderAction } from './actions';
import type { PurchaseOrderInfoFragment } from './purchaseOrderDetail.generated';
import type {
  PurchaseOrderFieldEdit,
  PurchaseOrderPatch,
} from './purchaseOrderEdit';
import { chargesTotal, finalCost } from './purchaseOrderPricing';
import { canDelete } from './purchaseOrderLadder';
import type { PurchaseOrderStatus } from '../purchaseOrderStatus';

export interface PurchaseOrderSidePanelProps {
  storeId: string;
  node: PurchaseOrderInfoFragment;
  /** True once the order is Sent or Finalised (the comment stays open). */
  disabled: boolean;
  edit: PurchaseOrderFieldEdit;
  onSaveField: (patch: PurchaseOrderPatch) => void;
  onDeleted: () => void;
}

/*
 * The detail side panel (spec/purchase-orders S9): three sections — Pricing,
 * Other, Dates — and one action, composed per ui/docs/SIDE_PANEL.md.
 *
 * Two things here are deliberate DIVERGENCES from the reference app, both
 * recorded in the spec as its defects:
 *
 *  - Its three editable dates (PO sent, Contract signed, Advance paid) are
 *    offered on a closed order, where the domain refuses them and the save
 *    fails into a toast naming no cause. The spec states a build MUST disable
 *    them with the order's other fields (S9), so they carry `props.disabled`
 *    like every other field.
 *  - Its Delete navigates away whether or not the deletion succeeded. Here the
 *    action awaits the outcome (DeletePurchaseOrderAction).
 */
export const PurchaseOrderSidePanel: Component<
  PurchaseOrderSidePanelProps
> = props => {
  const currency = () => props.node.currency?.code;

  const money = (value: number): string =>
    formatNumber(value, {
      style: 'currency',
      currency: currency(),
      currencyDisplay: 'narrowSymbol',
    });

  const status = () => props.node.status as PurchaseOrderStatus;

  const selectedDonor = (): NameOption | undefined => {
    const donor = props.node.donor;
    return donor
      ? {
          id: donor.id,
          name: donor.name,
          code: '',
          isSupplier: false,
          isDonor: true,
          isOnHold: false,
          isStore: false,
        }
      : undefined;
  };

  // The subtotal is what an entered discount AMOUNT is converted against —
  // and the service DISCARDS an amount entered while it is zero (contract § an
  // order's own screen, confirmed live). So the amount input closes at a zero
  // subtotal rather than taking an edit the server will silently drop; the
  // percentage input stays open, since it is the figure actually stored.
  const subtotal = () => props.node.orderTotalBeforeDiscount;

  return (
    <>
      <SidePanelSection value="pricing" title={t('title.pricing')}>
        {/* The order's undiscounted total — undiscounted by the SUPPLIER
            discount only: it already nets off every line's own discount
            (contract ⚠️ the field called "before discount"). */}
        <FieldRow label={t('label.cost-subtotal')}>
          <span data-testid="cost-subtotal-value">{money(subtotal())}</span>
        </FieldRow>

        {/* The five charges summed. They reach NEITHER stored total, which is
            why this row is assembled here (purchaseOrderPricing.ts). */}
        <FieldRow label={t('label.cost-additional-fees')}>
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
              props.onSaveField({ supplierDiscountPercentage: value ?? 0 })
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
              props.onSaveField({ supplierDiscountAmount: value ?? 0 })
            }
          />
        </FieldRow>

        {/* The discounted total PLUS the charges — the only place the figure a
            user reads as the order's final cost appears anywhere. No field
            carries it (contract ⚠️ the five charges reach no total on the
            server). */}
        <FieldRow label={t('label.cost-final')}>
          <strong data-testid="cost-final-value">
            {money(finalCost(props.node))}
          </strong>
        </FieldRow>
      </SidePanelSection>

      <SidePanelSection value="other" title={t('heading.other')}>
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
            onSelect={name =>
              props.onSaveField({ donorId: { value: name?.id ?? null } })
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
              props.onSaveField({ shippingMethod: method?.method ?? '' })
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

      <SidePanelSection value="dates" title={t('label.dates')}>
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

        {/* An order may carry a sent moment in ANY state — this is where it is
            edited directly, which is why the ladder shows it only once the
            order is actually Sent (rules § the state ladder). */}
        <FieldRow label={t('label.po-sent')}>
          <DateField
            label={t('label.po-sent')}
            hideLabel
            size="small"
            width="compact"
            value={props.node.sentDatetime ?? undefined}
            disabled={props.disabled}
            onChange={value =>
              props.onSaveField({ sentDatetime: { value: value ?? null } })
            }
          />
        </FieldRow>

        <FieldRow label={t('label.contract-signed')}>
          <DateField
            label={t('label.contract-signed')}
            hideLabel
            size="small"
            width="compact"
            value={props.node.contractSignedDate ?? undefined}
            disabled={props.disabled}
            onChange={value =>
              props.onSaveField({ contractSignedDate: { value: value ?? null } })
            }
          />
        </FieldRow>

        <FieldRow label={t('label.advance-paid')}>
          <DateField
            label={t('label.advance-paid')}
            hideLabel
            size="small"
            width="compact"
            value={props.node.advancePaidDate ?? undefined}
            disabled={props.disabled}
            onChange={value =>
              props.onSaveField({ advancePaidDate: { value: value ?? null } })
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
