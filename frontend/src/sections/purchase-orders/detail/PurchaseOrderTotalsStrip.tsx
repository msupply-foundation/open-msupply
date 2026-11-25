import { Show, type Component, type JSX } from 'solid-js';
import { t, locale } from '@/intl';
import { formatCurrency, getCurrencyInfo, homeCurrency } from '@/intl/currency';
import { orderTotals } from './purchaseOrderPricing';
import type { PurchaseOrderInfoFragment } from './purchaseOrderDetail.generated';
import styles from './PurchaseOrderTotalsStrip.module.css';

export interface PurchaseOrderTotalsStripProps {
  node: PurchaseOrderInfoFragment;
  /** The order's whole line set. With none, the order has no totals and the
   *  band is absent; its service lines are the order's charges. */
  lines: Parameters<typeof orderTotals>[1];
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
  /** After the figure, outside it — so the figure's own text stays bare. */
  suffix?: JSX.Element;
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
    {props.suffix}
  </span>
);

/*
 * The order's totals band above the status footer (spec S7 § totals band):
 * subtotal, plus the order's charges where it has any, giving the order total.
 */
export const PurchaseOrderTotalsStrip: Component<
  PurchaseOrderTotalsStripProps
> = props => {
  const currencyCode = () => props.node.currency?.code;
  const money = (value: number) => formatCurrency(value, currencyCode());
  const totals = () => orderTotals(props.node, props.lines);

  // "$" alone doesn't say whose dollar, so the code follows the total where
  // that is the symbol the order's currency shows as.
  const dollarCode = () => {
    const code = currencyCode() ?? homeCurrency();
    return getCurrencyInfo(code, locale()).symbol === '$' ? code : undefined;
  };

  const orderTotal = () => (
    <Term
      label={t('label.cost-order-total')}
      testId="totals-order-total-value"
      prominent
      bandClass={props.inline ? styles.inline : undefined}
      bandTestId={props.inline ? 'purchase-order-totals' : undefined}
      suffix={
        <Show when={dollarCode()}>
          {code => (
            <span class={styles.code} data-testid="totals-currency-code">
              ({code()})
            </span>
          )}
        </Show>
      }
    >
      {money(totals().total)}
    </Term>
  );

  return (
    <Show when={props.lines.length > 0}>
      <Show when={!props.inline} fallback={orderTotal()}>
        <div class={styles.strip} data-testid="purchase-order-totals">
          <Term label={t('label.cost-subtotal')} testId="totals-subtotal-value">
            {money(totals().subtotal)}
          </Term>
          <Show when={totals().hasCharges}>
            <Term label={t('label.cost-charges')} testId="totals-charges-value">
              {money(totals().charges)}
            </Term>
          </Show>
          {orderTotal()}
        </div>
      </Show>
    </Show>
  );
};
