import {
  createMemo,
  createSignal,
  Match,
  Show,
  Switch,
  type JSX,
} from 'solid-js';
import { reportPermissionDenied } from '@/api/graphql';
import { t } from '@/intl';
import { Dialog } from '@/ui/elements/feedback/Dialog';
import { ConfirmDialog } from '@/ui/elements/feedback/ConfirmDialog';
import { Alert } from '@/ui/elements/feedback/Alert';
import { ErrorDetails } from '@/ui/elements/feedback/ErrorDetails';
import { Spinner } from '@/ui/elements/feedback/Spinner';
import {
  CancelButton,
  DialogSaveButton,
} from '@/ui/elements/buttons/StandardButtons';
import { FormErrorSummary } from '@/ui/layout/Form/FormErrorSummary';
import { Stack } from '@/ui/layout/Stack/Stack';
import type { ProgramEnrolment } from '@/plugin-sdk/documents';
import { createDocumentForm } from '@/domain/documentForm/createDocumentForm';
import { DocumentKeptValues } from '@/domain/documentForm/DocumentKeptValues';
import { DocumentVersionNotice } from '@/domain/documentForm/DocumentVersionNotice';
import { DocumentFormRegion } from '@/plugins/DocumentFormRegion';
import {
  documentFormFor,
  documentFormVersioning,
} from '@/plugins/documentFormSlot';
import { pathLabel } from '@/domain/documentForm/draft';
import type { FormRegistryFragment } from '@/domain/documentForm/documentForm.generated';

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
 * The enrolment (spec/program-enrolment ui-surface S3): the document form host
 * over one ProgramEnrolment document, new or saved, in a modal. The body is
 * the plugin form contributed for the enrolment's type, or the host's default
 * enrolment form (DocumentFormRegion; spec/plugins/sdk-contract.md §
 * resolution). Opened from the program picker to enrol, and from a Programs
 * row to edit. Remounts per open, so each open loads afresh.
 *
 * A save over a newer version is refused (rules § editing an enrolment), a
 * Forbidden goes to the permission-denied modal, and any other refusal shows
 * in the dialog with the server's reason behind a disclosure (rules § saving).
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
    onForbidden: reportPermissionDenied,
    refuseNewerVersion: true,
  });
  const archivedVersion = () => {
    const v = form.version();
    return v.kind === 'archived' ? v.version : undefined;
  };

  // On the default form, the answers the program's own form schema requires
  // that the enrolment doesn't hold and the default form doesn't ask for
  // (rules § the default form): with any, the enrolment can't be saved here,
  // so it says so and offers no Save. Read against the draft, tracked: an
  // enrolment saved elsewhere with those answers opens without the notice,
  // and the default form can't change them, so the answer moves only when
  // the draft is seeded.
  const unasked = createMemo((): string[] => {
    const r = form.registry();
    const library = form.library();
    if (!r || !library || form.status() !== 'ready') return [];
    if (form.version().kind !== 'current') return [];
    if (documentFormFor('programEnrolment.form', r.documentType).occupant) {
      return [];
    }
    return library.unaskedEnrolmentAnswers(r, form.draft.data);
  });

  const [confirmDiscard, setConfirmDiscard] = createSignal(false);
  // Nothing closes the enrolment while a save is under way: it would go on
  // saving behind the closed dialog (ui-surface S3 › Saving).
  const close = () => {
    if (form.saving()) return;
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
        // Above the actions rule, the buttons staying at the inline end
        // (ui-standards › dialogs § chrome).
        footer={
          <Switch>
            <Match when={form.newerVersion()}>
              <Alert severity="warning" testId="enrolment-newer-version">
                {t('messages.enrolment-changed-since-opened')}
              </Alert>
            </Match>
            <Match when={form.saveError()}>
              {reason => (
                <Alert severity="error" testId="enrolment-save-error">
                  {t('error.failed-to-save-program-enrolment')}
                  <ErrorDetails detail={reason()} />
                </Alert>
              )}
            </Match>
          </Switch>
        }
        actions={
          <>
            {/* Hidden while a save is in flight, back once it resolves
                (controls › dialog chrome). */}
            <Show when={!form.saving()}>
              <CancelButton
                data-testid="dialog-button-cancel"
                onClick={close}
              />
            </Show>
            {/* No Save for an enrolment that no longer exists, nor for one
                the default form can't complete: neither could ever be saved
                from here (controls § blocked affordances). */}
            <Show
              when={form.status() !== 'not-found' && unasked().length === 0}
            >
              <DialogSaveButton
                data-testid="dialog-button-save"
                loading={form.saving()}
                disabled={form.status() !== 'ready' || !form.canSave()}
                onClick={() => void save()}
              />
            </Show>
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
                  <Show when={unasked().length > 0}>
                    <Alert severity="warning" testId="enrolment-form-missing">
                      {t('messages.enrolment-form-not-installed', {
                        fields: unasked().map(pathLabel).join(', '),
                      })}
                    </Alert>
                  </Show>
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
                  {/* With the not-installed notice up there's no Save to
                      correct anything for: the notice says it all. */}
                  <Show when={unasked().length === 0}>
                    <FormErrorSummary
                      errors={form.validation.visible()}
                      testId="enrolment-error-summary"
                    />
                  </Show>
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
