import { createSignal, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { t, tPlural } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ErrorDetails } from '@/ui/elements/feedback/ErrorDetails';
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
  // The server's own text, behind a disclosure — a refusal arrives untyped.
  const [errorDetail, setErrorDetail] = createSignal<string>();
  const count = props.selectedIds().length;
  // Whether any form went before a refusal stopped the loop — the report must
  // not claim nothing happened, and the list must re-read either way. A signal,
  // because the report's own title reads it.
  const [didDelete, setDidDelete] = createSignal(false);

  // Every close path: dismiss FIRST, then hand back — onDeleted clears the
  // selection, which unmounts the selection-gated footer this dialog lives in.
  const finish = () => {
    props.onClose();
    if (didDelete()) props.onDeleted();
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    for (const id of props.selectedIds()) {
      const result = await graphqlFetch(
        DeleteRnrForm,
        {
          storeId: props.storeId,
          id,
        },
        // DeleteRnRFormResponse is a single-member union (DeleteResponse), so a
        // refusal — a form finalised since this list loaded — can only reach us
        // as a top-level GraphQL error. Take it here so it becomes THIS
        // dialog's error phase (D21); left to the default it also tripped the
        // global unexpected-error (reload) modal, stacking two surfaces on one
        // refusal (the fix already applied to the detail twin).
        { returnGraphqlErrors: true }
      );
      if (result.kind === 'graphqlError') {
        // Opting in also intercepts Forbidden, which owes the user the global
        // permission-denied modal (D38) — every remaining form would fail the
        // same way, so commit what went and close rather than stacking a
        // second surface under it.
        if (isForbidden(result.errors)) {
          reportPermissionDenied(missingPermissions(result.errors));
          finish();
          return;
        }
        setErrorDetail(result.message);
        setPhase('error');
        return;
      }
      if (result.kind !== 'success') {
        // A genuine transport failure, which raised the global modal on its
        // own — `returnGraphqlErrors` covers GraphQL errors, not this. While
        // nothing has gone that modal is the whole story, so drop back to
        // confirm rather than stacking a second notice under it (the detail
        // twin's shape). Once forms HAVE gone the report must say so, and
        // finish() has to re-query a list that is now stale.
        setPhase(didDelete() ? 'error' : 'confirm');
        return;
      }
      setDidDelete(true);
    }
    finish();
  };

  return (
    <Dialog
      open
      dismissable={phase() !== 'deleting'}
      onClose={finish}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      // The title tracks the phase — neither a blocked selection nor a
      // rejection is a question (kdd/action-modal). These are N independent
      // deletes, so a refusal partway leaves the earlier forms deleted; the
      // report says so rather than claiming nothing was.
      title={
        phase() === 'blocked'
          ? t('heading.cannot-do-that')
          : phase() !== 'error'
            ? t('heading.are-you-sure')
            : didDelete()
              ? t('heading.some-not-deleted')
              : t('heading.cannot-do-that')
      }
      description={
        <Switch fallback={tPlural('messages.confirm-delete-rnr-forms', count)}>
          <Match when={phase() === 'blocked'}>
            <Alert severity="warning" testId="delete-rnr-forms-blocked">
              {t('messages.cannot-delete-rnr-form')}
            </Alert>
          </Match>
          <Match when={phase() === 'error'}>
            <Show when={didDelete()}>
              <p>{t('messages.deleted-rnr-forms-before-this')}</p>
            </Show>
            <Alert severity="error">
              {t('error.something-wrong')}
              <Show when={errorDetail()}>
                {detail => <ErrorDetails detail={detail()} />}
              </Show>
            </Alert>
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
          {/* Dismissal ends the interaction — finish hands back to the list so
              anything already deleted leaves it. */}
          <Button variant="secondary" confirms="plain" onClick={finish}>
            {t('button.close')}
          </Button>
        </Show>
      }
    />
  );
};
