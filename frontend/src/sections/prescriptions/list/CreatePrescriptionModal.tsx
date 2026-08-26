import { generateUUID } from '../../../uuid';
import { createSignal, Show, type Component } from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { t } from '../../../intl';
import { graphqlFetch } from '../../../api/graphql';
import { Dialog } from '../../../ui/elements/feedback/Dialog';
import { createFocusTarget } from '../../../ui/utils/createFocusTarget';
import { Alert } from '../../../ui/elements/feedback/Alert';
import { Button } from '../../../ui/elements/buttons/Button';
import { FieldRow } from '../../../ui/elements/inputs/FieldRow';
import { TextField } from '../../../ui/elements/inputs/TextField';
import { DateField } from '../../../ui/elements/inputs/DateField';
import { localTodayIso } from '../../../ui/elements/inputs/dateTimeConvert';
import { PatientSearch, type PatientOption } from '../../../domain/patient';
import { ClinicianSelect } from '../../../domain/clinician';
import { ProgramNameSelect } from '../../../domain/program';
import { CreatePatientModal } from '../../patients';
import { newPrescriptionDate } from '../detail/prescriptionUpdate';
import { InsertPrescription } from './createPrescription.generated';

// The create-prescription modal (spec/prescriptions/ui-surface.md S2, FL2):
// patient (the one required field — the reusable patient picker), date
// (defaults today, capped at today — AC-B5), reference, clinician (offered
// options only — the server never validates it at creation, AC-C3), and
// program. Create is disabled until a patient is chosen; a failure shows
// in-dialog with input preserved (controls › dialogs); success navigates to
// the new prescription's detail.

export interface CreatePrescriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreatePrescriptionModal: Component<
  CreatePrescriptionModalProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = createSignal<PatientOption | null>(null);
  const [date, setDate] = createSignal<string>(localTodayIso());
  const [reference, setReference] = createSignal('');
  const [clinicianId, setClinicianId] = createSignal<string>();
  const [programId, setProgramId] = createSignal<string>();
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();
  // The create-patient-on-no-match sub-flow (AC-C5): opens the patients
  // vertical's create modal over this dialog; on success the new patient is
  // selected here (modal-in-place — D54).
  const [createPatientOpen, setCreatePatientOpen] = createSignal(false);

  const reset = () => {
    setPatient(null);
    setDate(localTodayIso());
    setReference('');
    setClinicianId(undefined);
    setProgramId(undefined);
    setError(undefined);
  };
  const close = () => {
    reset();
    props.onClose();
  };

  const create = async () => {
    const chosen = patient();
    if (!chosen || busy()) return;
    // The date only rides along when it BACKDATES — today means "not
    // backdated", so the field is left out entirely (see newPrescriptionDate).
    const backdatedTo = newPrescriptionDate(date());
    setBusy(true);
    setError(undefined);
    // Creation rejections are ALL non-typed (contract § creation), so opt in
    // to the raw GraphQL errors and show them in-dialog rather than tripping
    // the global modal for a user-correctable input.
    const result = await graphqlFetch(
      InsertPrescription,
      {
        storeId: params.storeId,
        input: {
          id: generateUUID(),
          patientId: chosen.id,
          ...(reference().trim() ? { theirReference: reference().trim() } : {}),
          ...(clinicianId() ? { clinicianId: clinicianId() } : {}),
          ...(programId() ? { programId: programId() } : {}),
          ...(backdatedTo ? { prescriptionDate: backdatedTo } : {}),
        },
      },
      { returnGraphqlErrors: true }
    );
    setBusy(false);
    if (result.kind === 'success') {
      const id = result.data.insertPrescription.id;
      close();
      navigate(`/${params.storeId}/dispensary/prescription/${id}`);
      return;
    }
    setError(
      result.kind === 'graphqlError'
        ? result.message
        : t('error.something-wrong')
    );
  };

  // The patient picker is the dialog's only required field, so it takes
  // initial focus (spec/prescriptions S2; ui-standards › accessibility ›
  // keyboard).
  const patientSearch = createFocusTarget();

  return (
    <Dialog
      open={props.open}
      onClose={close}
      initialFocus={patientSearch}
      title={t('label.create-prescription')}
      testId="create-prescription-modal"
      actionsLead={
        <Show when={error()}>
          <Alert severity="error">{error()}</Alert>
        </Show>
      }
      actions={
        <>
          <Button
            variant="secondary"
            confirms="cancel"
            data-testid="dialog-button-cancel"
            onClick={close}
          >
            {t('button.cancel')}
          </Button>
          <Button
            confirms="plain"
            data-testid="dialog-button-ok"
            disabled={!patient()}
            loading={busy()}
            onClick={() => void create()}
          >
            {t('label.create')}
          </Button>
        </>
      }
    >
      <FieldRow label={t('label.patient')}>
        <PatientSearch
          label={t('label.patient')}
          hideLabel
          storeId={params.storeId}
          selected={patient() ?? undefined}
          focusTarget={patientSearch}
          onSelect={setPatient}
          onCreatePatient={() => setCreatePatientOpen(true)}
        />
      </FieldRow>
      <FieldRow label={t('label.date')}>
        <DateField
          label={t('label.date')}
          hideLabel
          testId="date-field"
          value={date()}
          max={localTodayIso()}
          onChange={value => setDate(value ?? localTodayIso())}
        />
      </FieldRow>
      <FieldRow label={t('label.reference')}>
        <TextField
          label={t('label.reference')}
          hideLabel
          data-testid="customer-reference-field"
          value={reference()}
          onInput={e => setReference(e.currentTarget.value)}
        />
      </FieldRow>
      <FieldRow label={t('label.clinician')}>
        <ClinicianSelect
          label={t('label.clinician')}
          hideLabel
          inputTestId="clinician-select"
          value={clinicianId()}
          // The create-clinician side flow (S8): the picker owns it, and a
          // clinician created here comes back selected.
          allowCreate
          storeId={params.storeId}
          onChange={clinician => setClinicianId(clinician?.id)}
        />
      </FieldRow>
      <FieldRow label={t('label.program')}>
        <ProgramNameSelect
          label={t('label.program')}
          hideLabel
          testId="program-select"
          value={programId()}
          onChange={id => setProgramId(id ?? undefined)}
        />
      </FieldRow>
      {/* Create-patient-on-no-match (AC-C5, D54): modal-in-place over this
          dialog; on success the new patient is selected here. */}
      <CreatePatientModal
        open={createPatientOpen()}
        storeId={params.storeId}
        onClose={() => setCreatePatientOpen(false)}
        onCreated={created => {
          setPatient(created);
          setCreatePatientOpen(false);
        }}
      />
    </Dialog>
  );
};
