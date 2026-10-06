import { Match, Show, Switch, type Component } from 'solid-js';
import { t } from '../../../intl';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { FormErrorSummary } from '../../../ui/layout/Form/FormErrorSummary';
import { Stack } from '../../../ui/layout/Stack/Stack';
import { DocumentKeptValues } from '../../../domain/documentForm/DocumentKeptValues';
import { DocumentVersionNotice } from '../../../domain/documentForm/DocumentVersionNotice';
import { DocumentFormRegion } from '../../../plugins/DocumentFormRegion';
import { PatientDetailsForm } from './PatientDetailsForm';
import type { PatientDetails } from './patientDetails';

export interface PatientDetailsBodyProps {
  storeId: string;
  patientId: string;
  details: PatientDetails;
  /** The error summary's test id, which names the surface it is on. */
  errorSummaryTestId: string;
}

/*
 * A patient's details form on whichever path the store is on
 * (patientDetails.ts): the built-in form over the patient record, or the
 * patient form a plugin contributes for the store's patient document type,
 * else the host's default patient form on the document. A spinner until the
 * registry is answered and, on the document path, until the document and the
 * form library are in; a document that is not there says so.
 */
export const PatientDetailsBody: Component<PatientDetailsBodyProps> = props => {
  const form = () => props.details.documentEditor.form;
  const archivedVersion = () => {
    const v = form().version();
    return v.kind === 'archived' ? v.version : undefined;
  };

  return (
    <>
      <Show when={props.details.active().saveError()}>
        <Alert severity="error">{props.details.active().saveError()}</Alert>
      </Show>
      <Switch fallback={<Spinner center />}>
        <Match
          when={props.details.registry() && !props.details.onDocumentPath()}
        >
          <PatientDetailsForm
            storeId={props.storeId}
            patientId={props.patientId}
            draft={props.details.editor.edit}
            setField={props.details.editor.setField}
            disabled={!props.details.editor.canMutate()}
            errorFor={props.details.editor.validation.errorFor}
          />
          <FormErrorSummary
            errors={props.details.editor.validation.visible()}
            testId={props.errorSummaryTestId}
          />
        </Match>
        {/* A read that fails is reported by the global error modal and stays
            loading behind it (kdd/state-management); a document that does not
            exist, or that the user may not read, is an answer, so it is said
            here rather than left as a spinner. */}
        <Match
          when={
            props.details.onDocumentPath() && form().status() === 'not-found'
          }
        >
          <Alert severity="error">{t('messages.record-not-found')}</Alert>
        </Match>
        <Match when={form().status() === 'ready' && form().library()}>
          {lib => {
            const Default = lib().DefaultPatientForm;
            return (
              <Stack>
                <DocumentVersionNotice
                  version={form().version()}
                  onEdit={form().edit}
                />
                <DocumentFormRegion
                  slot="patient.form"
                  documentType={form().registry()?.documentType ?? ''}
                  draft={form().draft}
                  record={{
                    patientId: props.patientId,
                    documentName: form().document()?.name,
                  }}
                  fallback={() => <Default draft={form().draft} />}
                  archivedVersion={archivedVersion()}
                  currentSchemaId={form().registry()?.formSchemaId}
                />
                <DocumentKeptValues values={form().kept()} />
                <FormErrorSummary
                  errors={form().validation.visible()}
                  testId={props.errorSummaryTestId}
                />
              </Stack>
            );
          }}
        </Match>
      </Switch>
    </>
  );
};
