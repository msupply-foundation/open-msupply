import { createSignal, Show, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { graphqlFetch } from '../../../../api/graphql';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { TrashIcon, XCircleIcon } from '../../../../ui/icons';
import { asRequestStatus, isEditable } from '../../prescriptionRequestStatus';
import { DeletePrescriptionRequests } from '../prescriptionRequests.generated';

export interface DeletePrescriptionRequestsActionProps {
  storeId: string;
  /** The currently-selected request ids. */
  selectedIds: () => string[];
  /** id → status off the loaded rows, for the selection pre-check (AC-D2). */
  statusOf: (id: string) => string | undefined;
  /** Deletion succeeded — clear the selection and re-query. */
  onDeleted: () => void;
}

// The list delete action (spec/prescription-requests AC-D1/D2), the
// prescriptions delete-action shape: the selection is PRE-CHECKED
// client-side — a past-New row in the selection refuses the whole batch with
// a blocking notice and no server call (a sanctioned UI-only guard; the
// server rejection is generic, so the honest outcome is never sending a
// doomed row). The wire delete is ONE atomic batch: a refusal rolls the whole
// thing back, so the list can never end up half-deleted behind a dialog that
// says nothing happened.
type Phase = 'refused' | 'confirm' | 'deleting' | 'error';

export const DeletePrescriptionRequestsAction: Component<
  DeletePrescriptionRequestsActionProps
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
        {t('label.delete')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (
  props: DeletePrescriptionRequestsActionProps & { onClose: () => void }
) => {
  // The pre-check runs once on open (Body mounts per open): any row not New —
  // or not on the loaded page at all — refuses the batch.
  const refused = props
    .selectedIds()
    .some(id => !isEditable(asRequestStatus(props.statusOf(id) ?? '')));
  const [phase, setPhase] = createSignal<Phase>(
    refused ? 'refused' : 'confirm'
  );
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    const result = await graphqlFetch(DeletePrescriptionRequests, {
      storeId: props.storeId,
      ids: props.selectedIds(),
    });
    if (result.kind !== 'success') {
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
      // The title tracks the phase — neither a refused selection nor a
      // rejection is a question (kdd/action-modal), and the dialog offers no
      // action once it is either.
      title={
        phase() === 'refused' || phase() === 'error'
          ? t('heading.cannot-do-that')
          : t('heading.are-you-sure')
      }
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
