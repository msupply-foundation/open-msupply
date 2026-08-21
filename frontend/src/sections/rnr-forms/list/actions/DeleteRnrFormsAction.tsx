import { createSignal, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch } from '@/api/graphql';
import { t, tPlural } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { TrashIcon } from '@/ui/icons';
import { DeleteRnrForm } from '../rnrForms.generated';

// The list's bulk delete (spec/rnr-forms/rules.md § deleting; ui-surface S1;
// OMS-REG-REPL-07.47/.48): drafts only. A selection containing a finalised
// form opens the dialog in a BLOCKED state that explains the rule and calls
// nothing — the affordance stays clickable-and-explaining rather than
// dead-disabled. The server exposes only single-id deletes, so the action
// fires one call per id; the rows leaving the list is the confirmation
// (controls › action feedback — no toast).

export interface DeleteRnrFormsActionProps {
  storeId: string;
  /** The currently-selected form ids. */
  selectedIds: () => string[];
  /**
   * Whether EVERY selected form is a draft. When false, a click opens the
   * blocked explanation instead of a confirmation and nothing is submitted.
   */
  canDelete: () => boolean;
  /** Deletion succeeded — the list clears its selection and re-queries. */
  onDeleted: () => void;
}

type Phase = 'blocked' | 'confirm' | 'deleting' | 'error';

export const DeleteRnrFormsAction: Component<
  DeleteRnrFormsActionProps
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
        {t('button.delete')}
      </Button>
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: DeleteRnrFormsActionProps & { onClose: () => void }) => {
  // Body mounts once per open, so the opening state is snapshotted here: the
  // draft-only verdict picks the initial phase, and the count freezes so the
  // confirm message can't shift if the selection changes behind the dialog.
  const [phase, setPhase] = createSignal<Phase>(
    props.canDelete() ? 'confirm' : 'blocked'
  );
  const count = props.selectedIds().length;

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    for (const id of props.selectedIds()) {
      const result = await graphqlFetch(DeleteRnrForm, {
        storeId: props.storeId,
        id,
      });
      if (result.kind !== 'success') {
        // The global modal owns the description; this dialog just stops
        // claiming progress (a partial delete is visible in the list).
        setPhase('error');
        return;
      }
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
      // The title tracks the phase — neither a blocked selection nor a
      // rejection is a question (kdd/action-modal).
      title={
        phase() === 'blocked' || phase() === 'error'
          ? t('heading.cannot-do-that')
          : t('heading.are-you-sure')
      }
      description={
        <Switch fallback={tPlural('messages.confirm-delete-rnr-forms', count)}>
          <Match when={phase() === 'blocked'}>
            <Alert severity="warning" testId="delete-rnr-forms-blocked">
              {t('messages.cannot-delete-rnr-form')}
            </Alert>
          </Match>
          <Match when={phase() === 'error'}>
            <Alert severity="error">{t('error.something-wrong')}</Alert>
          </Match>
        </Switch>
      }
      actions={
        <Show
          when={phase() === 'blocked' || phase() === 'error'}
          fallback={
            <>
              <Show when={phase() === 'confirm'}>
                <CancelButton
                  data-testid="dialog-button-cancel"
                  onClick={props.onClose}
                />
              </Show>
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
          <Button variant="secondary" confirms="plain" onClick={props.onClose}>
            {t('button.close')}
          </Button>
        </Show>
      }
    />
  );
};
