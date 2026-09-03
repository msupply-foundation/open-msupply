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
import { DateField } from '../../../ui/elements/inputs/DateField';
import { localTodayIso } from '../../../ui/elements/inputs/dateTimeConvert';
import { PatientSearch, type PatientOption } from '../../../domain/patient';
import { ProgramNameSelect } from '../../../domain/program';
import { CreatePatientModal } from '../../patients';
import { newPrescriptionRequestDate } from '../detail/prescriptionRequestUpdate';
import { InsertPrescriptionRequest } from './createPrescriptionRequest.generated';

// The create-request dialog (spec/prescription-requests/ui-surface.md S2, AC-C1..
// C3): patient (the one required field — the reusable patient picker), date
// (defaults today, capped at today), and program. Create is unavailable until a
// patient is chosen; a rejection shows in-dialog with entries intact
// (rejections here are all generic — contract § wire traps); success
// navigates to the new request's detail.
//
// There is NO clinician field: a request records only the user who entered it
// (§ who is recorded), and carries no clinician of its own, so there is
// nothing to pick.

export interface CreatePrescriptionRequestModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreatePrescriptionRequestModal: Component<
  CreatePrescriptionRequestModalProps
> = props => {
  const params = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = createSignal<PatientOption | null>(null);
  const [date, setDate] = createSignal<string>(localTodayIso());
  const [programId, setProgramId] = createSignal<string>();
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();
  // The create-patient-on-no-match sub-flow (the patients vertical's create
  // modal over this dialog); on success the new patient is selected here.
  const [createPatientOpen, setCreatePatientOpen] = createSignal(false);

  const reset = () => {
    setPatient(null);
    setDate(localTodayIso());
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
    // Today means "the creation moment" — the field is left out entirely so
    // the server stamps it (see newPrescriptionRequestDate).
    const backdatedTo = newPrescriptionRequestDate(date());
    setBusy(true);
    setError(undefined);
    // Creation rejections are all generic (contract § wire traps), so opt in
    // to the raw GraphQL errors and show them in-dialog rather than tripping
    // the global modal for a user-correctable input.
    const result = await graphqlFetch(
      InsertPrescriptionRequest,
      {
        storeId: params.storeId,
        input: {
          id: generateUUID(),
          patientId: chosen.id,
          ...(programId() ? { programId: programId() } : {}),
          ...(backdatedTo ? { prescriptionDatetime: backdatedTo } : {}),
        },
      },
      { returnGraphqlErrors: true }
    );
    setBusy(false);
    if (result.kind === 'success') {
      const id = result.data.insertPrescriptionRequest.id;
      close();
      navigate(`/${params.storeId}/dispensary/prescription-request/${id}`);
      return;
    }
    setError(
      result.kind === 'graphqlError'
        ? result.message
        : t('error.something-wrong')
    );
  };

  // The patient picker is the dialog's only required field, so it takes
  // initial focus (ui-standards › accessibility › keyboard).
  const patientSearch = createFocusTarget();

  return (
    <Dialog
      open={props.open}
      onClose={close}
      initialFocus={patientSearch}
      title={t('button.new-prescription')}
      testId="create-prescription-request-modal"
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
      <FieldRow label={t('label.program')}>
        <ProgramNameSelect
          label={t('label.program')}
          hideLabel
          testId="program-select"
          value={programId()}
          onChange={id => setProgramId(id ?? undefined)}
        />
      </FieldRow>
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
