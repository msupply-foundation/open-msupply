import { Show, type Component } from 'solid-js';
import { formatNumber, t } from '../../../intl';
import { formatCurrencyCell } from '../../../ui/elements/table/tableHelpers';
import styles from './OutboundTotalsStrip.module.css';

export interface OutboundTotalsStripProps {
  /**
   * The shipment's whole-document totals (price before tax, volume) — server
   * aggregates over every line, not the page on screen (D45). Undefined on a
   * shipment with no lines: a total of nothing, beside an empty state that has
   * already said so, and the strip then costs nothing at all.
   */
  totals?: () => { price: number; volume: number };
}

/*
 * The totals band above the status footer (spec/outbound-shipments S3 § line
 * table). A row of its own rather than a cluster inside the status bar: the
 * bar is a row of controls, and a figure among them reads as one — but the
 * row is kept to about a line of type, so having its own row costs a fraction
 * of what the old pinned table-footer band did.
 */
export const OutboundTotalsStrip: Component<OutboundTotalsStripProps> = props => (
  <Show when={props.totals?.()}>
    {totals => (
      <div class={styles.strip} data-testid="shipment-totals">
        {t('label.shipment-totals', {
          price: formatCurrencyCell(totals().price),
          volume: formatNumber(totals().volume, { maximumFractionDigits: 2 }),
        })}
      </div>
    )}
  </Show>
);
