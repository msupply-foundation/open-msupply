import { createResource, createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { Select } from '../../../../ui/elements/selectors/Select';
import { NumberField } from '../../../../ui/elements/inputs/NumberField';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import { XCircleIcon } from '../../../../ui/icons';
import { InboundCurrencies } from '../inboundShipmentLookups.generated';
import {
  isExternalShipment,
  updateInboundShipment,
} from '../inboundShipmentUpdate';
import type { InboundInfoFragment } from '../inboundShipmentDetail.generated';

export interface CurrencyModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  node: InboundInfoFragment;
  onSaved: (node: InboundInfoFragment) => void;
}

// The change-currency modal (spec S3 charges → foreign currency). Sets a
// non-home currency + its exchange rate; the server rejects a foreign currency
// when the store doesn't allow it or the supplier is itself a store, and
// requires a positive rate — surfaced inline.
export const CurrencyModal: Component<CurrencyModalProps> = props => (
  <Show when={props.open}>
    <Body {...props} />
  </Show>
);

const Body: Component<CurrencyModalProps> = props => {
  const [currencyId, setCurrencyId] = createSignal(
    props.node.currency?.id ?? ''
  );
  const [rate, setRate] = createSignal(props.node.currencyRate);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const [data] = createResource(async () => {
    const result = await graphqlFetch(InboundCurrencies, {});
    return result.kind === 'success' &&
      result.data.currencies.__typename === 'CurrencyConnector'
      ? result.data.currencies.nodes
      : [];
  });
  const currencies = () => data() ?? [];

  const save = async () => {
    if (saving()) return;
    setSaving(true);
    setErrorMessage(undefined);
    const result = await updateInboundShipment(
      props.storeId,
      isExternalShipment(props.node),
      { id: props.node.id, currencyId: currencyId(), currencyRate: rate() }
    );
    setSaving(false);
    if (result.kind === 'saved') {
      props.onSaved(result.node);
      props.onClose();
    } else if (result.kind === 'error') {
      setErrorMessage(result.message);
    }
  };

  return (
    <Dialog
      open
      dismissable={!saving()}
      onClose={props.onClose}
      title={t('label.currency')}
      testId="currency-modal"
      actionsLead={
        <Show when={errorMessage()}>
          <Alert severity="error">{errorMessage()}</Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            onClick={props.onClose}
          >
            {t('button.cancel')}
          </Button>
          <Button
            data-testid="dialog-button-ok"
            loading={saving()}
            disabled={!currencyId()}
            onClick={() => void save()}
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      <Show when={!data.loading} fallback={<Spinner center />}>
        <Select
          label={t('label.currency')}
          value={currencyId()}
          onValueChange={setCurrencyId}
          options={currencies().map(c => ({
            value: c.id,
            label: c.isHomeCurrency ? `${c.code} (${t('label.home')})` : c.code,
          }))}
        />
        <NumberField
          label={t('label.currency-rate')}
          value={rate()}
          min={0}
          decimalLimit={6}
          onChange={v => setRate(v ?? 0)}
        />
      </Show>
    </Dialog>
  );
};
