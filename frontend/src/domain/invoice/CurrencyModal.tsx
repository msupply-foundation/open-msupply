import { createResource, createSignal, Show, type Component } from 'solid-js';
import { t } from '../../intl';
import { graphqlFetch } from '../../api/graphql';
import { Dialog } from '../../ui/elements/feedback/Dialog';
import { Alert } from '../../ui/elements/feedback/Alert';
import {
  CancelButton,
  DialogSaveButton,
} from '../../ui/elements/buttons/StandardButtons';
import { Select } from '../../ui/elements/selectors/Select';
import { NumberField } from '../../ui/elements/inputs/NumberField';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { ActiveCurrencies } from './invoiceModals.generated';

// The change-currency modal BOTH shipment verticals host (outbound S3 side
// panel, inbound S3 charges): a non-home currency + its exchange rate, saved
// via the hosting vertical's `save` (each maps to its own header update).
// The server rejects a foreign currency the store doesn't allow (or a
// store-linked other party) and requires a positive rate — the typed message
// surfaces inline; a transport failure is already surfaced globally.

export type CurrencySaveResult =
  { kind: 'saved' } | { kind: 'error'; message: string } | { kind: 'failed' };

export interface CurrencyModalProps {
  open: boolean;
  onClose: () => void;
  /** The shipment's current currency/rate, seeding the fields. */
  initialCurrencyId: string | undefined;
  initialRate: number;
  /** Commit {currencyId, currencyRate}; 'saved' closes the modal. */
  save: (input: {
    currencyId: string;
    currencyRate: number;
  }) => Promise<CurrencySaveResult>;
}

export const CurrencyModal: Component<CurrencyModalProps> = props => (
  <Show when={props.open}>
    <Body {...props} />
  </Show>
);

const Body: Component<CurrencyModalProps> = props => {
  const [currencyId, setCurrencyId] = createSignal(
    props.initialCurrencyId ?? ''
  );
  const [rate, setRate] = createSignal(props.initialRate);
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const [data] = createResource(async () => {
    const result = await graphqlFetch(ActiveCurrencies, {});
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
    const result = await props.save({
      currencyId: currencyId(),
      currencyRate: rate(),
    });
    setSaving(false);
    if (result.kind === 'saved') props.onClose();
    else if (result.kind === 'error') setErrorMessage(result.message);
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
          <CancelButton
            data-testid="dialog-button-cancel"
            onClick={props.onClose}
          />
          <DialogSaveButton
            data-testid="dialog-button-ok"
            loading={saving()}
            disabled={!currencyId()}
            onClick={() => void save()}
          />
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
