import { createSignal, Match, Show, Switch, type Component } from 'solid-js';
import { t, tPlural } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Button } from '../../../../ui/elements/buttons/Button';
import { CancelButton } from '../../../../ui/elements/buttons/StandardButtons';
import { InfoIcon, TrashIcon } from '../../../../ui/icons';
import { deleteReturn } from '../../detail/returnUpdate';

export interface DeleteReturnsActionProps {
  storeId: string;
  /** The selected rows' id + status (the pre-check needs the status). */
  selectedRows: () => { id: string; status: string }[];
  /** Deletion succeeded — clear the selection and re-query. */
  onDeleted: () => void;
}

// The returns-list bulk delete (spec/customer-returns, the delete flow —
// OMS-REG-DIST-07.40/.41) — the
// outbound DeleteShipmentsAction shape: the whole batch is refused when ANY
// selected return is not deletable (only NEW is — OMS-REG-DIST-07.41) — a UI
// pre-check with a blocking notice instead of the confirmation, no server call;
// per-row enforcement remains server-side. There is NO batch mutation for
// customer returns, so a confirmed batch runs one deleteCustomerReturn per id;
// the pre-check means those should all succeed — any server rejection (a status
// changed under a stale list) still lands in the error phase as a backstop. A
// clean sweep closes silently (closure is the confirmation — ui-standards
// controls.md § dialogs). The hand-back to the list (clear selection +
// re-query) is DEFERRED to the dialog's close: clearing the selection collapses
// the selection-gated footer this dialog lives in, so calling it mid-flow
// unmounts the dialog before the error phase can show.
type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteReturnsAction: Component<
  DeleteReturnsActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  const [blockedOpen, setBlockedOpen] = createSignal(false);

  const onClick = () => {
    // Pre-check: every selected return must be deletable (NEW only) or the
    // whole batch is refused with an explanatory notice in place of the
    // confirmation (the current app's client-side gate; OMS-REG-DIST-07.41's
    // UI half).
    if (props.selectedRows().some(row => row.status !== 'NEW')) {
      setBlockedOpen(true);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {/* Destructive tone (ui-standards: delete = danger), matching the
          reference vertical's bulk delete and the confirm below. */}
      <Button
        variant="danger"
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
          // A refusal is not a question (kdd/action-modal).
          title={t('heading.cannot-do-that')}
          description={
            <Alert severity="error">{t('messages.cant-delete-generic')}</Alert>
          }
          // The standard, icon-less acknowledgement (D55) — nothing was
          // deleted, so this is acknowledged, not confirmed.
          actions={
            <Button
              variant="secondary"
              confirms="plain"
              data-testid="dialog-button-ok"
              onClick={() => setBlockedOpen(false)}
            >
              {t('button.close')}
            </Button>
          }
        />
      </Show>
    </>
  );
};

const Body = (props: DeleteReturnsActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>('confirm');
  // Whether any row deleted — the deferred hand-back needs it (see finish), and
  // the report's own title reads it, so it is a signal.
  const [didDelete, setDidDelete] = createSignal(false);
  // Snapshotted on open so the message can't shift behind the dialog.
  const count = props.selectedRows().length;

  // Every close path: dismiss the dialog FIRST, then hand back to the list —
  // onDeleted clears the selection, which unmounts this dialog's footer host.
  const finish = () => {
    props.onClose();
    if (didDelete()) props.onDeleted();
  };

  const run = async () => {
    if (phase() !== 'confirm') return; // re-entry guard
    setPhase('deleting');
    let failed = 0;
    // Sequential, one per id — keeps the outcome per row unambiguous.
    for (const row of props.selectedRows()) {
      const result = await deleteReturn(props.storeId, row.id);
      if (result.kind === 'deleted') setDidDelete(true);
      else if (result.kind === 'forbidden') {
        // A standing permission block — the global permission-denied modal is
        // already showing (D38) and every remaining row would fail the same
        // way. Commit any rows deleted before it and close this dialog rather
        // than stacking the generic "couldn't delete" notice on top.
        finish();
        return;
      } else failed += 1;
    }
    if (failed > 0) {
      setPhase('error');
      return;
    }
    // Clean sweep: closure is the confirmation — no announcement.
    finish();
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'deleting'}
      onClose={finish}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      // The title tracks the phase — a rejection is not a question
      // (kdd/action-modal). There is no batch mutation for returns, so these
      // are N independent deletes: when some rows DID go, "Can't do that!"
      // would sit over an outcome that partly succeeded.
      title={
        phase() !== 'error'
          ? t('heading.are-you-sure')
          : didDelete()
            ? t('heading.some-not-deleted')
            : t('heading.cannot-do-that')
      }
      description={
        <Switch fallback={tPlural('messages.confirm-delete-returns', count)}>
          <Match when={phase() === 'error'}>
            <Show when={didDelete()}>
              <p>{t('messages.deleted-returns-before-this')}</p>
            </Show>
            <Alert severity="error">{t('messages.cant-delete-generic')}</Alert>
          </Match>
        </Switch>
      }
      // Dialog-footer identity (D55): icon-less throughout, Cancel secondary,
      // and the destructive confirm in the danger tone — a confirmation is
      // never a pair of equal-weight buttons.
      actions={
        <Switch
          fallback={
            <>
              <Show when={phase() === 'confirm'}>
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={finish}
                />
              </Show>
              <Button
                variant="danger"
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
          <Match when={phase() === 'error'}>
            <Button
              variant="secondary"
              confirms="plain"
              data-testid="dialog-button-ok"
              onClick={finish}
            >
              {t('button.close')}
            </Button>
          </Match>
        </Switch>
      }
    />
  );
};
