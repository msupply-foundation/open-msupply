import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t, tPlural } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import { DeleteCampaign } from './campaigns.generated';
import { campaignDeleted, runCampaignDeletes } from './campaignDelete';

// The register's one bulk action — spec/campaigns S1 § selection actions + S3.
//
// Deletion is PER CAMPAIGN: there is no bulk operation, so this is n
// independent deletes with no surrounding transaction. Partial success is
// therefore the normal shape, and the two outcomes differ in what the caller
// does with the selection:
//
//   all deleted  → the rows leave the register and the selection clears;
//                  closure + the refreshed list is the confirmation (D21).
//   any rejected → the generic could-not-delete notice, naming no campaign,
//                  while the deletes that DID succeed stay deleted. The
//                  selection is NOT cleared, so the user can see what is left.
//
// Nothing is pre-checked: there is no in-use guard on the server (a campaign
// tagged on stock deletes just the same), so the client has nothing to mirror
// and every selected id is submitted (ui-standards validation.md § actions).

export interface DeleteCampaignsActionProps {
  /** The currently-selected campaign ids. */
  selectedIds: () => string[];
  /** Whether the user holds the central-data edit permission. */
  mayEdit: () => boolean;
  /** Refuse the action up front (the global permission-denied modal). */
  onRefused: () => void;
  /** Every selected campaign was deleted. */
  onDeleted: () => void;
  /** Some were deleted and some refused — re-read, keep the selection. */
  onPartiallyDeleted: () => void;
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
    if (!props.mayEdit()) {
      props.onRefused();
      return;
    }
    setOpen(true);
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
    const report = await runCampaignDeletes(props.selectedIds(), async id => {
      const result = await graphqlFetch(DeleteCampaign, { input: { id } });
      return campaignDeleted(result);
    });
    if (report.failed.length > 0) {
      // Some are gone: the register is re-read so those rows leave, while the
      // notice stays in this dialog and the selection is kept.
      if (report.deleted.length > 0) props.onPartiallyDeleted();
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
      // Blocking while the deletes are in flight.
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
          {/* The generic could-not-delete notice — it names no campaign,
              which is the shape the absent bulk operation forces. */}
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
