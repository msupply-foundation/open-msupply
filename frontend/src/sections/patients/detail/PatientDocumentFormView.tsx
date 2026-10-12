import { Show, type Component } from 'solid-js';
import { Spinner } from '../../../ui/elements/feedback/Spinner';
import { FormErrorSummary } from '../../../ui/layout/Form/FormErrorSummary';
import { Stack } from '../../../ui/layout/Stack/Stack';
import type { DocumentForm } from '../../../domain/documentForm/createDocumentForm';
import { DocumentKeptValues } from '../../../domain/documentForm/DocumentKeptValues';
import { DocumentVersionNotice } from '../../../domain/documentForm/DocumentVersionNotice';
import { DocumentFormRegion } from '../../../plugins/DocumentFormRegion';
import type { Patient } from '../../../plugin-sdk/documents';

export interface PatientDocumentFormViewProps {
  patientId: string;
  form: DocumentForm<Patient>;
  /** The error summary's test id, which names the surface it is on. */
  errorSummaryTestId: string;
}

/*
 * A patient document in the store's patient form: the `patient.form` a plugin
 * contributes for the store's patient document type, else the host's default
 * patient form, with the version notice, the values a migration kept and the
 * error summary; a spinner until the form library is in. The Details tab
 * shows a patient's document in it, and the create wizard's last step a new
 * one.
 */
export const PatientDocumentFormView: Component<
  PatientDocumentFormViewProps
> = props => {
  const archivedVersion = () => {
    const v = props.form.version();
    return v.kind === 'archived' ? v.version : undefined;
  };

  return (
    <Show when={props.form.library()} fallback={<Spinner center />}>
      {lib => {
        const Default = lib().DefaultPatientForm;
        return (
          <Stack>
            <DocumentVersionNotice
              version={props.form.version()}
              onEdit={props.form.edit}
            />
            <DocumentFormRegion
              slot="patient.form"
              documentType={props.form.registry()?.documentType ?? ''}
              draft={props.form.draft}
              record={{
                patientId: props.patientId,
                documentName: props.form.document()?.name,
              }}
              fallback={() => <Default draft={props.form.draft} />}
              archivedVersion={archivedVersion()}
              currentSchemaId={props.form.registry()?.formSchemaId}
            />
            <DocumentKeptValues values={props.form.kept()} />
            <FormErrorSummary
              errors={props.form.validation.visible()}
              testId={props.errorSummaryTestId}
            />
          </Stack>
        );
      }}
    </Show>
  );
};
