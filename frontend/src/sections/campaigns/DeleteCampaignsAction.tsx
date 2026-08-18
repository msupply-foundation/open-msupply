import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t, tPlural } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import { DeleteCampaigns } from './campaigns.generated';

// The register's one bulk action — spec/campaigns S1 § selection actions + S3.
//
// Deletion is ATOMIC: one mutation carries the whole selection and the server
// deletes it in one transaction, so there are exactly two domain outcomes:
//
//   deleted  → every row leaves the register and the selection clears;
//              closure + the refreshed list is the confirmation (D21).
//   rejected → NOTHING was deleted. The only domain rejection is a selected
//              campaign no longer in the register (deleted elsewhere since the
//              list was read), so the generic could-not-delete notice shows
//              while the owner re-reads the register behind it; DISMISSING the
//              notice is when the vanished rows leave the kept selection —
//              pruning earlier could empty the selection and unmount the
//              selection bar this dialog lives in, taking the notice with it.
//
// A transport/auth failure is neither: it is already surfaced globally, and
// whether the delete committed is unknown, so the dialog only releases its
// busy state (the same split as the editor's `failed` outcome).
//
// Nothing is pre-checked: there is no in-use guard on the server (a campaign
// tagged on stock deletes just the same), so the client has nothing to mirror
// and the whole selection is submitted (ui-standards validation.md § actions).

export interface DeleteCampaignsActionProps {
  /** The currently-selected campaign ids. */
  selectedIds: () => string[];
  /** The register's shared permission gate: true to proceed; otherwise the
   * denial has been reported (the global permission-denied modal). */
  guardEdit: () => boolean;
  /** The whole selection was deleted. */
  onDeleted: () => void;
  /** The delete was rejected — nothing deleted; the owner re-reads the
   * register behind the still-open could-not-delete notice. */
  onRejected: () => void;
  /** The could-not-delete notice was dismissed: the owner prunes the kept
   * selection against the register as it now is. */
  onRejectionDismissed: () => void;
}

type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteCampaignsAction: Component<
  DeleteCampaignsActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  // Refused at the click, before the confirmation opens — the permission is
  // standing state the client already holds (ui-standards validation.md §
  // permission gating).
  const start = () => {
    if (props.guardEdit()) setOpen(true);
  };
  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        data-testid="delete-lines-button"
        onClick={start}
      >
        {t('button.delete-lines')}
      </Button>
      {/* Mounted only while open: a closed-but-mounted <dialog> still carries
          its ids (e2e/TESTIDS.md § an id for a transient surface). */}
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: DeleteCampaignsActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  // Count snapshotted on open (Body mounts once per open), so the permanence
  // notice can't shift if the selection changes behind the dialog.
  const count = props.selectedIds().length;

  // Every way out of the dialog routes here. Dismissing the could-not-delete
  // notice is what triggers the owner's prune — see the header comment for why
  // it cannot run while the notice is still up.
  const close = () => {
    const rejected = phase() === 'error';
    props.onClose();
    if (rejected) props.onRejectionDismissed();
  };

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    // returnGraphqlErrors, because the response union has no error member: the
    // not-found rejection is a top-level `Bad user input`, and without the
    // opt-in it would trip the global unexpected-error modal instead of this
    // dialog's own could-not-delete phase.
    const result = await graphqlFetch(
      DeleteCampaigns,
      { ids: props.selectedIds() },
      { returnGraphqlErrors: true }
    );
    if (result.kind === 'graphqlError') {
      // The domain rejection (a selected campaign no longer in the register) —
      // and the delete is atomic, so NOTHING was deleted. The owner re-reads
      // the register behind this dialog's could-not-delete phase; the kept
      // selection is pruned when the notice is dismissed (ui-surface S1).
      props.onRejected();
      setPhase('error');
      return;
    }
    if (result.kind !== 'success') {
      // Transport/auth failure — already surfaced globally (the
      // unexpected-error, re-login or permission modal), and whether the
      // delete committed is unknown, so the could-not-delete notice would
      // claim more than is known. Release the busy state back to the
      // confirmation; the user retries or cancels.
      setPhase('confirm');
      return;
    }
    // Success: close first (closure is the confirmation), then hand back — the
    // callback clears the selection, which unmounts the selection bar this
    // dialog lives in.
    props.onClose();
    props.onDeleted();
  };

  return (
    <Dialog
      open
      // Blocking while the delete is in flight.
      dismissable={phase() !== 'deleting'}
      onClose={close}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      title={t('heading.are-you-sure')}
      description={
        <Show
          when={phase() === 'error'}
          // The permanence notice, count-pluralised. It says nothing about
          // references, because deletion is never blocked by them and never
          // changes what is tagged (rules § deleting a campaign).
          fallback={tPlural('messages.confirm-delete-campaigns', count)}
        >
          {/* The generic could-not-delete notice — it names no campaign; the
              refused selection deleted nothing (rules § deleting a campaign). */}
          <Alert severity="error" testId="campaigns-cant-delete">
            {t('messages.cant-delete-generic')}
          </Alert>
        </Show>
      }
      actions={
        <Show
          when={phase() === 'error'}
          fallback={
            <>
              <Show when={phase() === 'confirm'}>
                <CancelButton onClick={close} />
              </Show>
              {/* OK, not Save — the confirming action genuinely isn't a save —
                  carrying the destructive emphasis (D55). */}
              <Button
                variant="danger"
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
          <CancelButton onClick={close} />
        </Show>
      }
    />
  );
};
