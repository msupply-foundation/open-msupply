import { type Component } from 'solid-js';
import { t } from '../../../../intl';
import { formatNumber } from '../../../../intl/formatNumber';
import { ContentContainer } from '../../../../ui/layout/ContentContainer/ContentContainer';
import { FormColumns } from '../../../../ui/layout/Form/FormColumns';
import { FormColumn } from '../../../../ui/layout/Form/FormColumn';
import { FormSection } from '../../../../ui/layout/Form/FormSection';
import { LabelledValue } from '../../../../ui/elements/typography/LabelledValue';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { InfoTooltip } from '../../../../ui/elements/feedback/InfoTooltip';
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

// Money → always 2dp, locale-formatted, no symbol: each field names its
// currency in its own label (PO vs local), the same convention the sibling
// Financial tab uses so the two read consistently.
const money = (value: number): string =>
  formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// The detail "Currency" tab (spec S3 tabs → Currency; contract → Currency tab
// derivation). A two-column form (kdd/form-layout — the stock detail form's
// vocabulary) reconciling the purchase order's currency against the store's
// home (local) currency: the left column holds the exchange rate and the
// editable charges, the right column the derived totals, all read-only.
//
// The rate is home-currency units per one PO-currency unit, so foreign → local
// is × rate (a zero rate is treated as 1 for the displays). Editing the rate or
// either charge on a PO-linked shipment recomputes line costs server-side (the
// save refetches the lines page — rules → header fields); the three inputs save
// on blur (the debounced edit flushes on focus-out of the form).
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
    // Save-on-blur: flush any pending edit when focus leaves the form region.
    // `padded` because the detail Page is fillBody (full-bleed for the table
    // tabs), so the body has no edge padding for this form tab to inherit.
    <ContentContainer size="form" padded onFocusOut={() => edit.flush()}>
      <FormColumns>
        {/* Left — the read-only PO currency, the editable rate, and charges. */}
        <FormColumn>
          <FormSection title={t('heading.exchange-rate')}>
            <LabelledValue variant="field" label={t('label.po-currency')}>
              {poCurrency()?.code ?? '—'}
            </LabelledValue>
            <NumberField
              label={t('label.currency-rate')}
              labelInfo={
                <InfoTooltip text={t('messages.currency-rate-info')} />
              }
              value={rate()}
              min={0}
              decimalLimit={4}
              disabled={props.disabled || isHome()}
              onChange={onRateChange}
            />
          </FormSection>

          <FormSection title={t('heading.charges')}>
            <NumberField
              label={t('label.charges-in-po-currency')}
              value={edit.state.chargesForeignCurrency}
              min={0}
              decimalLimit={2}
              disabled={props.disabled}
              onChange={v => edit.setField('chargesForeignCurrency', v ?? 0)}
            />
            <LabelledValue
              variant="field"
              label={t('label.charges-a-converted-to-local')}
            >
              {money(chargesConvertedToLocal())}
            </LabelledValue>
            <NumberField
              label={t('label.charges-b-in-local-currency')}
              value={edit.state.chargesLocalCurrency}
              min={0}
              decimalLimit={2}
              disabled={props.disabled}
              onChange={v => edit.setField('chargesLocalCurrency', v ?? 0)}
            />
          </FormSection>
        </FormColumn>

        {/* Right — all read-only, derived. */}
        <FormColumn>
          <FormSection title={t('heading.totals')}>
            <LabelledValue
              variant="field"
              label={t('label.total-goods-po-currency')}
            >
              {money(totalGoodsPo())}
            </LabelledValue>
            <LabelledValue
              variant="field"
              label={t('label.total-goods-local-currency')}
            >
              {money(totalGoodsLocal())}
            </LabelledValue>
            <LabelledValue variant="field" label={t('label.total-charges')}>
              {money(totalCharges())}
            </LabelledValue>
            <LabelledValue variant="field" label={t('label.cost-adjustment')}>
              {`${costAdjustmentPct().toFixed(2)}%`}
            </LabelledValue>
          </FormSection>
        </FormColumn>
      </FormColumns>
    </ContentContainer>
  );
};
