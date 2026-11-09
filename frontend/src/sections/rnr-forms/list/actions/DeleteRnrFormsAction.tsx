import { createSignal, For, Match, Show, Switch } from 'solid-js';
import type { Component } from 'solid-js';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { rejectionFrom, type Rejection } from '@/api/rejection';
import { t, tPlural } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ErrorDetails } from '@/ui/elements/feedback/ErrorDetails';
import { Stack } from '@/ui/layout/Stack/Stack';
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
  // Each refused form's reason. Deduplicated for the report: N forms refused
  // for the same cause is one notice, not N identical ones.
  const [failures, setFailures] = createSignal<Rejection[]>([]);
  const count = props.selectedIds().length;
  // How many forms went — the deferred hand-back needs it, and the report both
  // counts them and titles itself from it.
  const [deletedCount, setDeletedCount] = createSignal(0);

  const reasons = () => {
    const seen = new Set<string>();
    return failures().filter(f => {
      if (seen.has(f.message)) return false;
      seen.add(f.message);
      return true;
    });
  };

  // Every close path: dismiss FIRST, then hand back — onDeleted clears the
  // selection, which unmounts the selection-gated footer this dialog lives in.
  const finish = () => {
    props.onClose();
    if (deletedCount() > 0) props.onDeleted();
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    const failed: Rejection[] = [];
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
        //
        // The reason is readable: the service maps its refusals through
        // `format!("{error:#?}")` into extensions.details, and all three are
        // unit variants — CannotEditRnRForm, RnRFormDoesNotExist,
        // NotThisStoreRnRForm (server graphql/programs →
        // mutations/rnr_form/delete.rs `map_error`) — so rejectionFrom names
        // the actual cause. Worth more here than on the detail twin: the form
        // that refused is one of a selection, and "this form is finalised" is
        // the only thing that identifies which.
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
        // A per-form refusal stops that form, not the batch: these are N
        // independent deletes, so the ones that CAN go, go, and every distinct
        // reason is reported at the end (the returns lists' shape).
        failed.push(
          rejectionFrom(result.errors, t('messages.cant-delete-this'))
        );
        continue;
      }
      if (result.kind !== 'success') {
        // A transport failure is NOT a per-form verdict — the request itself
        // failed, and `returnGraphqlErrors` does not cover it — so unlike a
        // refusal it STOPS the batch: the global modal already owns the
        // description, and every remaining call would most likely fail the same
        // way, raising one more modal each. Same split as the returns lists.
        //
        // Nothing at all has happened yet ⇒ that modal is the whole story, so
        // drop back to confirm rather than stacking a second notice under it.
        // Otherwise fall out of the loop: any refusals collected so far are
        // reported below, and failing that the dialog closes and finish()
        // re-queries a list that is now stale.
        if (deletedCount() === 0 && failed.length === 0) {
          setPhase('confirm');
          return;
        }
        break;
      }
      setDeletedCount(n => n + 1);
    }
    if (failed.length > 0) {
      setFailures(failed);
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
      // The title tracks the phase — neither a blocked selection nor a
      // rejection is a question (kdd/action-modal). These are N independent
      // deletes, so a refusal partway leaves the earlier forms deleted; the
      // report says so rather than claiming nothing was.
      title={
        phase() === 'blocked'
          ? t('heading.cannot-do-that')
          : phase() !== 'error'
            ? t('heading.are-you-sure')
            : deletedCount() > 0
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
            <Stack gap="sm">
              <Show when={deletedCount() > 0}>
                <p>{tPlural('messages.deleted-rnr-form', deletedCount())}</p>
              </Show>
              {/* One notice per distinct reason, so the user reads what the
                  server actually said rather than a blanket refusal. */}
              <For each={reasons()}>
                {reason => (
                  <Alert severity="error" testId="rnr-form-delete-refused">
                    {reason.message}
                    <Show when={reason.detail}>
                      {detail => <ErrorDetails detail={detail()} />}
                    </Show>
                  </Alert>
                )}
              </For>
            </Stack>
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
