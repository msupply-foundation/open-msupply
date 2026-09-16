import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { graphqlFetch, reportPermissionDenied } from '@/api/graphql';
import { t, tPlural } from '@/intl';
import { translateServerError } from '@/intl/intlUtils';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { TrashIcon } from '@/ui/icons';
import { DeleteVaccineCourse } from './immunisationPrograms.generated';
import {
  deleteOutcome,
  runDeletes,
  type DeleteCourseOutcome,
} from './courseDelete';

// The course list's one bulk action — spec/immunisation-programs S2 § bulk
// action + S4 (the confirmation) + S5 (the refusal).
//
// Deletion is one mutation per course, run SEQUENTIALLY in list order and
// stopped at the first refusal (rules § deleting courses):
//
//   every course deleted → the dialog closes; closure + the refreshed list
//               is the confirmation.
//   a refusal → the courses before it are gone, it and those after remain;
//               the reason shows in this dialog's could-not-delete phase (the
//               in-use notice, or the server's own text) while the owner
//               re-reads the list behind it. The selection is cleared when the
//               notice is dismissed, not before — clearing earlier would
//               unmount the selection bar this dialog lives in, taking the
//               notice with it.
//
// The server's own no-permission refusal owes the permission-denied modal and
// nothing else; a transport failure has already been surfaced globally and
// whether that delete committed is unknown, so the dialog only releases its
// busy state. Nothing is pre-checked client-side: the in-use guard is the
// server's (ui-standards validation § actions).

export interface DeleteCoursesActionProps {
  /** The selected course ids, in LIST ORDER (the order the run deletes in). */
  orderedIds: () => string[];
  /** The screen's permission gate: true to proceed; otherwise the denial has
   * been reported (the global permission-denied modal). */
  guardEdit: () => boolean;
  /** A run finished — every course, or stopped at a refusal: re-read the
   * list. */
  onRun: () => void;
  /** The dialog closed by any path: the owner clears the selection. */
  onClosed: () => void;
}

type Phase =
  | { kind: 'confirm' }
  | { kind: 'deleting' }
  | {
      kind: 'refused';
      outcome: Exclude<DeleteCourseOutcome, { kind: 'deleted' }>;
    };

export const DeleteCoursesAction: Component<
  DeleteCoursesActionProps
> = props => {
  const [open, setOpen] = createSignal(false);
  // Refused at the click, before the confirmation opens (rules § access).
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
          its ids (e2e/TESTIDS.md). */}
      <Show when={open()}>
        <Body {...props} onClose={() => setOpen(false)} />
      </Show>
    </>
  );
};

const Body = (props: DeleteCoursesActionProps & { onClose: () => void }) => {
  const [phase, setPhase] = createSignal<Phase>({ kind: 'confirm' });
  // Snapshotted on open (Body mounts once per open), so the permanence notice
  // can't shift if the selection changes behind the dialog.
  // eslint-disable-next-line solid/reactivity
  const ids = props.orderedIds();
  const count = ids.length;

  const close = () => {
    props.onClose();
    props.onClosed();
  };

  const deleteOne = async (id: string) =>
    deleteOutcome(
      // returnGraphqlErrors, because the not-found and off-central rejections
      // arrive as top-level errors, and a Forbidden must route to the
      // permission-denied modal rather than the global unexpected-error one.
      await graphqlFetch(
        DeleteVaccineCourse,
        { vaccineCourseId: id },
        { returnGraphqlErrors: true }
      )
    );

  const run = async () => {
    if (phase().kind !== 'confirm') return; // re-entry guard
    setPhase({ kind: 'deleting' });
    const result = await runDeletes(ids, deleteOne);
    // Something may have been deleted whatever happened next: re-read the
    // list so the rows that went are gone (rules § deleting courses).
    if (result.deleted.length > 0 || !result.stoppedAt) props.onRun();
    if (!result.stoppedAt) {
      // Every course deleted: close first (closure is the confirmation), then
      // the owner clears the selection, which unmounts the bar this dialog
      // lives in.
      close();
      return;
    }
    const { outcome } = result.stoppedAt;
    if (outcome.kind === 'forbidden') {
      // The server's own refusal: the permission-denied modal, nothing else.
      reportPermissionDenied(outcome.permissions);
      close();
      return;
    }
    if (outcome.kind === 'failed') {
      // Transport/auth failure — already surfaced globally, and whether that
      // delete committed is unknown. Release the busy state back to the
      // confirmation; the user retries or cancels.
      setPhase({ kind: 'confirm' });
      return;
    }
    setPhase({ kind: 'refused', outcome });
  };

  // The refusal's reason (S5): the in-use notice by name; any other rejection
  // with the server's own text, resolved through the server-error table.
  const refusalMessage = (
    outcome: Exclude<DeleteCourseOutcome, { kind: 'deleted' }>
  ): string =>
    outcome.kind === 'in-use'
      ? t('error.vaccine-course-in-use')
      : outcome.kind === 'rejected'
        ? translateServerError(outcome.serverError)
        : t('messages.cant-delete-generic');

  return (
    <Dialog
      open
      // Blocking while the deletes are in flight.
      dismissable={phase().kind !== 'deleting'}
      onClose={close}
      icon={<TrashIcon />}
      testId="confirmation-modal"
      // The title tracks the phase — a refusal is not a question.
      title={
        phase().kind === 'refused'
          ? t('heading.cannot-do-that')
          : t('heading.are-you-sure')
      }
      description={
        <Show
          when={phase().kind === 'refused' ? phase() : undefined}
          // The permanence notice, count-pluralised (S4).
          fallback={tPlural('messages.confirm-delete-vaccine-courses', count)}
        >
          {refused => {
            const p = refused();
            return (
              <Alert severity="error" testId="vaccine-courses-cant-delete">
                {p.kind === 'refused' ? refusalMessage(p.outcome) : ''}
              </Alert>
            );
          }}
        </Show>
      }
      actions={
        <Show
          when={phase().kind === 'refused'}
          fallback={
            <>
              <Show when={phase().kind === 'confirm'}>
                <CancelButton onClick={close} />
              </Show>
              {/* OK, not Save — the confirming action genuinely isn't a save —
                  carrying the destructive emphasis (S4). */}
              <Button
                variant="danger"
                confirms="plain"
                data-testid="confirmation-modal-ok"
                loading={phase().kind === 'deleting'}
                onClick={() => void run()}
              >
                {t('button.ok')}
              </Button>
            </>
          }
        >
          {/* Nothing to submit or cancel — the refused run already resolved;
              dismissing is what clears the selection. */}
          <Button variant="secondary" confirms="plain" onClick={close}>
            {t('button.close')}
          </Button>
        </Show>
      }
    />
  );
};
