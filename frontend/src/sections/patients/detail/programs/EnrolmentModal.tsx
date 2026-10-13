import {
  createMemo,
  createSignal,
  Match,
  Show,
  Switch,
  type JSX,
} from 'solid-js';
import { t } from '../../../../intl';
import { Dialog } from '../../../../ui/elements/feedback/Dialog';
import { ConfirmDialog } from '../../../../ui/elements/feedback/ConfirmDialog';
import { Alert } from '../../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../../ui/elements/feedback/Spinner';
import { Button } from '../../../../ui/elements/buttons/Button';
import { SaveIcon, XCircleIcon } from '../../../../ui/icons';
import { FormErrorSummary } from '../../../../ui/layout/Form/FormErrorSummary';
import { Stack } from '../../../../ui/layout/Stack/Stack';
import type { ProgramEnrolment } from '../../../../plugin-sdk/documents';
import { createDocumentForm } from '../../../../domain/documentForm/createDocumentForm';
import { DocumentKeptValues } from '../../../../domain/documentForm/DocumentKeptValues';
import { DocumentVersionNotice } from '../../../../domain/documentForm/DocumentVersionNotice';
import { DocumentFormRegion } from '../../../../plugins/DocumentFormRegion';
import { documentFormVersioning } from '../../../../plugins/documentFormSlot';
import type { FormRegistryFragment } from '../../../../domain/documentForm/documentForm.generated';

/** What the modal opens: a program to enrol in, or a saved enrolment. */
export type EnrolmentTarget =
  | { kind: 'new'; registry: FormRegistryFragment }
  | { kind: 'existing'; documentName: string };

export interface EnrolmentModalProps {
  storeId: string;
  patientId: string;
  /** Undefined while closed. */
  target: EnrolmentTarget | undefined;
  onClose: () => void;
  /** After a save, so the caller can refresh its enrolment list. */
  onSaved: () => void;
}

/*
 * The enrolment form in a modal (kdd/custom-forms/specs.md § Forms in the UI:
 * the modal mount point): the document form host over one ProgramEnrolment
 * document, new or saved. The body is the plugin form contributed for the
 * enrolment's type, or the host's default enrolment form (DocumentFormRegion).
 * Opened from the program picker to enrol, and from a Programs row to edit.
 * Remounts per open, so each open loads afresh.
 */
export const EnrolmentModal = (props: EnrolmentModalProps): JSX.Element => (
  <Show when={props.target} keyed>
    {target => (
      <EnrolmentModalBody
        storeId={props.storeId}
        patientId={props.patientId}
        target={target}
        onClose={props.onClose}
        onSaved={props.onSaved}
      />
    )}
  </Show>
);

interface BodyProps extends Omit<EnrolmentModalProps, 'target'> {
  target: EnrolmentTarget;
}

const EnrolmentModalBody = (props: BodyProps): JSX.Element => {
  // The seed of a new enrolment, fixed at open: enrolled now, at this store.
  // Everything else is the form's to fill in. The modal remounts per target,
  // so this runs once per open.
  const source = createMemo(() => {
    const target = props.target;
    return target.kind === 'new'
      ? {
          kind: 'new' as const,
          registry: target.registry,
          data: {
            enrolmentDatetime: new Date().toISOString(),
            storeId: props.storeId,
          },
        }
      : { kind: 'existing' as const, name: target.documentName };
  });

  const form = createDocumentForm<ProgramEnrolment>({
    storeId: () => props.storeId,
    patientId: () => props.patientId,
    source,
    versioning: type => documentFormVersioning('programEnrolment.form', type),
  });
  const archivedVersion = () => {
    const v = form.version();
    return v.kind === 'archived' ? v.version : undefined;
  };

  const [confirmDiscard, setConfirmDiscard] = createSignal(false);
  const close = () => {
    if (form.isDirty()) setConfirmDiscard(true);
    else props.onClose();
  };

  const save = async () => {
    const saved = await form.save();
    if (!saved) return;
    props.onSaved();
    props.onClose();
  };

  const title = () => {
    const r = form.registry();
    return r ? (r.name ?? r.documentType) : t('label.program-enrolment');
  };

  return (
    <>
      <Dialog
        open
        width="form"
        dismissable={!form.saving()}
        onClose={close}
        title={title()}
        testId="enrolment-modal"
        actionsLead={
          <Show when={form.saveError()}>
            <Alert severity="error">{form.saveError()}</Alert>
          </Show>
        }
        actions={
          <>
            <Button
              variant="secondary"
              icon={<XCircleIcon />}
              confirms="cancel"
              onClick={close}
            >
              {t('button.cancel')}
            </Button>
            <Button
              icon={<SaveIcon />}
              confirms="plain"
              data-testid="dialog-button-ok"
              loading={form.saving()}
              disabled={form.status() !== 'ready' || !form.canSave()}
              onClick={() => void save()}
            >
              {t('button.save')}
            </Button>
          </>
        }
      >
        <Switch>
          <Match when={form.status() === 'not-found'}>
            <Alert severity="error">{t('messages.record-not-found')}</Alert>
          </Match>
          <Match when={form.status() === 'ready' && form.library()}>
            {lib => {
              const Default = lib().DefaultEnrolmentForm;
              return (
                <Stack>
                  <DocumentVersionNotice
                    version={form.version()}
                    onEdit={form.edit}
                  />
                  <DocumentFormRegion
                    slot="programEnrolment.form"
                    documentType={form.registry()?.documentType ?? ''}
                    draft={form.draft}
                    record={{
                      patientId: props.patientId,
                      documentName: form.document()?.name,
                    }}
                    fallback={() => <Default draft={form.draft} />}
                    archivedVersion={archivedVersion()}
                    currentSchemaId={form.registry()?.formSchemaId}
                  />
                  <DocumentKeptValues values={form.kept()} />
                  <FormErrorSummary
                    errors={form.validation.visible()}
                    testId="enrolment-error-summary"
                  />
                </Stack>
              );
            }}
          </Match>
          <Match when={true}>
            <Spinner center />
          </Match>
        </Switch>
      </Dialog>
      <ConfirmDialog
        open={confirmDiscard()}
        title={t('heading.are-you-sure')}
        message={t('messages.discard-changes')}
        confirmLabel={t('button.discard')}
        onConfirm={() => {
          setConfirmDiscard(false);
          props.onClose();
        }}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
};
