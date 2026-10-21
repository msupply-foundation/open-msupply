import { Show, type Component, type JSX } from 'solid-js';
import { t } from '@/intl';
import { formatCurrency } from '@/intl/currency';
import { formatNumber } from '@/intl/formatNumber';
import { orderTotals } from './purchaseOrderPricing';
import type { PurchaseOrderInfoFragment } from './purchaseOrderDetail.generated';
import styles from './PurchaseOrderTotalsStrip.module.css';

export interface PurchaseOrderTotalsStripProps {
  node: PurchaseOrderInfoFragment;
  /** An order with no lines has no totals, so the band is absent. */
  lineCount: number;
  /** Ride inside the footer bar as the order total alone — the narrow or
   *  short viewport form. */
  inline?: boolean;
}

const Term = (props: {
  label: string;
  testId: string;
  /** The order total — the figure the band exists for. */
  prominent?: boolean;
  /** Set where the term IS the band (the folded form), which then carries the
   *  band's own class and id rather than nesting a second flex row. */
  bandClass?: string;
  bandTestId?: string;
  children: JSX.Element;
}) => (
  <span class={props.bandClass ?? styles.term} data-testid={props.bandTestId}>
    <span class={styles.label}>{props.label}</span>
    <span
      class={props.prominent ? styles.total : styles.figure}
      data-testid={props.testId}
    >
      {props.children}
    </span>
  </span>
);

/*
 * The order's totals band above the status footer (spec S7 § totals band):
 * subtotal, less the supplier discount, giving the order total.
 */
export const PurchaseOrderTotalsStrip: Component<
  PurchaseOrderTotalsStripProps
> = props => {
  const money = (value: number) =>
    formatCurrency(value, props.node.currency?.code);
  const totals = () => orderTotals(props.node);

  // The stored percentage rides the label where one is set.
  const discountLabel = () => {
    const percentage = totals().discountPercentage;
    return percentage
      ? t('label.cost-discount-percentage', {
          percentage: formatNumber(percentage, { maximumFractionDigits: 2 }),
        })
      : t('label.cost-discount');
  };
  // Signed: the discount reads as what it takes off. Negated before
  // formatting, so the sign lands where the locale puts it — and only when
  // there IS one, since a negated zero formats as "-0".
  const discount = () =>
    totals().discount ? money(-totals().discount) : money(0);

  const orderTotal = () => (
    <Term
      label={t('label.cost-order-total')}
      testId="totals-order-total-value"
      prominent
      bandClass={props.inline ? styles.inline : undefined}
      bandTestId={props.inline ? 'purchase-order-totals' : undefined}
    >
      {money(totals().total)}
    </Term>
  );

  return (
    <Show when={props.lineCount > 0}>
      <Show when={!props.inline} fallback={orderTotal()}>
        <div class={styles.strip} data-testid="purchase-order-totals">
          <Term label={t('label.cost-subtotal')} testId="totals-subtotal-value">
            {money(totals().subtotal)}
          </Term>
          <Term label={discountLabel()} testId="totals-discount-value">
            {discount()}
          </Term>
          {orderTotal()}
        </div>
      </Show>
    </Show>
  );
};
