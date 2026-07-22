import { createResource, createSignal, Show, type Component } from 'solid-js';
import { t } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { Select } from '../../../../ui/elements/selectors/Select';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import { XCircleIcon } from '../../../../ui/icons';
import { InternalOrderLines } from '../inboundShipmentLookups.generated';
import { runInboundBatch } from '../inboundShipmentUpdate';

export interface AddFromInternalOrderModalProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  invoiceId: string;
  requisitionId: string;
  isExternal: boolean;
  onAdded: () => void;
}

// Pull a single line from the shipment's linked internal order (spec AC-IO1):
// pre-fills the item + requested quantity, creating its stock line immediately.
// Reachable only through the batch's insertFromInternalOrderLines member.
export const AddFromInternalOrderModal: Component<
  AddFromInternalOrderModalProps
> = props => (
  <Show when={props.open}>
    <Body {...props} />
  </Show>
);

const Body: Component<AddFromInternalOrderModalProps> = props => {
  const [lineId, setLineId] = createSignal<string>();
  const [saving, setSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string>();

  const [data] = createResource(async () => {
    const result = await graphqlFetch(InternalOrderLines, {
      storeId: props.storeId,
      requisitionId: props.requisitionId,
    });
    return result.kind === 'success' &&
      result.data.requisition.__typename === 'RequisitionNode'
      ? result.data.requisition.lines.nodes
      : [];
  });
  const lines = () => data() ?? [];

  const add = async () => {
    const id = lineId();
    if (!id || saving()) return;
    setSaving(true);
    setErrorMessage(undefined);
    const outcome = await runInboundBatch(props.storeId, props.isExternal, {
      insertFromInternalOrderLines: [
        { invoiceId: props.invoiceId, requisitionLineId: id },
      ],
    });
    setSaving(false);
    if (!outcome) return props.onClose();
    if (outcome.errors.size > 0) {
      setErrorMessage([...outcome.errors.values()][0]);
      return;
    }
    props.onAdded();
    props.onClose();
  };

  return (
    <Dialog
      open
      dismissable={!saving()}
      onClose={props.onClose}
      title={t('label.add-from-internal-order')}
      testId="add-internal-order-modal"
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
            disabled={!lineId()}
            onClick={() => void add()}
          >
            {t('button.ok')}
          </Button>
        </>
      }
    >
      <Show when={!data.loading} fallback={<Spinner center />}>
        <Show
          when={lines().length > 0}
          fallback={
            <Alert severity="info">{t('error.no-inbound-items')}</Alert>
          }
        >
          <Select
            label={t('label.item')}
            value={lineId()}
            onValueChange={setLineId}
            options={lines().map(line => ({
              value: line.id,
              label: `${line.item.code} — ${line.itemName}`,
              description: `${t('label.requested-quantity')}: ${line.requestedQuantity}`,
            }))}
          />
        </Show>
      </Show>
    </Dialog>
  );
};
