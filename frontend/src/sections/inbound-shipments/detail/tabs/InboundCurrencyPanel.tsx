import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import { formatNumber } from '../../../../intl/formatNumber';
import { FieldRow } from '../../../../ui/elements/inputs/FieldRow';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { InfoOutlineIcon } from '../../../../ui/icons';
import { createDebouncedEdit } from '../../../../domain/debouncedEdit/createDebouncedEdit';
import type { InboundInfoFragment } from '../inboundShipmentDetail.generated';

// The three editable Currency-tab fields, written back on blur (save-on-blur;
// the debounce also settles a burst into one save). Keys match
// UpdateInboundShipmentInput.
type CurrencyFields = {
  currencyRate: number;
  chargesForeignCurrency: number;
  chargesLocalCurrency: number;
};

const money = (value: number): string =>
  formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// The detail "Currency" tab (spec S3 tabs → Currency; contract → Currency tab
// derivation). A two-column form reconciling the purchase order's currency
// against the store's home (local) currency. The rate is home-currency units
// per one PO-currency unit, so foreign → local is × rate (a zero rate is
// treated as 1 for the displays). Editing the rate or either charge on a
// PO-linked shipment recomputes line costs server-side (the save refetches the
// lines page — rules → header fields); the three inputs save on blur.
export const InboundCurrencyPanel: Component<{
  node: InboundInfoFragment;
  disabled: boolean;
  onSave: (patch: Partial<CurrencyFields>) => void;
}> = props => {
  const edit = createDebouncedEdit<CurrencyFields>({
    id: () => props.node.id,
    initial: () => ({
      currencyRate: props.node.currencyRate,
      chargesForeignCurrency: props.node.chargesForeignCurrency,
      chargesLocalCurrency: props.node.chargesLocalCurrency,
    }),
    save: patch => props.onSave(patch),
  });

  // The PO's currency (read-only). When it IS the home currency the rate is
  // pinned to 1 and the input disabled.
  const poCurrency = () => props.node.purchaseOrder?.currency;
  const isHome = () => poCurrency()?.isHomeCurrency ?? false;
  const rate = () => (isHome() ? 1 : edit.state.currencyRate);
  // A zero (or negative) rate is treated as 1 for the derived displays.
  const effectiveRate = () => (rate() > 0 ? rate() : 1);

  const chargesConvertedToLocal = () =>
    edit.state.chargesForeignCurrency * effectiveRate();
  const totalGoodsPo = () =>
    props.node.purchaseOrder?.orderTotalAfterDiscount ?? 0;
  const totalGoodsLocal = () => totalGoodsPo() * effectiveRate();
  const totalCharges = () =>
    edit.state.chargesForeignCurrency * effectiveRate() +
    edit.state.chargesLocalCurrency;
  const costAdjustmentPct = () =>
    totalGoodsLocal() > 0 ? (totalCharges() / totalGoodsLocal()) * 100 : 0;

  // Ignore a non-positive rate client-side (also rejected server-side) — leave
  // the buffer holding the last good value so nothing is saved.
  const onRateChange = (value: number | undefined) => {
    if (value !== undefined && value > 0) edit.setField('currencyRate', value);
  };

  return (
    <div
      style={{
        display: 'flex',
        'flex-wrap': 'wrap',
        gap: 'var(--space-8)',
        padding: 'var(--space-4)',
      }}
      // Save-on-blur: flush any pending edit when focus leaves the form region.
      onFocusOut={() => edit.flush()}
    >
      {/* Left column — the read-only PO currency plus the three editable fields. */}
      <div style={{ flex: '1 1 20rem', 'min-width': '18rem' }}>
        <FieldRow label={t('label.po-currency')}>
          <span>{poCurrency()?.code ?? '—'}</span>
        </FieldRow>
        <FieldRow
          label={
            <span
              style={{
                display: 'inline-flex',
                'align-items': 'center',
                gap: 'var(--space-1)',
              }}
            >
              {t('label.currency-rate')}
              <span
                title={t('messages.currency-rate-info')}
                aria-label={t('messages.currency-rate-info')}
                style={{ display: 'inline-flex', color: 'var(--primary-main)' }}
              >
                <InfoOutlineIcon />
              </span>
            </span>
          }
        >
          <NumberField
            label={t('label.currency-rate')}
            hideLabel
            value={rate()}
            min={0}
            decimalLimit={4}
            disabled={props.disabled || isHome()}
            onChange={onRateChange}
          />
        </FieldRow>
        <FieldRow label={t('label.charges-in-po-currency')}>
          <NumberField
            label={t('label.charges-in-po-currency')}
            hideLabel
            value={edit.state.chargesForeignCurrency}
            min={0}
            decimalLimit={2}
            disabled={props.disabled}
            onChange={v => edit.setField('chargesForeignCurrency', v ?? 0)}
          />
        </FieldRow>
        <FieldRow label={t('label.charges-a-converted-to-local')}>
          <span>{money(chargesConvertedToLocal())}</span>
        </FieldRow>
        <FieldRow label={t('label.charges-b-in-local-currency')}>
          <NumberField
            label={t('label.charges-b-in-local-currency')}
            hideLabel
            value={edit.state.chargesLocalCurrency}
            min={0}
            decimalLimit={2}
            disabled={props.disabled}
            onChange={v => edit.setField('chargesLocalCurrency', v ?? 0)}
          />
        </FieldRow>
      </div>

      {/* Right column — all read-only, derived. */}
      <div style={{ flex: '1 1 20rem', 'min-width': '18rem' }}>
        <FieldRow label={t('label.total-goods-po-currency')}>
          <span>{money(totalGoodsPo())}</span>
        </FieldRow>
        <FieldRow label={t('label.total-goods-local-currency')}>
          <span>{money(totalGoodsLocal())}</span>
        </FieldRow>
        <FieldRow label={t('label.total-charges')}>
          <span>{money(totalCharges())}</span>
        </FieldRow>
        <FieldRow label={t('label.cost-adjustment')}>
          <span>{costAdjustmentPct().toFixed(2)}%</span>
        </FieldRow>
      </div>
    </div>
  );
};
