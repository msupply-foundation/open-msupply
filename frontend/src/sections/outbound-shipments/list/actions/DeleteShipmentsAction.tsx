import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import {
  CheckIcon,
  InfoIcon,
  TrashIcon,
  XCircleIcon,
} from '../../../../ui/icons';
import { isDeletable } from '../../outboundStatus';
import { DeleteOutboundShipments } from '../outboundShipments.generated';

export interface DeleteShipmentsActionProps {
  storeId: string;
  /** The selected rows' id + status (the pre-check needs the status). */
  selectedRows: () => { id: string; status: string }[];
  /** Deletion succeeded — clear the selection and re-query. */
  onDeleted: () => void;
}

// The list's bulk delete (spec S1 bulk actions, OMS-REG-DIST-01.21): the whole batch is
// refused when ANY selected shipment is not deletable — a UI pre-check with a
// blocking notice instead of the confirmation, no server call (rules.md § the
// list; controls › action feedback); per-row enforcement remains server-side.
// Same confirm → deleting → success | error dialog shape as the stocktakes
// delete action (kdd/action-modal).
type Phase = 'confirm' | 'deleting' | 'success' | 'error';

export const DeleteShipmentsAction: Component<
  DeleteShipmentsActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  const [blockedOpen, setBlockedOpen] = createSignal(false);

  const onClick = () => {
    // Pre-check: every selected shipment must be deletable (NEW / ALLOCATED /
    // PICKED) or the whole batch is refused with an explanatory notice in
    // place of the confirmation (OMS-REG-DIST-01.21).
    if (props.selectedRows().some(row => !isDeletable(row.status))) {
      setBlockedOpen(true);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="secondary"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={onClick}
      >
        {t('label.delete')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
      {/* Non-deletable selection: an info-only notice, no server call. */}
      <Show when={blockedOpen()}>
        <Dialog
          open
          onClose={() => setBlockedOpen(false)}
          icon={<InfoIcon />}
          title={t('heading.are-you-sure')}
          description={
            <Alert severity="error">{t('messages.cant-delete-generic')}</Alert>
          }
          actions={
            <Button
              variant="secondary"
              icon={<CheckIcon />}
              confirms="plain"
              onClick={() => setBlockedOpen(false)}
            >
              {t('button.ok')}
            </Button>
          }
        />
      </Show>
    </>
  );
};

const Body = (props: DeleteShipmentsActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  // Snapshotted on open so the message can't shift behind the dialog.
  const count = props.selectedRows().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const result = await graphqlFetch(DeleteOutboundShipments, {
      storeId: props.storeId,
      ids: props.selectedRows().map(row => row.id),
    });
    if (result.kind !== 'success') {
      // transport/unexpected → the global modal already surfaced it.
      setPhase('confirm');
      return;
    }
    const items =
      result.data.batchOutboundShipment.deleteOutboundShipments ?? [];
    const failed = items.some(
      item => item.response.__typename === 'DeleteOutboundShipmentError'
    );
    if (failed) {
      setPhase('error');
      return;
    }
    // Success: hand back to the list (clear selection + re-query behind the
    // dialog), then report in the dialog itself (controls › dialogs).
    props.onDeleted();
    setPhase('success');
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'deleting'}
      onClose={props.onClose}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      title={t('heading.are-you-sure')}
      description={
        <Switch fallback={tPlural('messages.confirm-delete-shipments', count)}>
          <Match when={phase() === 'error'}>
            <Alert severity="error">{t('messages.cant-delete-generic')}</Alert>
          </Match>
          <Match when={phase() === 'success'}>
            {tPlural('messages.deleted-shipments', count)}
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
                variant="secondary"
                icon={<TrashIcon />}
                confirms="plain"
                data-testid="confirmation-modal-ok"
                loading={phase() === 'deleting'}
                onClick={() => void run()}
              >
                {t('label.delete')}
              </Button>
            </>
          }
        >
          <Match when={phase() === 'success'}>
            <Button
              variant="secondary"
              icon={<CheckIcon />}
              confirms="plain"
              onClick={props.onClose}
            >
              {t('button.ok')}
            </Button>
          </Match>
          <Match when={phase() === 'error'}>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              confirms="cancel"
              onClick={props.onClose}
            >
              {t('button.cancel')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
