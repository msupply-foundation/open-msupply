import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TrashIcon, XCircleIcon } from '../../../../ui/icons';
import {
  asPrescriptionStatus,
  canDeletePrescription,
} from '../../prescriptionStatus';
import { DeletePrescriptions } from '../prescriptions.generated';

export interface DeletePrescriptionsActionProps {
  storeId: string;
  /** The currently-selected prescription ids. */
  selectedIds: () => string[];
  /** id → status off the loaded rows, for the selection pre-check (AC-D3). */
  statusOf: (id: string) => string | undefined;
  /** Deletion succeeded — clear the selection and re-query. */
  onDeleted: () => void;
}

// The prescriptions-list delete action (spec/prescriptions AC-D3), the
// stocktakes delete-action shape with one deliberate extra: the selection is
// PRE-CHECKED client-side. A VERIFIED/CANCELLED row in the selection refuses
// the WHOLE batch — a blocking notice in place of the confirmation, no server
// call — because this is a sanctioned UI-only guard (ui-standards §
// validation): the server batch is all-or-nothing AND its response reports
// success for rows a failure rolled back (contract § deletion wire trap), so
// an honest outcome can only be guaranteed by never sending a doomed batch.
type Phase = 'refused' | 'confirm' | 'deleting' | 'error';

export const DeletePrescriptionsAction: Component<
  DeletePrescriptionsActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={() => setOpen(true)}
      >
        {t('button.delete-lines')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (
  props: DeletePrescriptionsActionProps & { onClose: () => void }
) => {
  // The pre-check runs once on open (Body mounts per open): any row not
  // NEW/PICKED — or not on the loaded page at all — refuses the batch.
  const refused = props
    .selectedIds()
    .some(
      id =>
        !canDeletePrescription(
          asPrescriptionStatus(props.statusOf(id) ?? 'CANCELLED')
        )
    );
  const [phase, setPhase] = createSignal<Phase>(
    refused ? 'refused' : 'confirm'
  );
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const result = await graphqlFetch(DeletePrescriptions, {
      storeId: props.storeId,
      ids: props.selectedIds(),
    });
    if (result.kind !== 'success') {
      setPhase('confirm');
      return;
    }
    const items = result.data.batchPrescription.deletePrescriptions ?? [];
    const failed = items.some(i => 'error' in i.response);
    if (failed) {
      setPhase('error');
      return;
    }
    props.onClose();
    props.onDeleted();
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
        <Show
          when={phase() === 'refused' || phase() === 'error'}
          fallback={tPlural('messages.confirm-delete-prescriptions', count)}
        >
          <Alert severity="error">{t('messages.cant-delete-generic')}</Alert>
        </Show>
      }
      actions={
        <Show
          when={phase() === 'refused' || phase() === 'error'}
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
                {t('button.ok')}
              </Button>
            </>
          }
        >
          <Button
            variant="secondary"
            icon={<XCircleIcon />}
            confirms="plain"
            onClick={props.onClose}
          >
            {t('button.close')}
          </Button>
        </Show>
      }
    />
  );
};
