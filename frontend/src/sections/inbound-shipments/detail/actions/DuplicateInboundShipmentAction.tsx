import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CheckIcon, CopyIcon, XCircleIcon } from '../../../../ui/icons';
import { DuplicateInboundShipment } from '../../list/createInboundShipment.generated';

export interface DuplicateInboundShipmentActionProps {
  invoiceId: string;
  /** Shipment number and supplier name — for the confirmation copy. */
  number: () => number;
  supplierName: () => string;
  disabled?: boolean;
}

// "Make a copy" (spec AC-DUP1/DUP2, rules → duplicating a shipment). Shared by
// the list (single-selection) and the detail side panel. Duplication always
// produces a fresh New draft; on success we navigate to it. If any stock-in
// line was dropped for a catalogue-gone item, the count is surfaced in a brief
// success step (the spec calls for a toast, but Toast is a ⛔ not-built role —
// see the section README delta — so we use an in-context Alert instead).
type Phase = 'confirm' | 'working' | 'skipped' | 'error';

export const DuplicateInboundShipmentAction: Component<
  DuplicateInboundShipmentActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="secondary"
        icon={<CopyIcon />}
        disabled={props.disabled}
        data-testid="duplicate-shipment-button"
        onClick={() => setOpen(true)}
      >
        {t('button.make-a-copy')}
      </Button>
      <Show when={open()}>
        <Body
          invoiceId={props.invoiceId}
          number={props.number}
          supplierName={props.supplierName}
          onClose={() => setOpen(false)}
        />
      </Show>
    </>
  );
};

const Body = (props: {
  invoiceId: string;
  number: () => number;
  supplierName: () => string;
  onClose: () => void;
}) => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = createSignal<Phase>('confirm');
  const [errorMessage, setErrorMessage] = createSignal<string>();
  const [skipped, setSkipped] = createSignal(0);
  const [newId, setNewId] = createSignal<string>();

  const goToCopy = () => {
    const id = newId();
    props.onClose();
    if (id) navigate(`/${params.storeId}/replenishment/inbound-shipment/${id}`);
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('working');
    const result = await graphqlFetch(DuplicateInboundShipment, {
      storeId: params.storeId,
      id: props.invoiceId,
    });
    if (result.kind !== 'success') return props.onClose();
    const response = result.data.duplicateInboundShipment;
    if (response.__typename === 'DuplicateInboundShipmentNode') {
      setNewId(response.invoice.id);
      if (response.skippedItemCount > 0) {
        setSkipped(response.skippedItemCount);
        setPhase('skipped');
        return;
      }
      goToCopy();
      return;
    }
    if (response.__typename === 'DuplicateInboundShipmentError') {
      setErrorMessage(response.error.description);
      setPhase('error');
    }
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'working'}
      onClose={props.onClose}
      icon={<CopyIcon />}
      testId="confirmation-modal"
      title={t('heading.are-you-sure')}
      description={
        <Switch
          fallback={t('messages.confirm-duplicate-shipment', {
            number: props.number(),
            supplierName: props.supplierName(),
          })}
        >
          <Match when={phase() === 'skipped'}>
            <Alert severity="warning">
              {tPlural('messages.duplicate-lines-skipped', skipped())}
            </Alert>
          </Match>
          <Match when={phase() === 'error'}>
            <Alert severity="error">{errorMessage()}</Alert>
          </Match>
        </Switch>
      }
      actions={
        <Switch
          fallback={
            <>
              <Show when={phase() === 'confirm'}>
                <Button
                  variant="secondary"
                  icon={<XCircleIcon />}
                  confirms="cancel"
                  onClick={props.onClose}
                >
                  {t('button.cancel')}
                </Button>
              </Show>
              <Button
                confirms="plain"
                data-testid="confirmation-modal-ok"
                loading={phase() === 'working'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'skipped'}>
            <Button icon={<CheckIcon />} confirms="plain" onClick={goToCopy}>
              {t('button.ok')}
            </Button>
          </Match>
          <Match when={phase() === 'error'}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              confirms="plain"
              onClick={props.onClose}
            >
              {t('button.close')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
