import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import {
  graphqlFetch,
  isForbidden,
  missingPermissions,
  reportPermissionDenied,
} from '@/api/graphql';
import { rejectionFrom } from '@/api/rejection';
import { t } from '@/intl';
import { Button } from '@/ui/elements/buttons/Button';
import { CancelButton } from '@/ui/elements/buttons/StandardButtons';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ErrorDetails } from '@/ui/elements/feedback/ErrorDetails';
import { TrashIcon } from '@/ui/icons';
import { DeleteRnrForm } from '../../list/rnrForms.generated';
import type { RnrFormNode } from '../rnrFormUpdate';

// The side panel's whole-record delete (spec/rnr-forms/rules.md § deleting;
// ui-surface S3 § side panel; OMS-REG-REPL-07.47): drafts only — disabled once
// finalised — with the program+period confirmation. The action reports via
// onDeleted and the VIEW navigates (the navigation is the confirmation, no
// toast) — the sibling record-delete shape.

type Phase = 'confirm' | 'deleting' | 'error';

export const DeleteRnrFormAction: Component<{
  storeId: string;
  node: RnrFormNode;
  disabled: boolean;
  /** Deletion succeeded — the owning view navigates back to the list. */
  onDeleted: () => void;
}> = props => {
  const [open, setOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<Phase>('confirm');
  // The refusal: the server's own reason where it named one, and the raw text
  // behind a disclosure where it did not.
  const [errorMessage, setErrorMessage] = createSignal<string>();
  const [errorDetail, setErrorDetail] = createSignal<string>();

  const close = () => {
    if (phase() === 'deleting') return;
    setOpen(false);
    setPhase('confirm');
  };

  const run = async () => {
    if (phase() !== 'confirm') return;
    setPhase('deleting');
    const result = await graphqlFetch(
      DeleteRnrForm,
      {
        storeId: props.storeId,
        id: props.node.id,
      },
      // DeleteRnRFormResponse is a single-member union (DeleteResponse), so a
      // refusal — a form finalised since this screen loaded — can only reach us
      // as a top-level GraphQL error. Take it here so it becomes THIS dialog's
      // error phase (D21). Left to the default it tripped the global
      // unexpected-error (reload) modal as well, stacking two surfaces on one
      // refusal — the only record delete that did.
      //
      // The reason is readable: the service maps its refusals through
      // `format!("{error:#?}")` into extensions.details, and all three are unit
      // variants — CannotEditRnRForm, RnRFormDoesNotExist, NotThisStoreRnRForm
      // (server graphql/programs → mutations/rnr_form/delete.rs `map_error`) —
      // so rejectionFrom translates the actual cause instead of "Something went
      // wrong" over a disclosure the user has to open to learn the form was
      // finalised.
      { returnGraphqlErrors: true }
    );
    if (result.kind === 'graphqlError') {
      // Opting in also intercepts Forbidden, which owes the user the global
      // permission-denied modal (D38) — hand it back and close.
      if (isForbidden(result.errors)) {
        reportPermissionDenied(missingPermissions(result.errors));
        setPhase('confirm');
        setOpen(false);
        return;
      }
      const rejection = rejectionFrom(
        result.errors,
        t('messages.cant-delete-this')
      );
      setErrorMessage(rejection.message);
      setErrorDetail(rejection.detail);
      setPhase('error');
      return;
    }
    if (result.kind !== 'success') {
      // A genuine transport failure: the global modal owns the description, so
      // drop back to confirm rather than claiming progress — the same shape as
      // every sibling record delete.
      setPhase('confirm');
      return;
    }
    props.onDeleted();
  };

  return (
    <>
      <Button
        variant="danger"
        icon={<TrashIcon />}
        disabled={props.disabled}
        data-testid="delete-rnr-form-button"
        onClick={() => setOpen(true)}
      >
        {t('label.delete')}
      </Button>
      <Show when={open()}>
        <Dialog
          open
          dismissable={phase() !== 'deleting'}
          onClose={close}
          icon={<TrashIcon />}
          testId="confirmation-modal"
          // The title tracks the phase — a rejection is not a question
          // (kdd/action-modal).
          title={
            phase() === 'error'
              ? t('heading.cannot-do-that')
              : t('heading.are-you-sure')
          }
          description={
            <Show
              when={phase() === 'error'}
              fallback={t('messages.confirm-delete-rnr-form', {
                programName: props.node.programName,
                period: props.node.period.name,
              })}
            >
              <Alert severity="error">
                {errorMessage()}
                <Show when={errorDetail()}>
                  {detail => <ErrorDetails detail={detail()} />}
                </Show>
              </Alert>
            </Show>
          }
          actions={
            <Show
              when={phase() === 'error'}
              fallback={
                <>
                  <Show when={phase() === 'confirm'}>
                    <CancelButton
                      data-testid="dialog-button-cancel"
                      onClick={close}
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
              <Button variant="secondary" confirms="plain" onClick={close}>
                {t('button.close')}
              </Button>
            </Show>
          }
        />
      </Show>
    </>
  );
};
