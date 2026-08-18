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
// deletes it in one transaction, so there are exactly two outcomes:
//
//   deleted  → every row leaves the register and the selection clears;
//              closure + the refreshed list is the confirmation (D21).
//   rejected → NOTHING was deleted. The only domain rejection is a selected
//              campaign no longer in the register (deleted elsewhere since the
//              list was read), so the generic could-not-delete notice shows
//              while the owner re-reads the register and drops the vanished
//              rows from the kept selection.
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
  /** The delete was refused — nothing deleted; re-read and prune the selection. */
  onRejected: () => void;
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
    // The response union has no error member (every rejection is a top-level
    // error), so success of the fetch IS success of the delete.
    if (result.kind !== 'success') {
      // Atomic: nothing was deleted. The owner re-reads and prunes; the notice
      // stays in this dialog.
      props.onRejected();
      setPhase('error');
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
      onClose={props.onClose}
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
                <CancelButton onClick={props.onClose} />
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
          <CancelButton onClick={props.onClose} />
        </Show>
      }
    />
  );
};
