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
  /**
   * Ride INSIDE the footer bar as a pair of plain items instead of taking a
   * band of its own — the narrow-viewport form. A row of type is cheap on a
   * desktop and expensive on a tablet, where the same figures fit in the
   * space the status bar already has; the band's own surface (tint, rule,
   * padding) is what a row of its own buys, so the inline form drops it.
   */
  inline?: boolean;
}

/*
 * The totals band above the status footer (spec/outbound-shipments S3 § line
 * table). A row of its own rather than a cluster inside the status bar: the
 * bar is a row of controls, and a figure among them reads as one — but the
 * row is kept to about a line of type, so having its own row costs a fraction
 * of what the old pinned table-footer band did.
 */
export const OutboundTotalsStrip: Component<
  OutboundTotalsStripProps
> = props => (
  <Show when={props.totals?.()}>
    {totals => (
      <div
        class={props.inline ? styles.inline : styles.strip}
        data-testid="shipment-totals"
      >
        <span class={styles.label}>{t('label.total')}</span>
        <span class={styles.figures}>
          {t('label.shipment-totals', {
            price: formatCurrencyCell(totals().price),
            volume: formatNumber(totals().volume, { maximumFractionDigits: 2 }),
          })}
        </span>
      </div>
    )}
  </Show>
);
