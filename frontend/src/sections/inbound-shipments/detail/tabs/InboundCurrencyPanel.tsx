import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import type { InboundInfoFragment } from '../inboundShipmentDetail.generated';

const money = (value: number): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// The detail "Currency" tab (spec S3 tabs → Currency; PO-linked shipments
// only): PO currency + rate (read-only here — the rate is edited via the side
// panel's change-currency), local vs foreign charges, total goods and charges,
// and the computed cost-adjustment percentage. Captured at header level (the
// spec notes the finer per-line reconciliation isn't fully specced).
export const InboundCurrencyPanel: Component<{
  node: InboundInfoFragment;
}> = props => {
  const goods = () => props.node.pricing.stockTotalBeforeTax;
  const charges = () =>
    props.node.chargesLocalCurrency + props.node.chargesForeignCurrency;
  // Cost-adjustment % — charges as a share of the goods value.
  const adjustment = () => (goods() > 0 ? (charges() / goods()) * 100 : 0);

  return (
    <div style={{ padding: 'var(--space-4)', 'max-width': '32rem' }}>
      <FieldRow label={t('label.currency')}>
        <span>{props.node.currency?.code ?? '—'}</span>
      </FieldRow>
      <FieldRow label={t('label.currency-rate')}>
        <span>{props.node.currencyRate}</span>
      </FieldRow>
      <FieldRow label={t('label.charges-local')}>
        <span>{money(props.node.chargesLocalCurrency)}</span>
      </FieldRow>
      <FieldRow label={t('label.charges-foreign')}>
        <span>{money(props.node.chargesForeignCurrency)}</span>
      </FieldRow>
      <FieldRow label={t('label.total-goods')}>
        <span>{money(goods())}</span>
      </FieldRow>
      <FieldRow label={t('label.total-charges')}>
        <span>{money(charges())}</span>
      </FieldRow>
      <FieldRow label={t('label.cost-adjustment')}>
        <span>{adjustment().toFixed(2)}%</span>
      </FieldRow>
    </div>
  );
};
